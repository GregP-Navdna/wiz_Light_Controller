/**
 * Main server entry point
 * Express API + Socket.IO WebSocket server
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { NetworkScanner } from './scanner.js';
import { WizClient } from './wiz-client.js';
import { DeviceDatabase } from './database.js';
import { ScheduleManager } from './scheduler.js';
import { ApiResponse, WizDevice, ScheduleRule, ScheduleAction } from '../shared/types.js';
import { nanoid } from 'nanoid';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_PATH = process.env.DB_PATH || './data/wiz.db';

// Initialize components
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10),
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10),
});

const db = new DeviceDatabase(DB_PATH);
const scanner = new NetworkScanner(db);
const wizClient = new WizClient();
const scheduleManager = new ScheduleManager(db, wizClient, scanner);

// Middleware
app.use(cors());
app.use(express.json());

// Optional API authentication
const API_SECRET = process.env.API_SECRET;
if (API_SECRET) {
  app.use('/api', (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== API_SECRET) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
  });
}

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Scanner progress callback
scanner.onProgress((progress) => {
  io.emit('scan:progress', progress);
});

// Schedule trigger callback
scheduleManager.onTrigger((scheduleId, deviceIds) => {
  io.emit('schedule:triggered', { scheduleId, deviceIds });
});

// ============================================================================
// REST API Endpoints
// ============================================================================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: Date.now() } });
});

/**
 * Get all discovered devices
 */
app.get('/api/devices', (req, res) => {
  const devices = scanner.getDevices();
  res.json({ success: true, data: devices } as ApiResponse<WizDevice[]>);
});

/**
 * Get a specific device
 */
app.get('/api/devices/:id', (req, res) => {
  const device = scanner.getDevice(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }
  res.json({ success: true, data: device } as ApiResponse<WizDevice>);
});

/**
 * Get device state
 */
app.get('/api/devices/:id/state', async (req, res) => {
  const device = scanner.getDevice(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  const state = await wizClient.getState(device.ip);
  if (!state) {
    return res.status(500).json({ success: false, error: 'Failed to get device state' });
  }

  // Update cached state
  scanner.updateDevice(device.id, { state });
  io.emit('device:updated', scanner.getDevice(device.id));

  res.json({ success: true, data: state });
});

/**
 * Set device power
 */
app.post('/api/devices/:id/power', async (req, res) => {
  const { power } = req.body;

  if (typeof power !== 'boolean') {
    return res.status(400).json({ success: false, error: 'Invalid power value' });
  }

  const device = scanner.getDevice(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  const success = await wizClient.setPower(device.ip, power);
  if (!success) {
    return res.status(500).json({ success: false, error: 'Failed to set power' });
  }

  // Refresh state
  const state = await wizClient.getState(device.ip);
  if (state) {
    scanner.updateDevice(device.id, { state });
    io.emit('device:updated', scanner.getDevice(device.id));
  }

  res.json({ success: true, data: { power } });
});

/**
 * Set device state
 */
app.post('/api/devices/:id/state', async (req, res) => {
  const device = scanner.getDevice(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  const success = await wizClient.setState(device.ip, req.body);
  if (!success) {
    return res.status(500).json({ success: false, error: 'Failed to set state' });
  }

  // Refresh state
  const state = await wizClient.getState(device.ip);
  if (state) {
    scanner.updateDevice(device.id, { state });
    io.emit('device:updated', scanner.getDevice(device.id));
  }

  res.json({ success: true, data: state });
});

/**
 * Start a network scan
 */
app.post('/api/scan', async (req, res) => {
  if (scanner.isScanning()) {
    return res.status(409).json({ success: false, error: 'Scan already in progress' });
  }

  const { subnet, concurrency, timeout } = req.body;

  // Start scan asynchronously
  scanner
    .scan({ subnet, concurrency, timeout })
    .then((devices) => {
      console.log(`Scan completed: ${devices.length} devices found`);
      io.emit('scan:complete', { devices });
    })
    .catch((error) => {
      console.error('Scan error:', error);
      io.emit('scan:error', { error: error.message });
    });

  res.json({ success: true, data: { message: 'Scan started' } });
});

/**
 * Get scan status
 */
app.get('/api/scan/status', (req, res) => {
  res.json({
    success: true,
    data: {
      scanning: scanner.isScanning(),
    },
  });
});

/**
 * Get all schedules
 */
app.get('/api/schedules', (req, res) => {
  const schedules = scheduleManager.getSchedules();
  res.json({ success: true, data: schedules } as ApiResponse<ScheduleRule[]>);
});

/**
 * Create a schedule
 */
app.post('/api/schedules', (req, res) => {
  const { name, deviceIds, action, cron, enabled, timezone } = req.body;

  if (!name || !deviceIds || !action || !cron) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const schedule: ScheduleRule = {
    id: nanoid(),
    name,
    deviceIds,
    action: action as ScheduleAction,
    cron,
    enabled: enabled !== false,
    timezone,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    scheduleManager.addSchedule(schedule);
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * Update a schedule
 */
app.patch('/api/schedules/:id', (req, res) => {
  const success = scheduleManager.updateSchedule(req.params.id, {
    ...req.body,
    updatedAt: Date.now(),
  });

  if (!success) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  res.json({ success: true });
});

/**
 * Delete a schedule
 */
app.delete('/api/schedules/:id', (req, res) => {
  const success = scheduleManager.deleteSchedule(req.params.id);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  res.json({ success: true });
});

/**
 * Enable/disable a schedule
 */
app.post('/api/schedules/:id/enable', (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, error: 'Invalid enabled value' });
  }

  const success = scheduleManager.setScheduleEnabled(req.params.id, enabled);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  res.json({ success: true });
});

/**
 * Trigger a schedule immediately
 */
app.post('/api/schedules/:id/trigger', async (req, res) => {
  try {
    await scheduleManager.triggerSchedule(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ success: false, error: (error as Error).message });
  }
});

/**
 * Set device metadata (name, room, tags)
 */
app.patch('/api/devices/:id/metadata', (req, res) => {
  const { name, room, tags } = req.body;

  db.setDeviceMetadata(req.params.id, { name, room, tags });

  const device = scanner.getDevice(req.params.id);
  if (device && name) {
    scanner.updateDevice(req.params.id, { name });
    io.emit('device:updated', scanner.getDevice(req.params.id));
  }

  res.json({ success: true });
});

// ===== GROUP MANAGEMENT ENDPOINTS =====

/**
 * Get all groups
 */
app.get('/api/groups', (req, res) => {
  const groups = db.getAllGroups();
  res.json({ success: true, data: groups });
});

/**
 * Create a new group
 */
app.post('/api/groups', (req, res) => {
  const { name, description, color, icon } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Group name is required' });
  }

  const group = {
    id: nanoid(),
    name,
    description,
    color: color || '#00FFFF', // Default cyan
    icon: icon || 'Home',
  };

  db.createGroup(group);
  io.emit('group:created', { group });

  res.json({ success: true, data: group });
});

/**
 * Get a single group with its devices
 */
app.get('/api/groups/:id', (req, res) => {
  const group = db.getGroup(req.params.id);

  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  res.json({ success: true, data: group });
});

/**
 * Update a group
 */
app.patch('/api/groups/:id', (req, res) => {
  const { name, description, color, icon } = req.body;

  const success = db.updateGroup(req.params.id, { name, description, color, icon });

  if (!success) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const group = db.getGroup(req.params.id);
  io.emit('group:updated', { group });

  res.json({ success: true, data: group });
});

/**
 * Delete a group
 */
app.delete('/api/groups/:id', (req, res) => {
  const success = db.deleteGroup(req.params.id);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  io.emit('group:deleted', { groupId: req.params.id });

  res.json({ success: true });
});

/**
 * Add devices to a group
 */
app.post('/api/groups/:id/devices', (req, res) => {
  const { deviceIds } = req.body;

  if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
    return res.status(400).json({ success: false, error: 'deviceIds array is required' });
  }

  const group = db.getGroup(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  deviceIds.forEach(deviceId => {
    db.addDeviceToGroup(deviceId, req.params.id);
  });

  const updatedGroup = db.getGroup(req.params.id);
  io.emit('group:updated', { group: updatedGroup });

  res.json({ success: true, data: updatedGroup });
});

/**
 * Remove a device from a group
 */
app.delete('/api/groups/:id/devices/:deviceId', (req, res) => {
  const success = db.removeDeviceFromGroup(req.params.deviceId, req.params.id);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Device or group not found' });
  }

  const updatedGroup = db.getGroup(req.params.id);
  io.emit('group:updated', { group: updatedGroup });

  res.json({ success: true });
});

/**
 * Control power for all devices in a group
 */
app.post('/api/groups/:id/power', async (req, res) => {
  const { power } = req.body;

  if (typeof power !== 'boolean') {
    return res.status(400).json({ success: false, error: 'power must be boolean' });
  }

  const group = db.getGroup(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const deviceIds = group.devices;
  const results = await Promise.allSettled(
    deviceIds.map((deviceId: string) => {
      const device = scanner.getDevice(deviceId);
      if (device) {
        return wizClient.setPower(device.ip, power);
      }
      return Promise.reject(new Error(`Device ${deviceId} not found`));
    })
  );

  const successes = results.filter(r => r.status === 'fulfilled').length;
  const failures = results.filter(r => r.status === 'rejected').length;

  // Refresh device states after a short delay
  setTimeout(async () => {
    await scanner.refreshDevices();
    io.emit('devices:updated', scanner.getDevices());
  }, 500);

  res.json({
    success: true,
    data: { total: deviceIds.length, successes, failures }
  });
});

/**
 * Set state for all devices in a group
 */
app.post('/api/groups/:id/state', async (req, res) => {
  const { brightness, colorTemp, rgb } = req.body;

  const group = db.getGroup(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, error: 'Group not found' });
  }

  const deviceIds = group.devices;
  const results = await Promise.allSettled(
    deviceIds.map((deviceId: string) => {
      const device = scanner.getDevice(deviceId);
      if (device) {
        return wizClient.setState(device.ip, { brightness, colorTemp, rgb });
      }
      return Promise.reject(new Error(`Device ${deviceId} not found`));
    })
  );

  const successes = results.filter(r => r.status === 'fulfilled').length;
  const failures = results.filter(r => r.status === 'rejected').length;

  // Refresh device states after a short delay
  setTimeout(async () => {
    await scanner.refreshDevices();
    io.emit('devices:updated', scanner.getDevices());
  }, 500);

  res.json({
    success: true,
    data: { total: deviceIds.length, successes, failures }
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ============================================================================
// WebSocket Events
// ============================================================================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current devices on connect
  socket.emit('devices:initial', scanner.getDevices());

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  // Client requests refresh
  socket.on('devices:refresh', async () => {
    try {
      await scanner.refreshDevices();
      socket.emit('devices:initial', scanner.getDevices());
    } catch (error) {
      socket.emit('error', { message: 'Failed to refresh devices' });
    }
  });
});

// ============================================================================
// Startup
// ============================================================================

// Initialize scheduler
scheduleManager.initialize();

// Periodic device state refresh (every 30 seconds)
setInterval(async () => {
  try {
    await scanner.refreshDevices();
    io.emit('devices:updated', scanner.getDevices());
  } catch (error) {
    console.error('Error refreshing devices:', error);
  }
}, 30000);

// Remove stale devices (every 5 minutes)
setInterval(() => {
  const removed = scanner.removeStaleDevices();
  if (removed.length > 0) {
    console.log(`Removed ${removed.length} stale devices`);
    removed.forEach((id) => io.emit('device:removed', { deviceId: id }));
  }
}, 5 * 60 * 1000);

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  // Don't exit on network errors during scanning
  if (error.message.includes('ECONNABORTED') || 
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')) {
    console.log('Network error ignored during scanning');
  } else {
    console.error('Fatal error, exiting...');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't exit for promise rejections
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  scheduleManager.shutdown();
  db.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  scheduleManager.shutdown();
  db.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  WIZ LAN Controller                                            ║
║  Server running on http://localhost:${PORT}                       ║
║                                                                ║
║  API Documentation: http://localhost:${PORT}/api/health           ║
║                                                                ║
║  ⚠️  WARNING: Use only on networks you own/operate             ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
