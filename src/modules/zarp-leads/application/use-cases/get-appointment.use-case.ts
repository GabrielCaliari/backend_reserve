import { Inject, Injectable } from '@nestjs/common';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-not-found.error';
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepository,
} from '../../domain/interfaces/appointment.repository.interface';

@Injectable()
export class GetAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id, tenantId);

    if (!appointment) {
      throw new AppointmentNotFoundError(id);
    }

    return appointment;
  }
}
