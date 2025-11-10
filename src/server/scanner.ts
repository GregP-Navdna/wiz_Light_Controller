/**
 * WIZ device scanner - discovers devices on local network
 * Uses multiple heuristics: ARP table, port probe, MAC OUI lookup
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import oui from 'oui';
import { WizClient } from './wiz-client.js';
import { WizDevice, ConfidenceLevel, ScanProgress } from '../shared/types.js';
import {
  enumerateHosts,
  autoDetectSubnet,
  parseCIDR,
} from './utils/network.js';

const execAsync = promisify(exec);

export interface ScanOptions {
  subnet?: string;
  concurrency?: number;
  timeout?: number;
}

export interface ARPEntry {
  ip: string;
  mac: string;
  type: string;
}

export class NetworkScanner {
  private wizClient: WizClient;
  private scanInProgress = false;
  private devices = new Map<string, WizDevice>();
  private progressCallback?: (progress: ScanProgress) => void;
  private db?: any; // DeviceDatabase instance (optional to avoid circular dependency)

  constructor(db?: any) {
    this.wizClient = new WizClient();
    this.db = db;
    
    // Load devices from database on startup
    if (this.db) {
      this.loadDevicesFromDatabase();
    }
  }
  
  /**
   * Load devices from database into memory
   */
  private loadDevicesFromDatabase(): void {
    try {
      const dbDevices = this.db.getAllDevices();
      dbDevices.forEach((device: WizDevice) => {
        this.devices.set(device.id, device);
      });
      console.log(`Loaded ${dbDevices.length} devices from database`);
    } catch (error) {
      console.error('Error loading devices from database:', error);
    }
  }

  /**
   * Set callback for scan progress updates
   */
  onProgress(callback: (progress: ScanProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Get all discovered devices
   */
  getDevices(): WizDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get a specific device by ID
   */
  getDevice(id: string): WizDevice | undefined {
    return this.devices.get(id);
  }

  /**
   * Update device state
   */
  updateDevice(id: string, updates: Partial<WizDevice>): void {
    const device = this.devices.get(id);
    if (device) {
      Object.assign(device, updates);
      device.lastSeen = Date.now();
    }
  }

  /**
   * Remove stale devices (not seen in last 5 minutes)
   */
  removeStaleDevices(): string[] {
    const staleThreshold = Date.now() - 5 * 60 * 1000;
    const removed: string[] = [];

    for (const [id, device] of this.devices.entries()) {
      if (device.lastSeen < staleThreshold) {
        this.devices.delete(id);
        removed.push(id);
      }
    }

    return removed;
  }

  /**
   * Read ARP table to get MAC addresses for IPs
   */
  private async getARPTable(): Promise<Map<string, ARPEntry>> {
    const arpMap = new Map<string, ARPEntry>();

    try {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'arp -a' : 'arp -n';

      const { stdout } = await execAsync(command);

      // Parse ARP table output
      const lines = stdout.split('\n');

      for (const line of lines) {
        const match = isWindows
          ? line.match(/(\d+\.\d+\.\d+\.\d+)\s+([\da-f-]+)\s+(\w+)/i)
          : line.match(/(\d+\.\d+\.\d+\.\d+)\s+\w+\s+([\da-f:]+)/i);

        if (match) {
          const ip = match[1];
          let mac = match[2].toLowerCase();

          // Normalize MAC address format
          if (isWindows) {
            mac = mac.replace(/-/g, ':');
          }

          // Ensure MAC has leading zeros
          mac = mac
            .split(':')
            .map((part) => part.padStart(2, '0'))
            .join(':');

          arpMap.set(ip, {
            ip,
            mac,
            type: isWindows ? match[3] : 'dynamic',
          });
        }
      }
    } catch (error) {
      console.warn('Failed to read ARP table:', error);
    }

    return arpMap;
  }

  /**
   * Check if MAC address belongs to WIZ/Espressif (ESP chip used in WIZ bulbs)
   */
  private checkMACVendor(mac: string): {
    isWiz: boolean;
    vendor?: string;
  } {
    try {
      const vendor = oui(mac);

      if (!vendor) {
        return { isWiz: false };
      }

      const vendorLower = vendor.toLowerCase();

      // WIZ bulbs typically use Espressif chips
      // Also check for variations of WIZ company names
      const wizVendors = [
        'espressif',
        'wiz',
        'wizconnected',
        'signify',
      ];

      const isWiz = wizVendors.some((v) => vendorLower.includes(v));

      return { isWiz, vendor };
    } catch (error) {
      return { isWiz: false };
    }
  }

  /**
   * Probe a single host to check if it's a WIZ device
   */
  private async probeHost(
    ip: string,
    arpEntry?: ARPEntry,
    timeout?: number
  ): Promise<WizDevice | null> {
    try {
      // Try to probe the device
      const response = await this.wizClient.probe(ip, timeout);

      if (!response || !response.result) {
        return null;
      }

      // Get system config for more info
      let sysConfig;
      try {
        sysConfig = await this.wizClient.getSystemConfig(ip);
      } catch (error) {
        // System config is optional, continue without it
        sysConfig = null;
      }

      // Get model config to see device capabilities/features
      try {
        await this.wizClient.getModelConfig(ip);
      } catch (error) {
        // Model config is optional, continue without it
      }

      // Determine MAC address
      let mac = arpEntry?.mac;
      if (!mac && response.result.mac) {
        mac = response.result.mac.toLowerCase();
      }
      if (!mac && sysConfig?.result?.mac) {
        mac = sysConfig.result.mac.toLowerCase();
      }

      // Check vendor confidence
      let confidence: ConfidenceLevel = 'high'; // Successfully responded to WIZ protocol

      const vendorCheck = mac ? this.checkMACVendor(mac) : { isWiz: false };

      if (!vendorCheck.isWiz && mac) {
        confidence = 'medium'; // Responds to protocol but unexpected vendor
      }

      // Create device object
      const device: WizDevice = {
        id: mac || `ip-${ip}`,
        ip,
        mac,
        confidence,
        lastSeen: Date.now(),
        rssi: response.result.rssi,
        state: {
          power: response.result.state ?? false,
          brightness: response.result.dimming,
          colorTemp: response.result.temp,
          sceneId: response.result.sceneId,
        },
      };

      return device;
    } catch (error) {
      // Silently ignore connection errors during scanning
      // These are expected when probing non-WIZ devices
      return null;
    }
  }

  /**
   * Compare two devices and determine if we should update the existing one
   * Returns true if the new device has more complete information
   */
  private shouldUpdateDevice(existing: WizDevice, newDevice: WizDevice): boolean {
    // Count how many features each device has
    const existingFeatures = this.countDeviceFeatures(existing);
    const newFeatures = this.countDeviceFeatures(newDevice);
    
    // Update if new device has more features
    if (newFeatures > existingFeatures) {
      return true;
    }
    
    // Update if confidence level improved
    const confidenceOrder = { low: 0, medium: 1, high: 2 };
    if (confidenceOrder[newDevice.confidence] > confidenceOrder[existing.confidence]) {
      return true;
    }
    
    return false;
  }

  /**
   * Count how many features a device has (non-null/undefined values)
   */
  private countDeviceFeatures(device: WizDevice): number {
    let count = 0;
    
    if (device.mac) count++;
    if (device.rssi !== undefined) count++;
    if (device.state) {
      if (device.state.brightness !== undefined) count++;
      if (device.state.colorTemp !== undefined) count++;
      if (device.state.sceneId !== undefined) count++;
      if (device.state.power !== undefined) count++;
    }
    
    return count;
  }

  /**
   * Merge two device records, keeping the most complete information
   */
  private mergeDevices(existing: WizDevice, newDevice: WizDevice): WizDevice {
    return {
      id: existing.id,
      ip: newDevice.ip || existing.ip,
      mac: newDevice.mac || existing.mac,
      confidence: newDevice.confidence === 'high' ? 'high' : existing.confidence,
      lastSeen: Date.now(),
      rssi: newDevice.rssi !== undefined ? newDevice.rssi : existing.rssi,
      state: {
        power: newDevice.state?.power ?? existing.state?.power ?? false,
        brightness: newDevice.state?.brightness ?? existing.state?.brightness,
        colorTemp: newDevice.state?.colorTemp ?? existing.state?.colorTemp,
        sceneId: newDevice.state?.sceneId ?? existing.state?.sceneId,
      },
    };
  }

  /**
   * Scan network for WIZ devices
   */
  async scan(options: ScanOptions = {}): Promise<WizDevice[]> {
    if (this.scanInProgress) {
      throw new Error('Scan already in progress');
    }

    this.scanInProgress = true;

    try {
      // Determine subnet to scan
      const subnet = options.subnet || autoDetectSubnet();
      const concurrency = options.concurrency || 20;
      const timeout = options.timeout || 2000;

      console.log(`Starting scan on ${subnet} with concurrency ${concurrency}`);

      // Parse CIDR and enumerate hosts
      parseCIDR(subnet); // Validate CIDR
      const hosts = enumerateHosts(subnet);

      console.log(`Scanning ${hosts.length} hosts...`);

      // Read ARP table for MAC addresses
      const arpTable = await this.getARPTable();

      // Progress tracking
      let hostsScanned = 0;
      let devicesFound = 0;

      const emitProgress = () => {
        if (this.progressCallback) {
          this.progressCallback({
            scanning: true,
            progress: (hostsScanned / hosts.length) * 100,
            currentHost: hosts[hostsScanned],
            devicesFound,
            hostsScanned,
            totalHosts: hosts.length,
          });
        }
      };

      // Scan hosts in batches
      const results: WizDevice[] = [];

      for (let i = 0; i < hosts.length; i += concurrency) {
        const batch = hosts.slice(i, i + concurrency);

        await Promise.all(
          batch.map(async (ip) => {
            const device = await this.probeHost(ip, arpTable.get(ip), timeout);
            hostsScanned++;

            if (device) {
              // Check if device already exists
              const existingDevice = this.devices.get(device.id);
              
              if (!existingDevice) {
                // New device - add it
                devicesFound++;
                this.devices.set(device.id, device);
                
                // Save to database
                if (this.db) {
                  try {
                    this.db.saveDevice(device);
                  } catch (error) {
                    console.error('Error saving device to database:', error);
                  }
                }
                
                results.push(device);
              } else {
                // Device exists - compare features and update if new scan has more info
                const shouldUpdate = this.shouldUpdateDevice(existingDevice, device);
                
                if (shouldUpdate) {
                  // Merge the devices, keeping the best information
                  const mergedDevice = this.mergeDevices(existingDevice, device);
                  this.devices.set(device.id, mergedDevice);
                  
                  // Update in database
                  if (this.db) {
                    try {
                      this.db.saveDevice(mergedDevice);
                    } catch (error) {
                      console.error('Error updating device in database:', error);
                    }
                  }
                  
                  results.push(mergedDevice);
                } else {
                  // Keep existing device, just update lastSeen
                  existingDevice.lastSeen = Date.now();
                  this.devices.set(device.id, existingDevice);
                  
                  // Update lastSeen in database
                  if (this.db) {
                    try {
                      this.db.saveDevice(existingDevice);
                    } catch (error) {
                      console.error('Error updating device lastSeen in database:', error);
                    }
                  }
                }
              }
            }

            // Emit progress every 10 hosts
            if (hostsScanned % 10 === 0) {
              emitProgress();
            }

            return device;
          })
        );

        // Small delay between batches to avoid overwhelming the network
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Final progress update
      emitProgress();

      console.log(`Scan complete. Found ${devicesFound} WIZ devices.`);

      return results;
    } finally {
      this.scanInProgress = false;

      if (this.progressCallback) {
        this.progressCallback({
          scanning: false,
          progress: 100,
          devicesFound: this.devices.size,
          hostsScanned: 0,
          totalHosts: 0,
        });
      }
    }
  }

  /**
   * Check if a scan is currently in progress
   */
  isScanning(): boolean {
    return this.scanInProgress;
  }

  /**
   * Refresh state for all known devices
   */
  async refreshDevices(): Promise<void> {
    const devices = Array.from(this.devices.values());

    await Promise.all(
      devices.map(async (device) => {
        const state = await this.wizClient.getState(device.ip);
        if (state) {
          device.state = state;
          device.lastSeen = Date.now();
        }
      })
    );
  }
}
