import { Inject, Injectable } from '@nestjs/common';
import { SlotDerivationService } from '../../domain/services/slot-derivation.service';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import {
  APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY,
  IAppointmentScheduleConfigRepository,
} from '../../domain/interfaces/appointment-schedule-config.repository.interface';
import {
  APPOINTMENT_BLOCKED_PERIOD_REPOSITORY,
  IAppointmentBlockedPeriodRepository,
} from '../../domain/interfaces/appointment-blocked-period.repository.interface';
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepository,
} from '../../domain/interfaces/appointment.repository.interface';

@Injectable()
export class GetSlotAvailabilityUseCase {
  constructor(
    @Inject(APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY)
    private readonly scheduleConfigRepository: IAppointmentScheduleConfigRepository,
    @Inject(APPOINTMENT_BLOCKED_PERIOD_REPOSITORY)
    private readonly blockedPeriodRepository: IAppointmentBlockedPeriodRepository,
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly slotDerivationService: SlotDerivationService,
  ) {}

  async execute(tenantId: string, dateString: string): Promise<TimeSlot[]> {
    // Parse date
    const date = new Date(dateString);

    // Get schedule config (if none exists, return empty array with 200)
    const config = await this.scheduleConfigRepository.findByTenantId(tenantId);
    if (!config) {
      return [];
    }

    // Get blocked periods for the date
    const blockedPeriods =
      await this.blockedPeriodRepository.findActiveByTenantIdAndDate(
        tenantId,
        date,
      );

    // Derive slots using the domain service
    const derivedSlots = this.slotDerivationService.deriveSlots(
      config,
      date,
      blockedPeriods,
    );

    // For each slot, count confirmed bookings and calculate availability
    const slotsWithAvailability = await Promise.all(
      derivedSlots.map(async (slot) => {
        const confirmedCount = await this.appointmentRepository.countBySlot(
          tenantId,
          date,
          slot.startTime,
        );

        const availableCapacity = config.capacityPerSlot - confirmedCount;
        const isAvailable = availableCapacity > 0;

        return new TimeSlot(
          slot.startTime,
          slot.endTime,
          slot.date,
          availableCapacity,
          isAvailable,
        );
      }),
    );

    return slotsWithAvailability;
  }
}
