import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Trash2, Edit2, Power, PowerOff } from 'lucide-react';
import { groupsApi, devicesApi } from '../lib/api';
import type { DeviceGroup } from '../../../src/shared/types';
import GroupCard from '../components/GroupCard';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);

  // Fetch groups
  const { data: groups, isLoading } = useQuery<DeviceGroup[]>({
    queryKey: ['groups'],
    queryFn: groupsApi.getAll,
  });

  // Fetch devices for group creation
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: devicesApi.getAll,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neon-cyan font-mono animate-glow-pulse">LOADING GROUPS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-wider text-neon-cyan">
            DEVICE GROUPS
          </h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            Control multiple devices simultaneously
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold font-mono uppercase tracking-wide rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.5)] hover:shadow-[0_0_30px_rgba(0,255,255,0.7)] hover:scale-105 transition-all duration-300"
        >
          <Plus size={20} />
          New Group
        </button>
      </div>

      {/* Groups Grid */}
      {groups && groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} onEdit={setEditingGroup} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-primary/30 rounded-lg bg-card/50">
          <Users size={64} className="mx-auto text-primary/50 mb-4" />
          <h3 className="text-xl font-mono font-bold text-muted-foreground mb-2">
            NO GROUPS YET
          </h3>
          <p className="text-sm text-muted-foreground mb-6 font-mono">
            Create your first group to control multiple devices at once
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-neon"
          >
            <Plus size={18} />
            Create Group
          </button>
        </div>
      )}

      {/* Create/Edit Modal - TODO: Implement in next step */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border-2 border-primary rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-4">
              CREATE GROUP
            </h2>
            <p className="text-muted-foreground font-mono text-sm">
              Group creation UI coming soon...
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-4 btn-neon"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
