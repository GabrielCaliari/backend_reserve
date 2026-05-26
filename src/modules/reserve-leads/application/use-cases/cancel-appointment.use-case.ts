import { Inject, Injectable } from '@nestjs/common';
import { Appointment, EAppointmentStatus } from '../../domain/entities/appointment.entity';
import { AppointmentAlreadyCancelledError } from '../../domain/errors/appointment-already-cancelled.error';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error';
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepository,
} from '../../domain/interfaces/appointment.repository.interface';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<Appointment> {
    // Find appointment
    const appointment = await this.appointmentRepository.findById(id, tenantId);

    if (!appointment) {
      throw new AppointmentNotFoundError(id);
    }

    // Check if already cancelled
    if (appointment.status === EAppointmentStatus.cancelled) {
      throw new AppointmentAlreadyCancelledError(id);
    }

    // Update status to cancelled
    return await this.appointmentRepository.updateStatus(
      id,
      EAppointmentStatus.cancelled,
    );
  }
}
