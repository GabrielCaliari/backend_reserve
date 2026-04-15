import { Inject, Injectable } from '@nestjs/common';
import { Appointment, EAppointmentStatus } from '../../domain/entities/appointment.entity';
import { SlotInvalidError } from '../../domain/errors/slot-invalid.error';
import { SlotUnavailableError } from '../../domain/errors/slot-unavailable.error';
import { SlotDerivationService } from '../../domain/services/slot-derivation.service';
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
  PrismaTransactionClient,
} from '../../domain/interfaces/appointment.repository.interface';

@Injectable()
export class BookAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY)
    private readonly scheduleConfigRepository: IAppointmentScheduleConfigRepository,
    @Inject(APPOINTMENT_BLOCKED_PERIOD_REPOSITORY)
    private readonly blockedPeriodRepository: IAppointmentBlockedPeriodRepository,
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly slotDerivationService: SlotDerivationService,
  ) {}

  async execute(
    tenantId: string,
    date: Date,
    time: string,
    leadId: string,
    selectedProduct: string | undefined,
    tx: PrismaTransactionClient,
  ): Promise<Appointment> {
    // Get schedule config
    const config = await this.scheduleConfigRepository.findByTenantId(tenantId);
    if (!config) {
      throw new SlotInvalidError(date, time);
    }

    // Get blocked periods
    const blockedPeriods =
      await this.blockedPeriodRepository.findActiveByTenantIdAndDate(
        tenantId,
        date,
      );

    // Derive valid slots
    const validSlots = this.slotDerivationService.deriveSlots(
      config,
      date,
      blockedPeriods,
    );

    // Validate the requested slot exists
    const requestedSlot = validSlots.find((slot) => slot.startTime === time);
    if (!requestedSlot) {
      throw new SlotInvalidError(date, time);
    }

    // Lock and count confirmed bookings for this slot (inside transaction)
    const confirmedCount = await this.appointmentRepository.lockAndCountBySlot(
      tenantId,
      date,
      time,
      tx,
    );

    // Check capacity
    if (confirmedCount >= config.capacityPerSlot) {
      throw new SlotUnavailableError(date, time);
    }

    // Create appointment
    const appointment = new Appointment({
      tenantId,
      leadId,
      scheduleConfigId: config.id!,
      appointmentDate: date,
      slotStartTime: requestedSlot.startTime,
      slotEndTime: requestedSlot.endTime,
      status: EAppointmentStatus.confirmed,
      selectedProduct,
    });

    return await this.appointmentRepository.create(appointment, tx);
  }
}
