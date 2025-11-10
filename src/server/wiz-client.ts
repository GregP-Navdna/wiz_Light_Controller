/**
 * WIZ local control protocol client
 * Implements UDP-based communication with WIZ bulbs on port 38899
 */

import dgram from 'dgram';
import { DeviceState } from '../shared/types.js';

const WIZ_PORT = 38899;
const DEFAULT_TIMEOUT = 2000;

export interface WizResponse {
  method?: string;
  env?: string;
  result?: {
    mac?: string;
    rssi?: number;
    state?: boolean;
    sceneId?: number;
    temp?: number;
    dimming?: number;
    speed?: number;
    r?: number;
    g?: number;
    b?: number;
    c?: number;
    w?: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

export class WizClient {
  private socket: dgram.Socket | null = null;

  /**
   * Send a command to a WIZ device and wait for response
   */
  private async sendCommand(
    ip: string,
    command: object,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<WizResponse> {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      const message = Buffer.from(JSON.stringify(command));
      let completed = false;

      const cleanup = () => {
        if (!completed) {
          completed = true;
          try {
            socket.removeAllListeners();
            socket.close();
          } catch (error) {
            // Socket already closed, ignore
          }
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Request timeout'));
      }, timeout);

      socket.on('message', (msg) => {
        clearTimeout(timer);
        try {
          const response = JSON.parse(msg.toString()) as WizResponse;
          cleanup();
          resolve(response);
        } catch (error) {
          cleanup();
          reject(new Error('Invalid JSON response'));
        }
      });

      socket.on('error', (error: Error) => {
        clearTimeout(timer);
        cleanup();
        // Ignore common network errors during scanning
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('ECONNABORTED') || 
            errorMsg.includes('ECONNRESET') ||
            errorMsg.includes('ETIMEDOUT') ||
            errorMsg.includes('ENOTFOUND')) {
          reject(new Error('Connection error'));
        } else {
          reject(error);
        }
      });

      socket.send(message, WIZ_PORT, ip, (error) => {
        if (error) {
          clearTimeout(timer);
          cleanup();
          reject(error);
        }
      });
    });
  }

  /**
   * Discover/probe a device to check if it's a WIZ bulb
   * Returns device info if successful, null otherwise
   */
  async probe(ip: string, timeout?: number): Promise<WizResponse | null> {
    try {
      const response = await this.sendCommand(
        ip,
        { method: 'getPilot', params: {} },
        timeout
      );

      // Valid WIZ response should have result field
      if (response.result) {
        return response;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get device system configuration (MAC, model info, etc.)
   */
  async getSystemConfig(ip: string): Promise<WizResponse | null> {
    try {
      const response = await this.sendCommand(ip, {
        method: 'getSystemConfig',
        params: {},
      });

      // Log the system config response for debugging
      if (response.result) {
        console.log(`[${ip}] System Config:`, JSON.stringify(response, null, 2));
      }

      return response.result ? response : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get device model configuration (capabilities/features)
   */
  async getModelConfig(ip: string): Promise<WizResponse | null> {
    try {
      const response = await this.sendCommand(ip, {
        method: 'getModelConfig',
        params: {},
      });

      // Log the model config response to see device capabilities
      if (response.result) {
        console.log(`[${ip}] Model Config (Capabilities):`, JSON.stringify(response, null, 2));
      }

      return response.result ? response : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current device state
   */
  async getState(ip: string): Promise<DeviceState | null> {
    try {
      const response = await this.sendCommand(ip, {
        method: 'getPilot',
        params: {},
      });

      if (!response.result) return null;

      const result = response.result;

      return {
        power: result.state ?? false,
        brightness: result.dimming,
        colorTemp: result.temp,
        rgb:
          result.r !== undefined && result.g !== undefined && result.b !== undefined
            ? { r: result.r, g: result.g, b: result.b }
            : undefined,
        speed: result.speed,
        sceneId: result.sceneId,
      };
    } catch (error) {
      console.error(`Failed to get state for ${ip}:`, error);
      return null;
    }
  }

  /**
   * Set device power state
   */
  async setPower(ip: string, power: boolean): Promise<boolean> {
    try {
      const response = await this.sendCommand(ip, {
        method: 'setPilot',
        params: { state: power },
      });

      return response.result !== undefined && !response.error;
    } catch (error) {
      console.error(`Failed to set power for ${ip}:`, error);
      return false;
    }
  }

  /**
   * Set device brightness (10-100)
   */
  async setBrightness(ip: string, brightness: number): Promise<boolean> {
    try {
      const dimming = Math.max(10, Math.min(100, brightness));
      const response = await this.sendCommand(ip, {
        method: 'setPilot',
        params: { dimming, state: true },
      });

      return response.result !== undefined && !response.error;
    } catch (error) {
      console.error(`Failed to set brightness for ${ip}:`, error);
      return false;
    }
  }

  /**
   * Set color temperature (2200-6500K)
   */
  async setColorTemp(ip: string, temp: number): Promise<boolean> {
    try {
      const colorTemp = Math.max(2200, Math.min(6500, temp));
      const response = await this.sendCommand(ip, {
        method: 'setPilot',
        params: { temp: colorTemp, state: true },
      });

      return response.result !== undefined && !response.error;
    } catch (error) {
      console.error(`Failed to set color temp for ${ip}:`, error);
      return false;
    }
  }

  /**
   * Set RGB color
   */
  async setRGB(ip: string, r: number, g: number, b: number): Promise<boolean> {
    try {
      const response = await this.sendCommand(ip, {
        method: 'setPilot',
        params: {
          r: Math.max(0, Math.min(255, r)),
          g: Math.max(0, Math.min(255, g)),
          b: Math.max(0, Math.min(255, b)),
          state: true,
        },
      });

      return response.result !== undefined && !response.error;
    } catch (error) {
      console.error(`Failed to set RGB for ${ip}:`, error);
      return false;
    }
  }

  /**
   * Set device state with multiple parameters
   */
  async setState(ip: string, state: Partial<DeviceState>): Promise<boolean> {
    try {
      const params: Record<string, unknown> = {};

      if (state.power !== undefined) {
        params.state = state.power;
      }

      if (state.brightness !== undefined) {
        params.dimming = Math.max(10, Math.min(100, state.brightness));
      }

      if (state.colorTemp !== undefined) {
        params.temp = Math.max(2200, Math.min(6500, state.colorTemp));
      }

      if (state.rgb) {
        params.r = Math.max(0, Math.min(255, state.rgb.r));
        params.g = Math.max(0, Math.min(255, state.rgb.g));
        params.b = Math.max(0, Math.min(255, state.rgb.b));
      }

      if (state.speed !== undefined) {
        params.speed = state.speed;
      }

      if (state.sceneId !== undefined) {
        params.sceneId = state.sceneId;
      }

      const response = await this.sendCommand(ip, {
        method: 'setPilot',
        params,
      });

      return response.result !== undefined && !response.error;
    } catch (error) {
      console.error(`Failed to set state for ${ip}:`, error);
      return false;
    }
  }

  /**
   * Set device scene with optional speed (0-200, default 100)
   */
  async setScene(ip: string, sceneId: number, speed: number = 100): Promise<boolean> {
    try {
      const response = await this.sendCommand(ip, {
        method: 'setPilot',
        params: {
          sceneId,
          speed: Math.max(0, Math.min(200, speed)),
          state: true,
        },
      });

      return response.result !== undefined && !response.error;
    } catch (error) {
      console.error(`Failed to set scene for ${ip}:`, error);
      return false;
    }
  }

  /**
   * Close the client
   */
  close(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
