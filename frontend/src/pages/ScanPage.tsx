import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Scan, Network, AlertCircle } from 'lucide-react';
import { scanApi } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';

export default function ScanPage() {
  const [subnet, setSubnet] = useState('');
  const [concurrency, setConcurrency] = useState(20);
  const { scanProgress, devices } = useWebSocket();

  const startScanMutation = useMutation({
    mutationFn: () =>
      scanApi.start({
        subnet: subnet || undefined,
        concurrency,
      }),
  });

  const handleStartScan = () => {
    startScanMutation.mutate();
  };

  const isScanning = scanProgress?.scanning || false;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Network Scanner</h2>
        <p className="text-muted-foreground">
          Scan your local network to discover WIZ bulbs
        </p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm">
          <p className="font-semibold text-yellow-500 mb-1">Important</p>
          <p className="text-yellow-500/80">
            Only scan networks you own or have permission to scan. Unauthorized network
            scanning may violate laws or terms of service.
          </p>
        </div>
      </div>

      {/* Scan Configuration */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Scan Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Subnet (optional)
            </label>
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              placeholder="e.g., 192.168.1.0/24 (leave empty for auto-detect)"
              disabled={isScanning}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to automatically detect your subnet
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Concurrency: {concurrency}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value))}
              disabled={isScanning}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of parallel probes (higher = faster but more network load)
            </p>
          </div>
        </div>

        <button
          onClick={handleStartScan}
          disabled={isScanning}
          className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Scan size={20} className={isScanning ? 'animate-spin' : ''} />
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </button>
      </div>

      {/* Scan Progress */}
      {scanProgress && scanProgress.scanning && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Scan Progress</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress</span>
                <span>{scanProgress.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${scanProgress.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-foreground">{scanProgress.hostsScanned}</p>
                <p className="text-xs text-muted-foreground">Hosts Scanned</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-foreground">{scanProgress.totalHosts}</p>
                <p className="text-xs text-muted-foreground">Total Hosts</p>
              </div>
              <div className="bg-primary/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary">{scanProgress.devicesFound}</p>
                <p className="text-xs text-muted-foreground">Devices Found</p>
              </div>
            </div>

            {scanProgress.currentHost && (
              <p className="text-sm text-muted-foreground">
                Scanning: <span className="font-mono">{scanProgress.currentHost}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Discovered Devices */}
      {devices.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Network size={20} />
            Discovered Devices ({devices.length})
          </h3>

          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-secondary/30 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{device.ip}</p>
                  <p className="text-sm text-muted-foreground">
                    {device.mac || 'Unknown MAC'} • Confidence: {device.confidence}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    device.state?.power
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {device.state?.power ? 'Online' : 'Offline'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
