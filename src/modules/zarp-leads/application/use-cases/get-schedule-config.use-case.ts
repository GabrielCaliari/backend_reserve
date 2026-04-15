import { Inject, Injectable } from '@nestjs/common';
import { AppointmentScheduleConfig } from '../../domain/entities/appointment-schedule-config.entity';
import { ScheduleConfigNotFoundError } from '../../domain/errors/schedule-config-not-found.error';
import {
  APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY,
  IAppointmentScheduleConfigRepository,
} from '../../domain/interfaces/appointment-schedule-config.repository.interface';

@Injectable()
export class GetScheduleConfigUseCase {
  constructor(
    @Inject(APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY)
    private readonly scheduleConfigRepository: IAppointmentScheduleConfigRepository,
  ) {}

  async execute(tenantId: string): Promise<AppointmentScheduleConfig> {
    const config = await this.scheduleConfigRepository.findByTenantId(tenantId);

    if (!config) {
      throw new ScheduleConfigNotFoundError(tenantId);
    }

    return config;
  }
}
