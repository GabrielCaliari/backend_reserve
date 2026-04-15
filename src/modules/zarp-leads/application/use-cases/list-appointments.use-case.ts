import { Inject, Injectable } from '@nestjs/common';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepository,
} from '../../domain/interfaces/appointment.repository.interface';
import { PaginatedResult } from '../../domain/interfaces/appointment-blocked-period.repository.interface';

@Injectable()
export class ListAppointmentsUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<Appointment>> {
    return await this.appointmentRepository.findAllByTenantId(tenantId, {
      page,
      limit,
    });
  }
}
