import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Power, PowerOff, Trash2, Edit2, Users, Sun, Zap } from 'lucide-react';
import { groupsApi } from '../lib/api';
import type { DeviceGroup } from '../../../src/shared/types';

interface GroupCardProps {
  group: DeviceGroup;
  onEdit: (group: DeviceGroup) => void;
}

export default function GroupCard({ group, onEdit }: GroupCardProps) {
  const queryClient = useQueryClient();
  const [brightness, setBrightness] = useState(100);

  // Delete group mutation
  const deleteMutation = useMutation({
    mutationFn: () => groupsApi.delete(group.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  // Power control mutation
  const powerMutation = useMutation({
    mutationFn: (power: boolean) => groupsApi.setPower(group.id, power),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Brightness control mutation
  const brightnessMutation = useMutation({
    mutationFn: (value: number) => groupsApi.setState(group.id, { brightness: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const handleBrightnessCommit = () => {
    brightnessMutation.mutate(brightness);
  };

  const handleDelete = () => {
    if (confirm(`Delete group "${group.name}"?`)) {
      deleteMutation.mutate();
    }
  };

  // Get icon component based on group icon
  const IconComponent = group.icon === 'Sun' ? Sun : group.icon === 'Zap' ? Zap : Users;
  
  // Use group color or default to cyan
  const groupColor = group.color || '#00FFFF';

  return (
    <div
      className="bg-card border-2 border-primary/30 rounded-lg p-6 hover:border-primary transition-all duration-300 shadow-[8px_8px_30px_rgba(0,0,0,0.6),12px_12px_40px_rgba(0,0,0,0.4),4px_4px_15px_rgba(0,255,255,0.2)] hover:shadow-[12px_12px_40px_rgba(0,0,0,0.7),16px_16px_50px_rgba(0,0,0,0.5),6px_6px_20px_rgba(0,255,255,0.35)] hover:-translate-y-2 hover:translate-x-[-2px] backdrop-blur-sm"
      style={{
        boxShadow: `8px 8px 30px rgba(0,0,0,0.6), 12px 12px 40px rgba(0,0,0,0.4), 4px 4px 15px ${groupColor}33`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="p-2 rounded-lg bg-primary/20"
            style={{ color: groupColor }}
          >
            <IconComponent size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold font-mono tracking-wider" style={{ color: groupColor }}>
              {group.name.toUpperCase()}
            </h3>
            {group.description && (
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {group.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(group)}
            className="p-2 hover:bg-primary/10 rounded transition-colors"
            title="Edit group"
          >
            <Edit2 size={16} className="text-neon-cyan" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-2 hover:bg-red-500/10 rounded transition-colors"
            title="Delete group"
          >
            <Trash2 size={16} className="text-neon-orange" />
          </button>
        </div>
      </div>

      {/* Device Count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 font-mono">
        <Users size={16} />
        <span>{group.deviceCount} {group.deviceCount === 1 ? 'device' : 'devices'}</span>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Power Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => powerMutation.mutate(true)}
            disabled={powerMutation.isPending}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold font-mono uppercase text-sm bg-neon-green/20 text-neon-green border-2 border-neon-green/30 hover:bg-neon-green/30 hover:shadow-[0_0_20px_rgba(57,255,20,0.5)] transition-all duration-300 disabled:opacity-50"
          >
            <Power size={16} />
            ON
          </button>
          <button
            onClick={() => powerMutation.mutate(false)}
            disabled={powerMutation.isPending}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold font-mono uppercase text-sm bg-urban-concrete/50 text-muted-foreground border-2 border-primary/30 hover:bg-primary/10 transition-all duration-300 disabled:opacity-50"
          >
            <PowerOff size={16} />
            OFF
          </button>
        </div>

        {/* Brightness Slider */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2 font-mono">
            <Sun size={16} />
            Brightness: {brightness}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
            onMouseUp={handleBrightnessCommit}
            onTouchEnd={handleBrightnessCommit}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            style={{
              background: `linear-gradient(to right, ${groupColor} 0%, ${groupColor} ${brightness}%, rgb(var(--muted)) ${brightness}%, rgb(var(--muted)) 100%)`,
            }}
          />
        </div>
      </div>

      {/* Status indicator */}
      {(powerMutation.isPending || brightnessMutation.isPending) && (
        <div className="mt-4 text-xs text-neon-cyan font-mono animate-glow-pulse text-center">
          SENDING COMMANDS...
        </div>
      )}
    </div>
  );
}
