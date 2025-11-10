/**
 * WebSocket hook for real-time device updates
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WizDevice, ScanProgress, WSEvent } from '../../../src/shared/types';

const WS_URL = import.meta.env.VITE_WS_URL || '';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState<WizDevice[]>([]);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    socket.on('devices:initial', (data: WizDevice[]) => {
      setDevices(data);
    });

    socket.on('devices:updated', (data: WizDevice[]) => {
      setDevices(data);
    });

    socket.on('device:discovered', (data: { device: WizDevice }) => {
      setDevices((prev) => {
        const exists = prev.find((d) => d.id === data.device.id);
        if (exists) {
          return prev.map((d) => (d.id === data.device.id ? data.device : d));
        }
        return [...prev, data.device];
      });
    });

    socket.on('device:updated', (data: { device: WizDevice } | WizDevice) => {
      const device = 'device' in data ? data.device : data;
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? device : d))
      );
    });

    socket.on('device:removed', (data: { deviceId: string }) => {
      setDevices((prev) => prev.filter((d) => d.id !== data.deviceId));
    });

    socket.on('scan:progress', (data: ScanProgress) => {
      setScanProgress(data);
    });

    socket.on('scan:complete', (data: { devices: WizDevice[] }) => {
      setDevices(data.devices);
      setScanProgress(null);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const refreshDevices = () => {
    socketRef.current?.emit('devices:refresh');
  };

  return {
    connected,
    devices,
    scanProgress,
    refreshDevices,
  };
}
