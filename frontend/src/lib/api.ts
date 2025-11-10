/**
 * API client for backend communication
 */

import axios from 'axios';
import type { WizDevice, ScheduleRule, ScheduleAction, ApiResponse, ScanProgress } from '../../../src/shared/types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
const token = localStorage.getItem('api_token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export const devicesApi = {
  getAll: () => api.get<ApiResponse<WizDevice[]>>('/devices').then((r) => r.data.data!),
  
  getOne: (id: string) => api.get<ApiResponse<WizDevice>>(`/devices/${id}`).then((r) => r.data.data!),
  
  getState: (id: string) => api.get(`/devices/${id}/state`).then((r) => r.data.data),
  
  setPower: (id: string, power: boolean) =>
    api.post(`/devices/${id}/power`, { power }).then((r) => r.data),
  
  setState: (id: string, state: Partial<WizDevice['state']>) =>
    api.post(`/devices/${id}/state`, state).then((r) => r.data),
  
  setMetadata: (id: string, metadata: { name?: string; room?: string; tags?: string[] }) =>
    api.patch(`/devices/${id}/metadata`, metadata).then((r) => r.data),
};

export const scanApi = {
  start: (options?: { subnet?: string; concurrency?: number; timeout?: number }) =>
    api.post('/scan', options).then((r) => r.data),
  
  getStatus: () => api.get<ApiResponse<{ scanning: boolean }>>('/scan/status').then((r) => r.data.data!),
};

export const schedulesApi = {
  getAll: () => api.get<ApiResponse<ScheduleRule[]>>('/schedules').then((r) => r.data.data!),
  
  create: (schedule: Omit<ScheduleRule, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<ApiResponse<ScheduleRule>>('/schedules', schedule).then((r) => r.data.data!),
  
  update: (id: string, updates: Partial<ScheduleRule>) =>
    api.patch(`/schedules/${id}`, updates).then((r) => r.data),
  
  delete: (id: string) => api.delete(`/schedules/${id}`).then((r) => r.data),
  
  setEnabled: (id: string, enabled: boolean) =>
    api.post(`/schedules/${id}/enable`, { enabled }).then((r) => r.data),
  
  trigger: (id: string) => api.post(`/schedules/${id}/trigger`).then((r) => r.data),
};

export default api;
