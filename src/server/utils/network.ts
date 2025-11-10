/**
 * Network utility functions for subnet detection and IP enumeration
 */

import { networkInterfaces } from 'os';

export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  cidr: string;
  family: 'IPv4' | 'IPv6';
}

/**
 * Get all IPv4 network interfaces on the local machine
 */
export function getLocalInterfaces(): NetworkInterface[] {
  const interfaces = networkInterfaces();
  const results: NetworkInterface[] = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;

    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const cidr = calculateCIDR(addr.address, addr.netmask);
        results.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          cidr,
          family: 'IPv4',
        });
      }
    }
  }

  return results;
}

/**
 * Calculate CIDR notation from IP and netmask
 */
export function calculateCIDR(ip: string, netmask: string): string {
  const prefixLength = netmask
    .split('.')
    .map((octet) => parseInt(octet, 10).toString(2).split('1').length - 1)
    .reduce((acc, val) => acc + val, 0);

  const networkAddress = ip
    .split('.')
    .map((octet, i) => parseInt(octet, 10) & parseInt(netmask.split('.')[i], 10))
    .join('.');

  return `${networkAddress}/${prefixLength}`;
}

/**
 * Parse CIDR notation and return network info
 */
export function parseCIDR(cidr: string): {
  network: string;
  prefix: number;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
} {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  if (prefix < 0 || prefix > 32) {
    throw new Error('Invalid CIDR prefix');
  }

  const totalHosts = Math.pow(2, 32 - prefix) - 2; // Exclude network and broadcast

  const networkNum = ipToNumber(network);
  const firstHostNum = networkNum + 1;
  const lastHostNum = networkNum + totalHosts;

  return {
    network,
    prefix,
    firstHost: numberToIp(firstHostNum),
    lastHost: numberToIp(lastHostNum),
    totalHosts: Math.max(0, totalHosts),
  };
}

/**
 * Enumerate all host IPs in a CIDR range
 */
export function enumerateHosts(cidr: string): string[] {
  const { firstHost, lastHost, totalHosts } = parseCIDR(cidr);

  if (totalHosts > 65536) {
    throw new Error('CIDR range too large (max /16)');
  }

  const hosts: string[] = [];
  const firstNum = ipToNumber(firstHost);
  const lastNum = ipToNumber(lastHost);

  for (let i = firstNum; i <= lastNum; i++) {
    hosts.push(numberToIp(i));
  }

  return hosts;
}

/**
 * Convert IP address string to number
 */
export function ipToNumber(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Convert number to IP address string
 */
export function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

/**
 * Validate IP address format
 */
export function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && part === num.toString();
  });
}

/**
 * Auto-detect the most likely subnet to scan
 */
export function autoDetectSubnet(): string {
  const interfaces = getLocalInterfaces();

  // Prefer non-loopback, non-virtual interfaces
  const preferred = interfaces.find(
    (iface) =>
      !iface.name.includes('Virtual') &&
      !iface.name.includes('vEthernet') &&
      iface.address.startsWith('192.168.')
  );

  if (preferred) {
    return preferred.cidr;
  }

  // Fallback to first available interface
  if (interfaces.length > 0) {
    return interfaces[0].cidr;
  }

  // Default fallback
  return '192.168.1.0/24';
}
