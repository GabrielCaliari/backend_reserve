import { InvalidTimeRangeError } from '../errors/invalid-time-range.error';

export interface DayConfig {
  enabled: boolean;
  workStartTime: string;
  workEndTime: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
}

export class AppointmentScheduleConfig {
  public readonly id?: string;
  public readonly tenantId: string;
  public readonly workingDays: number[]; // Legacy field
  public readonly workStartTime: string; // Legacy field
  public readonly workEndTime: string; // Legacy field
  public readonly slotIntervalMinutes: number;
  public readonly capacityPerSlot: number;
  public readonly lunchStartTime?: string; // Legacy field
  public readonly lunchEndTime?: string; // Legacy field
  public readonly daysConfig?: Record<string, DayConfig>; // New per-day config
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(config: {
    id?: string;
    tenantId: string;
    workingDays: number[];
    workStartTime: string;
    workEndTime: string;
    slotIntervalMinutes: number;
    capacityPerSlot: number;
    lunchStartTime?: string;
    lunchEndTime?: string;
    daysConfig?: Record<string, DayConfig>;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    // Validate slot interval minutes (5-480)
    if (config.slotIntervalMinutes < 5 || config.slotIntervalMinutes > 480) {
      throw new InvalidTimeRangeError(
        `Slot interval must be between 5 and 480 minutes, got ${config.slotIntervalMinutes}`,
      );
    }

    // Validate capacity per slot (>= 1)
    if (config.capacityPerSlot < 1) {
      throw new InvalidTimeRangeError(
        `Capacity per slot must be at least 1, got ${config.capacityPerSlot}`,
      );
    }

    // If using per-day config, validate each day
    if (config.daysConfig) {
      for (const [dayKey, dayConfig] of Object.entries(config.daysConfig)) {
        // Validate day key is 0-6
        const dayNum = parseInt(dayKey);
        if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
          throw new InvalidTimeRangeError(
            `Invalid day key: ${dayKey}. Must be 0-6 (0=Sunday, 6=Saturday)`,
          );
        }

        if (dayConfig.enabled) {
          // Validate work time ordering
          if (dayConfig.workEndTime <= dayConfig.workStartTime) {
            throw new InvalidTimeRangeError(
              `Day ${dayKey}: Work end time (${dayConfig.workEndTime}) must be after work start time (${dayConfig.workStartTime})`,
            );
          }

          // Validate lunch time ordering if lunch is configured
          if (dayConfig.lunchStartTime && dayConfig.lunchEndTime) {
            if (dayConfig.lunchEndTime <= dayConfig.lunchStartTime) {
              throw new InvalidTimeRangeError(
                `Day ${dayKey}: Lunch end time (${dayConfig.lunchEndTime}) must be after lunch start time (${dayConfig.lunchStartTime})`,
              );
            }
          }
        }
      }
    } else {
      // Legacy validation for global config
      if (config.workEndTime <= config.workStartTime) {
        throw new InvalidTimeRangeError(
          `Work end time (${config.workEndTime}) must be after work start time (${config.workStartTime})`,
        );
      }

      // Validate lunch time ordering if lunch is configured
      if (config.lunchStartTime && config.lunchEndTime) {
        if (config.lunchEndTime <= config.lunchStartTime) {
          throw new InvalidTimeRangeError(
            `Lunch end time (${config.lunchEndTime}) must be after lunch start time (${config.lunchStartTime})`,
          );
        }
      }
    }

    this.id = config.id;
    this.tenantId = config.tenantId;
    this.workingDays = config.workingDays;
    this.workStartTime = config.workStartTime;
    this.workEndTime = config.workEndTime;
    this.slotIntervalMinutes = config.slotIntervalMinutes;
    this.capacityPerSlot = config.capacityPerSlot;
    this.lunchStartTime = config.lunchStartTime;
    this.lunchEndTime = config.lunchEndTime;
    this.daysConfig = config.daysConfig;
    this.createdAt = config.createdAt;
    this.updatedAt = config.updatedAt;
  }

  /**
   * Gets the configuration for a specific day of the week.
   * Returns per-day config if available, otherwise falls back to legacy global config.
   */
  getDayConfig(dayOfWeek: number): DayConfig | null {
    // If per-day config exists, use it
    if (this.daysConfig && this.daysConfig[dayOfWeek.toString()]) {
      return this.daysConfig[dayOfWeek.toString()];
    }

    // Fall back to legacy global config
    if (this.workingDays.includes(dayOfWeek)) {
      return {
        enabled: true,
        workStartTime: this.workStartTime,
        workEndTime: this.workEndTime,
        lunchStartTime: this.lunchStartTime,
        lunchEndTime: this.lunchEndTime,
      };
    }

    return null; // Day not configured
  }

  /**
   * Checks if this configuration uses per-day settings or legacy global settings
   */
  isPerDayConfig(): boolean {
    return !!this.daysConfig && Object.keys(this.daysConfig).length > 0;
  }
}
