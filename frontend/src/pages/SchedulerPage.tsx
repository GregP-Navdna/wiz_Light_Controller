import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Trash2, Power, Edit } from 'lucide-react';
import { schedulesApi, devicesApi } from '../lib/api';
import type { ScheduleRule } from '../../../src/shared/types';

export default function SchedulerPage() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: schedulesApi.getAll,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: devicesApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: schedulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      schedulesApi.setEnabled(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: schedulesApi.trigger,
  });

  if (schedulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scheduler</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automate your devices with scheduled actions
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Create Schedule
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <ScheduleForm
            devices={devices}
            onSuccess={() => {
              setShowCreateForm(false);
              queryClient.invalidateQueries({ queryKey: ['schedules'] });
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No schedules created yet</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-primary hover:underline"
          >
            Create your first schedule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {schedule.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        schedule.enabled
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {schedule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium">Schedule:</span> {schedule.cron}
                    </p>
                    <p>
                      <span className="font-medium">Devices:</span>{' '}
                      {schedule.deviceIds.length} device(s)
                    </p>
                    <p>
                      <span className="font-medium">Action:</span>{' '}
                      {schedule.action.type === 'power'
                        ? `Turn ${schedule.action.power ? 'ON' : 'OFF'}`
                        : schedule.action.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      toggleMutation.mutate({
                        id: schedule.id,
                        enabled: !schedule.enabled,
                      })
                    }
                    disabled={toggleMutation.isPending}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title={schedule.enabled ? 'Disable' : 'Enable'}
                  >
                    <Power
                      size={18}
                      className={
                        schedule.enabled ? 'text-green-500' : 'text-muted-foreground'
                      }
                    />
                  </button>

                  <button
                    onClick={() => triggerMutation.mutate(schedule.id)}
                    disabled={triggerMutation.isPending}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="Trigger now"
                  >
                    <Play size={18} className="text-foreground" />
                  </button>

                  <button
                    onClick={() => deleteMutation.mutate(schedule.id)}
                    disabled={deleteMutation.isPending}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} className="text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Schedule creation form component
function ScheduleForm({
  devices,
  onSuccess,
  onCancel,
}: {
  devices: any[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [actionType, setActionType] = useState<'power'>('power');
  const [powerState, setPowerState] = useState(true);
  const [cron, setCron] = useState('0 * * * *');

  const createMutation = useMutation({
    mutationFn: schedulesApi.create,
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      name,
      deviceIds: selectedDevices,
      action: {
        type: actionType,
        power: powerState,
      },
      cron,
      enabled: true,
    });
  };

  const toggleDevice = (deviceId: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Schedule Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Morning lights"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Select Devices ({selectedDevices.length} selected)
        </label>
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
          {devices.map((device) => (
            <label
              key={device.id}
              className="flex items-center gap-2 p-2 hover:bg-secondary rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedDevices.includes(device.id)}
                onChange={() => toggleDevice(device.id)}
                className="rounded"
              />
              <span className="text-sm text-foreground">
                {device.name || device.ip}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Action
        </label>
        <select
          value={powerState ? 'on' : 'off'}
          onChange={(e) => setPowerState(e.target.value === 'on')}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="on">Turn ON</option>
          <option value="off">Turn OFF</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Cron Expression
        </label>
        <input
          type="text"
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          required
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="0 * * * *"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Format: minute hour day month weekday (e.g., "0 8 * * *" = 8 AM daily)
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={createMutation.isPending || selectedDevices.length === 0}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
