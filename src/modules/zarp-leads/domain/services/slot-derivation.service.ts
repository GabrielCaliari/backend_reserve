import { AppointmentScheduleConfig } from '../entities/appointment-schedule-config.entity';
import { AppointmentBlockedPeriod } from '../entities/appointment-blocked-period.entity';
import { TimeSlot } from '../value-objects/time-slot.vo';

export class SlotDerivationService {
  /**
   * Derives available time slots for a given date based on schedule configuration and blocked periods.
   * This is a pure function with no I/O or side effects.
   *
   * @param config - The schedule configuration for the tenant
   * @param date - The date to derive slots for
   * @param blockedPeriods - Array of blocked periods that should exclude slots
   * @param now - Current datetime (injectable for testing, defaults to new Date())
   * @returns Array of TimeSlot value objects
   */
  deriveSlots(
    config: AppointmentScheduleConfig,
    date: Date,
    blockedPeriods: AppointmentBlockedPeriod[],
    now: Date = new Date(),
  ): TimeSlot[] {
    // 1. Return empty array if date is in the past (calendar date comparison only)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (targetDate < today) {
      return [];
    }

    // 2. Get day configuration (per-day or legacy global)
    const weekday = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dayConfig = config.getDayConfig(weekday);
    
    // Return empty array if day is not configured or not enabled
    if (!dayConfig || !dayConfig.enabled) {
      return [];
    }

    // 3. Generate all slots from workStartTime to workEndTime for this specific day
    const slots: TimeSlot[] = [];
    const workStart = this.timeToMinutes(dayConfig.workStartTime);
    const workEnd = this.timeToMinutes(dayConfig.workEndTime);
    const interval = config.slotIntervalMinutes;

    let currentMinutes = workStart;
    while (currentMinutes + interval <= workEnd) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + interval);

      slots.push(
        new TimeSlot(slotStart, slotEnd, date, config.capacityPerSlot, true),
      );

      currentMinutes += interval;
    }

    // 4. Remove slots overlapping lunch window (if configured for this day)
    let filteredSlots = slots;
    if (dayConfig.lunchStartTime && dayConfig.lunchEndTime) {
      const lunchStart = this.timeToMinutes(dayConfig.lunchStartTime);
      const lunchEnd = this.timeToMinutes(dayConfig.lunchEndTime);

      filteredSlots = slots.filter((slot) => {
        const slotStart = this.timeToMinutes(slot.startTime);
        const slotEnd = this.timeToMinutes(slot.endTime);
        // Slot overlaps lunch if: slotStart < lunchEnd AND slotEnd > lunchStart
        return !(slotStart < lunchEnd && slotEnd > lunchStart);
      });
    }

    // 5. Remove slots overlapping any blocked period
    filteredSlots = filteredSlots.filter((slot) => {
      return !this.isSlotBlocked(slot, date, blockedPeriods);
    });

    // 6. For today, remove slots whose start time has already passed
    if (targetDate.getTime() === today.getTime()) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      filteredSlots = filteredSlots.filter((slot) => {
        const slotStartMinutes = this.timeToMinutes(slot.startTime);
        return slotStartMinutes > currentMinutes;
      });
    }

    return filteredSlots;
  }

  /**
   * Converts "HH:MM" time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Converts minutes since midnight to "HH:MM" time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Checks if a slot overlaps with any blocked period
   */
  private isSlotBlocked(
    slot: TimeSlot,
    date: Date,
    blockedPeriods: AppointmentBlockedPeriod[],
  ): boolean {
    // Create datetime objects for slot start and end
    const slotStartDateTime = this.combineDateAndTime(date, slot.startTime);
    const slotEndDateTime = this.combineDateAndTime(date, slot.endTime);

    return blockedPeriods.some((period) => {
      // Slot overlaps period if: slotStart < periodEnd AND slotEnd > periodStart
      return (
        slotStartDateTime < period.endDatetime &&
        slotEndDateTime > period.startDatetime
      );
    });
  }

  /**
   * Combines a date and time string into a single Date object
   */
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }
}
