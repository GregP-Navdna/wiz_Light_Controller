/**
 * Unit tests for network utility functions
 */

import {
  calculateCIDR,
  parseCIDR,
  enumerateHosts,
  ipToNumber,
  numberToIp,
  isValidIP,
} from '../utils/network';

describe('Network Utilities', () => {
  describe('ipToNumber and numberToIp', () => {
    it('should convert IP to number and back', () => {
      const ip = '192.168.1.1';
      const num = ipToNumber(ip);
      expect(numberToIp(num)).toBe(ip);
    });

    it('should handle edge cases', () => {
      expect(ipToNumber('0.0.0.0')).toBe(0);
      expect(ipToNumber('255.255.255.255')).toBe(4294967295);
      expect(numberToIp(0)).toBe('0.0.0.0');
      expect(numberToIp(4294967295)).toBe('255.255.255.255');
    });
  });

  describe('isValidIP', () => {
    it('should validate correct IPs', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('0.0.0.0')).toBe(true);
      expect(isValidIP('255.255.255.255')).toBe(true);
    });

    it('should reject invalid IPs', () => {
      expect(isValidIP('256.1.1.1')).toBe(false);
      expect(isValidIP('192.168.1')).toBe(false);
      expect(isValidIP('192.168.1.1.1')).toBe(false);
      expect(isValidIP('abc.def.ghi.jkl')).toBe(false);
      expect(isValidIP('')).toBe(false);
    });
  });

  describe('parseCIDR', () => {
    it('should parse /24 CIDR correctly', () => {
      const result = parseCIDR('192.168.1.0/24');
      expect(result.network).toBe('192.168.1.0');
      expect(result.prefix).toBe(24);
      expect(result.totalHosts).toBe(254);
      expect(result.firstHost).toBe('192.168.1.1');
      expect(result.lastHost).toBe('192.168.1.254');
    });

    it('should parse /16 CIDR correctly', () => {
      const result = parseCIDR('10.0.0.0/16');
      expect(result.network).toBe('10.0.0.0');
      expect(result.prefix).toBe(16);
      expect(result.totalHosts).toBe(65534);
    });

    it('should throw on invalid prefix', () => {
      expect(() => parseCIDR('192.168.1.0/33')).toThrow();
      expect(() => parseCIDR('192.168.1.0/-1')).toThrow();
    });
  });

  describe('enumerateHosts', () => {
    it('should enumerate /30 network correctly', () => {
      const hosts = enumerateHosts('192.168.1.0/30');
      expect(hosts).toHaveLength(2);
      expect(hosts[0]).toBe('192.168.1.1');
      expect(hosts[1]).toBe('192.168.1.2');
    });

    it('should enumerate /29 network correctly', () => {
      const hosts = enumerateHosts('10.0.0.0/29');
      expect(hosts).toHaveLength(6);
      expect(hosts[0]).toBe('10.0.0.1');
      expect(hosts[5]).toBe('10.0.0.6');
    });

    it('should throw on too large networks', () => {
      expect(() => enumerateHosts('10.0.0.0/15')).toThrow('too large');
    });
  });

  describe('calculateCIDR', () => {
    it('should calculate /24 CIDR', () => {
      const cidr = calculateCIDR('192.168.1.100', '255.255.255.0');
      expect(cidr).toBe('192.168.1.0/24');
    });

    it('should calculate /16 CIDR', () => {
      const cidr = calculateCIDR('10.5.100.50', '255.255.0.0');
      expect(cidr).toBe('10.5.0.0/16');
    });

    it('should calculate /8 CIDR', () => {
      const cidr = calculateCIDR('172.20.30.40', '255.0.0.0');
      expect(cidr).toBe('172.0.0.0/8');
    });
  });
});
