/**
 * Schedule manager for automated device control
 */

import schedule from 'node-schedule';
import { DeviceDatabase } from './database.js';
import { WizClient } from './wiz-client.js';
import { NetworkScanner } from './scanner.js';
import { ScheduleRule } from '../shared/types.js';

export class ScheduleManager {
  private db: DeviceDatabase;
  private wizClient: WizClient;
  private scanner: NetworkScanner;
  private jobs = new Map<string, schedule.Job>();
  private onTriggerCallback?: (scheduleId: string, deviceIds: string[]) => void;

  constructor(
    db: DeviceDatabase,
    wizClient: WizClient,
    scanner: NetworkScanner
  ) {
    this.db = db;
    this.wizClient = wizClient;
    this.scanner = scanner;
  }

  /**
   * Set callback for schedule trigger events
   */
  onTrigger(callback: (scheduleId: string, deviceIds: string[]) => void): void {
    this.onTriggerCallback = callback;
  }

  /**
   * Initialize scheduler - load and schedule all enabled rules
   */
  initialize(): void {
    const schedules = this.db.getSchedules();

    for (const rule of schedules) {
      if (rule.enabled) {
        this.scheduleRule(rule);
      }
    }

    console.log(`Initialized ${this.jobs.size} scheduled tasks`);
  }

  /**
   * Schedule a single rule
   */
  private scheduleRule(rule: ScheduleRule): void {
    // Cancel existing job if any
    if (this.jobs.has(rule.id)) {
      this.jobs.get(rule.id)?.cancel();
    }

    try {
      const job = schedule.scheduleJob(rule.cron, async () => {
        console.log(`Executing schedule: ${rule.name} (${rule.id})`);
        await this.executeSchedule(rule);
      });

      if (job) {
        this.jobs.set(rule.id, job);
        console.log(`Scheduled: ${rule.name} with cron "${rule.cron}"`);
      } else {
        console.error(`Failed to schedule: ${rule.name} - invalid cron expression`);
      }
    } catch (error) {
      console.error(`Error scheduling ${rule.name}:`, error);
    }
  }

  /**
   * Execute a schedule's action
   */
  private async executeSchedule(rule: ScheduleRule): Promise<void> {
    const devices = rule.deviceIds
      .map((id) => this.scanner.getDevice(id))
      .filter((d) => d !== undefined);

    if (devices.length === 0) {
      console.warn(`No devices found for schedule: ${rule.name}`);
      return;
    }

    console.log(`Executing action for ${devices.length} devices`);

    // Execute action for each device
    const results = await Promise.allSettled(
      devices.map(async (device) => {
        if (!device) return;

        const { type, power, state } = rule.action;

        switch (type) {
          case 'power':
            if (power !== undefined) {
              await this.wizClient.setPower(device.ip, power);
            }
            break;

          case 'setState':
            if (state) {
              await this.wizClient.setState(device.ip, state);
            }
            break;

          case 'scene':
            if (rule.action.sceneId !== undefined) {
              await this.wizClient.setState(device.ip, {
                sceneId: rule.action.sceneId,
                power: true,
              });
            }
            break;
        }

        // Refresh device state after action
        const newState = await this.wizClient.getState(device.ip);
        if (newState) {
          this.scanner.updateDevice(device.id, { state: newState });
        }
      })
    );

    // Count successes and failures
    const successes = results.filter((r) => r.status === 'fulfilled').length;
    const failures = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `Schedule "${rule.name}" completed: ${successes} succeeded, ${failures} failed`
    );

    // Notify via callback
    if (this.onTriggerCallback) {
      this.onTriggerCallback(rule.id, rule.deviceIds);
    }
  }

  /**
   * Add a new schedule
   */
  addSchedule(rule: ScheduleRule): void {
    this.db.createSchedule(rule);

    if (rule.enabled) {
      this.scheduleRule(rule);
    }
  }

  /**
   * Update a schedule
   */
  updateSchedule(id: string, updates: Partial<ScheduleRule>): boolean {
    const success = this.db.updateSchedule(id, updates);

    if (success) {
      const rule = this.db.getSchedule(id);
      if (rule) {
        if (rule.enabled) {
          this.scheduleRule(rule);
        } else {
          this.unscheduleRule(id);
        }
      }
    }

    return success;
  }

  /**
   * Delete a schedule
   */
  deleteSchedule(id: string): boolean {
    this.unscheduleRule(id);
    return this.db.deleteSchedule(id);
  }

  /**
   * Unschedule a rule (cancel its job)
   */
  private unscheduleRule(id: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.cancel();
      this.jobs.delete(id);
      console.log(`Unscheduled: ${id}`);
    }
  }

  /**
   * Enable/disable a schedule
   */
  setScheduleEnabled(id: string, enabled: boolean): boolean {
    return this.updateSchedule(id, { enabled });
  }

  /**
   * Execute a schedule immediately (for testing)
   */
  async triggerSchedule(id: string): Promise<void> {
    const rule = this.db.getSchedule(id);
    if (!rule) {
      throw new Error(`Schedule ${id} not found`);
    }

    await this.executeSchedule(rule);
  }

  /**
   * Get all schedules
   */
  getSchedules(): ScheduleRule[] {
    return this.db.getSchedules();
  }

  /**
   * Cleanup - cancel all jobs
   */
  shutdown(): void {
    for (const job of this.jobs.values()) {
      job.cancel();
    }
    this.jobs.clear();
    console.log('Scheduler shut down');
  }
}
