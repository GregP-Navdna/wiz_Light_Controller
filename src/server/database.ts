/**
 * SQLite database for persisting schedules and device metadata
 */

import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';
import { ScheduleRule } from '../shared/types.js';

export class DeviceDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initTables();
  }

  /**
   * Initialize database tables
   */
  private initTables(): void {
    // Schedules table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        device_ids TEXT NOT NULL,
        action TEXT NOT NULL,
        cron TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        timezone TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Devices table - persist discovered devices
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        ip TEXT NOT NULL,
        mac TEXT,
        confidence TEXT NOT NULL,
        last_seen INTEGER NOT NULL,
        rssi INTEGER,
        state TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Device metadata table (user-defined names, rooms, etc.)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS device_metadata (
        device_id TEXT PRIMARY KEY,
        name TEXT,
        room TEXT,
        icon TEXT,
        tags TEXT,
        updated_at INTEGER NOT NULL
      )
    `);

    // Groups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        group_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        icon TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Device-Group junction table (many-to-many)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS device_groups (
        device_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (device_id, group_id),
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_schedules_enabled 
      ON schedules(enabled);
      
      CREATE INDEX IF NOT EXISTS idx_devices_last_seen 
      ON devices(last_seen);
      
      CREATE INDEX IF NOT EXISTS idx_device_groups_device 
      ON device_groups(device_id);
      
      CREATE INDEX IF NOT EXISTS idx_device_groups_group 
      ON device_groups(group_id);
    `);
  }

  /**
   * Create a new schedule
   */
  createSchedule(schedule: ScheduleRule): void {
    const stmt = this.db.prepare(`
      INSERT INTO schedules (
        id, name, device_ids, action, cron, enabled, timezone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      schedule.id,
      schedule.name,
      JSON.stringify(schedule.deviceIds),
      JSON.stringify(schedule.action),
      schedule.cron,
      schedule.enabled ? 1 : 0,
      schedule.timezone || null,
      schedule.createdAt,
      schedule.updatedAt
    );
  }

  /**
   * Get all schedules
   */
  getSchedules(): ScheduleRule[] {
    const stmt = this.db.prepare('SELECT * FROM schedules ORDER BY created_at DESC');
    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      device_ids: string;
      action: string;
      cron: string;
      enabled: number;
      timezone: string | null;
      created_at: number;
      updated_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      deviceIds: JSON.parse(row.device_ids),
      action: JSON.parse(row.action),
      cron: row.cron,
      enabled: row.enabled === 1,
      timezone: row.timezone || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get a specific schedule by ID
   */
  getSchedule(id: string): ScheduleRule | undefined {
    const stmt = this.db.prepare('SELECT * FROM schedules WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      name: string;
      device_ids: string;
      action: string;
      cron: string;
      enabled: number;
      timezone: string | null;
      created_at: number;
      updated_at: number;
    } | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      deviceIds: JSON.parse(row.device_ids),
      action: JSON.parse(row.action),
      cron: row.cron,
      enabled: row.enabled === 1,
      timezone: row.timezone || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update a schedule
   */
  updateSchedule(id: string, updates: Partial<ScheduleRule>): boolean {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.deviceIds !== undefined) {
      fields.push('device_ids = ?');
      values.push(JSON.stringify(updates.deviceIds));
    }

    if (updates.action !== undefined) {
      fields.push('action = ?');
      values.push(JSON.stringify(updates.action));
    }

    if (updates.cron !== undefined) {
      fields.push('cron = ?');
      values.push(updates.cron);
    }

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }

    if (updates.timezone !== undefined) {
      fields.push('timezone = ?');
      values.push(updates.timezone);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());

    if (fields.length === 0) return false;

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE schedules SET ${fields.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Delete a schedule
   */
  deleteSchedule(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM schedules WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Set device metadata
   */
  setDeviceMetadata(
    deviceId: string,
    metadata: { name?: string; room?: string; tags?: string[] }
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO device_metadata (device_id, name, room, tags, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        name = excluded.name,
        room = excluded.room,
        tags = excluded.tags,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      deviceId,
      metadata.name || null,
      metadata.room || null,
      metadata.tags ? JSON.stringify(metadata.tags) : null,
      Date.now()
    );
  }

  /**
   * Get device metadata
   */
  getDeviceMetadata(deviceId: string): {
    name?: string;
    room?: string;
    tags?: string[];
  } | undefined {
    const stmt = this.db.prepare(
      'SELECT name, room, tags FROM device_metadata WHERE device_id = ?'
    );
    const row = stmt.get(deviceId) as {
      name: string | null;
      room: string | null;
      tags: string | null;
    } | undefined;

    if (!row) return undefined;

    return {
      name: row.name || undefined,
      room: row.room || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    };
  }

  // ===== DEVICE PERSISTENCE =====

  /**
   * Save or update a device
   */
  saveDevice(device: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO devices (
        device_id, ip, mac, confidence, last_seen, rssi, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        ip = excluded.ip,
        mac = excluded.mac,
        confidence = excluded.confidence,
        last_seen = excluded.last_seen,
        rssi = excluded.rssi,
        state = excluded.state,
        updated_at = excluded.updated_at
    `);

    const now = Date.now();
    stmt.run(
      device.id,
      device.ip,
      device.mac || null,
      device.confidence,
      device.lastSeen || now,
      device.rssi || null,
      device.state ? JSON.stringify(device.state) : null,
      now,
      now
    );
  }

  /**
   * Get all devices
   */
  getAllDevices(): any[] {
    const stmt = this.db.prepare('SELECT * FROM devices ORDER BY last_seen DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.device_id,
      ip: row.ip,
      mac: row.mac,
      confidence: row.confidence,
      lastSeen: row.last_seen,
      rssi: row.rssi,
      state: row.state ? JSON.parse(row.state) : undefined,
      groups: this.getDeviceGroups(row.device_id),
    }));
  }

  /**
   * Get a single device
   */
  getDevice(deviceId: string): any | undefined {
    const stmt = this.db.prepare('SELECT * FROM devices WHERE device_id = ?');
    const row = stmt.get(deviceId) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.device_id,
      ip: row.ip,
      mac: row.mac,
      confidence: row.confidence,
      lastSeen: row.last_seen,
      rssi: row.rssi,
      state: row.state ? JSON.parse(row.state) : undefined,
      groups: this.getDeviceGroups(row.device_id),
    };
  }

  /**
   * Delete old devices (stale for more than specified time)
   */
  deleteStaleDevices(staleThresholdMs: number): number {
    const threshold = Date.now() - staleThresholdMs;
    const stmt = this.db.prepare('DELETE FROM devices WHERE last_seen < ?');
    const result = stmt.run(threshold);
    return result.changes;
  }

  // ===== GROUP MANAGEMENT =====

  /**
   * Create a new group
   */
  createGroup(group: { id: string; name: string; description?: string; color?: string; icon?: string }): void {
    const stmt = this.db.prepare(`
      INSERT INTO groups (group_id, name, description, color, icon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    stmt.run(
      group.id,
      group.name,
      group.description || null,
      group.color || null,
      group.icon || null,
      now,
      now
    );
  }

  /**
   * Get all groups
   */
  getAllGroups(): any[] {
    const stmt = this.db.prepare('SELECT * FROM groups ORDER BY name');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.group_id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deviceCount: this.getGroupDeviceCount(row.group_id),
    }));
  }

  /**
   * Get a single group with its devices
   */
  getGroup(groupId: string): any | undefined {
    const stmt = this.db.prepare('SELECT * FROM groups WHERE group_id = ?');
    const row = stmt.get(groupId) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.group_id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      devices: this.getGroupDevices(row.group_id),
    };
  }

  /**
   * Update a group
   */
  updateGroup(groupId: string, updates: { name?: string; description?: string; color?: string; icon?: string }): boolean {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(groupId);
    
    const stmt = this.db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE group_id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Delete a group
   */
  deleteGroup(groupId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM groups WHERE group_id = ?');
    const result = stmt.run(groupId);
    return result.changes > 0;
  }

  /**
   * Add device to group
   */
  addDeviceToGroup(deviceId: string, groupId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO device_groups (device_id, group_id, added_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(deviceId, groupId, Date.now());
  }

  /**
   * Remove device from group
   */
  removeDeviceFromGroup(deviceId: string, groupId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM device_groups WHERE device_id = ? AND group_id = ?');
    const result = stmt.run(deviceId, groupId);
    return result.changes > 0;
  }

  /**
   * Get all groups for a device
   */
  getDeviceGroups(deviceId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT g.group_id, g.name
      FROM groups g
      INNER JOIN device_groups dg ON g.group_id = dg.group_id
      WHERE dg.device_id = ?
      ORDER BY g.name
    `);
    const rows = stmt.all(deviceId) as any[];
    return rows.map(row => row.group_id);
  }

  /**
   * Get all devices in a group
   */
  getGroupDevices(groupId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT device_id
      FROM device_groups
      WHERE group_id = ?
    `);
    const rows = stmt.all(groupId) as any[];
    return rows.map(row => row.device_id);
  }

  /**
   * Get device count for a group
   */
  private getGroupDeviceCount(groupId: string): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM device_groups WHERE group_id = ?');
    const row = stmt.get(groupId) as { count: number };
    return row.count;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
