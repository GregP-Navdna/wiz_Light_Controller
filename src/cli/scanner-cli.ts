#!/usr/bin/env node
/**
 * CLI tool for scanning network for WIZ devices
 * Usage: npm run cli:scan -- --subnet 192.168.1.0/24
 */

import { NetworkScanner } from '../server/scanner.js';
import { autoDetectSubnet } from '../server/utils/network.js';

const args = process.argv.slice(2);
const subnetArg = args.find((arg) => arg.startsWith('--subnet='));
const subnet = subnetArg ? subnetArg.split('=')[1] : autoDetectSubnet();

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  WIZ Device Scanner CLI                                        ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`Scanning subnet: ${subnet}\n`);

const scanner = new NetworkScanner();

scanner.onProgress((progress) => {
  process.stdout.write(
    `\rProgress: ${progress.progress.toFixed(1)}% | Scanned: ${progress.hostsScanned}/${progress.totalHosts} | Found: ${progress.devicesFound}`
  );
});

scanner
  .scan({ subnet })
  .then((devices) => {
    console.log('\n\n✅ Scan complete!\n');

    if (devices.length === 0) {
      console.log('No WIZ devices found.');
      return;
    }

    console.log(`Found ${devices.length} WIZ device(s):\n`);

    // Output as JSON for easy parsing
    console.log(JSON.stringify(devices, null, 2));

    console.log('\n📋 Summary:');
    devices.forEach((device, i) => {
      console.log(
        `  ${i + 1}. ${device.ip} (${device.mac || 'unknown MAC'}) - Confidence: ${device.confidence}`
      );
    });
  })
  .catch((error) => {
    console.error('\n❌ Scan failed:', error.message);
    process.exit(1);
  });
