import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { devicesApi } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import DeviceCard from '../components/DeviceCard';

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const { devices: wsDevices, refreshDevices } = useWebSocket();

  // Use WebSocket devices as primary source, fallback to API query
  const { data: apiDevices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: devicesApi.getAll,
    enabled: wsDevices.length === 0,
  });

  const devices = wsDevices.length > 0 ? wsDevices : apiDevices || [];

  const refreshMutation = useMutation({
    mutationFn: async () => {
      refreshDevices();
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  if (isLoading && devices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading devices...</p>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">No devices found</p>
          <p className="text-sm text-muted-foreground mb-6">
            Start a scan to discover WIZ bulbs on your network
          </p>
          <a
            href="/scan"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Scan Page
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Devices</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {devices.length} device{devices.length !== 1 ? 's' : ''} discovered
          </p>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw
            size={18}
            className={refreshMutation.isPending ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
}
