import { Inject, Injectable } from '@nestjs/common';
import { AppointmentBlockedPeriod } from '../../domain/entities/appointment-blocked-period.entity';
import { AppointmentScheduleConfig } from '../../domain/entities/appointment-schedule-config.entity';
import {
  APPOINTMENT_BLOCKED_PERIOD_REPOSITORY,
  IAppointmentBlockedPeriodRepository,
} from '../../domain/interfaces/appointment-blocked-period.repository.interface';
import {
  APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY,
  IAppointmentScheduleConfigRepository,
} from '../../domain/interfaces/appointment-schedule-config.repository.interface';
import { CreateBlockedPeriodDto } from '../dtos/create-blocked-period.dto';

@Injectable()
export class CreateBlockedPeriodUseCase {
  constructor(
    @Inject(APPOINTMENT_BLOCKED_PERIOD_REPOSITORY)
    private readonly blockedPeriodRepository: IAppointmentBlockedPeriodRepository,
    @Inject(APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY)
    private readonly scheduleConfigRepository: IAppointmentScheduleConfigRepository,
  ) {}

  async execute(
    tenantId: string,
    dto: CreateBlockedPeriodDto,
  ): Promise<AppointmentBlockedPeriod> {
    // Get or create a default schedule config
    let config = await this.scheduleConfigRepository.findByTenantId(tenantId);
    
    if (!config) {
      // Create a default schedule config automatically
      // Monday to Friday, 9 AM to 5 PM, 30-minute slots, capacity 1
      config = new AppointmentScheduleConfig({
        tenantId,
        workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        workStartTime: '09:00',
        workEndTime: '17:00',
        slotIntervalMinutes: 30,
        capacityPerSlot: 1,
      });
      
      config = await this.scheduleConfigRepository.upsert(config);
    }

    // Construct entity (entity constructor validates end > start)
    const period = new AppointmentBlockedPeriod({
      tenantId,
      scheduleConfigId: config.id!,
      startDatetime: new Date(dto.startDatetime),
      endDatetime: new Date(dto.endDatetime),
      label: dto.label,
    });

    return await this.blockedPeriodRepository.create(period);
  }
}
