/**
 * Shared TypeScript types for WIZ controller application
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface WizDevice {
  id: string;
  ip: string;
  mac?: string;
  name?: string;
  model?: string;
  confidence: ConfidenceLevel;
  lastSeen: number;
  state?: DeviceState;
  rssi?: number;
  groups?: string[]; // Array of group IDs this device belongs to
}

export interface DeviceState {
  power: boolean;
  brightness?: number; // 0-100
  colorTemp?: number; // 2200-6500K
  rgb?: {
    r: number;
    g: number;
    b: number;
  };
  speed?: number;
  sceneId?: number;
}

export interface ScanProgress {
  scanning: boolean;
  progress: number; // 0-100
  currentHost?: string;
  devicesFound: number;
  hostsScanned: number;
  totalHosts: number;
}

export interface ScheduleRule {
  id: string;
  name: string;
  deviceIds: string[];
  action: ScheduleAction;
  cron: string;
  enabled: boolean;
  timezone?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleAction {
  type: 'power' | 'setState' | 'scene';
  power?: boolean;
  state?: Partial<DeviceState>;
  sceneId?: number;
}

export interface Scene {
  id: string;
  name: string;
  devices: Array<{
    deviceId: string;
    state: Partial<DeviceState>;
  }>;
}

export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  deviceCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface DeviceGroupDetail extends DeviceGroup {
  devices: string[]; // Array of device IDs in this group
}

export interface GroupControlResult {
  total: number;
  successes: number;
  failures: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ScanOptions {
  subnet?: string;
  concurrency?: number;
  timeout?: number;
}

// WebSocket event types
export type WSEvent =
  | { type: 'device:discovered'; device: WizDevice }
  | { type: 'device:updated'; device: WizDevice }
  | { type: 'device:removed'; deviceId: string }
  | { type: 'scan:progress'; progress: ScanProgress }
  | { type: 'scan:complete'; devices: WizDevice[] }
  | { type: 'schedule:triggered'; scheduleId: string; deviceIds: string[] };
