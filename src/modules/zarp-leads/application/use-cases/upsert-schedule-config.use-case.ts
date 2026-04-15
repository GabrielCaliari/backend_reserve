import { Inject, Injectable } from '@nestjs/common';
import { AppointmentScheduleConfig, DayConfig } from '../../domain/entities/appointment-schedule-config.entity';
import {
  APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY,
  IAppointmentScheduleConfigRepository,
} from '../../domain/interfaces/appointment-schedule-config.repository.interface';
import { UpsertScheduleConfigDto } from '../dtos/upsert-schedule-config.dto';

@Injectable()
export class UpsertScheduleConfigUseCase {
  constructor(
    @Inject(APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY)
    private readonly scheduleConfigRepository: IAppointmentScheduleConfigRepository,
  ) {}

  async execute(
    tenantId: string,
    dto: UpsertScheduleConfigDto,
  ): Promise<AppointmentScheduleConfig> {
    // Determine if using new per-day format or legacy format
    if (dto.days) {
      // New per-day format
      return this.handlePerDayFormat(tenantId, dto);
    } else {
      // Legacy format - require all legacy fields
      if (!dto.workingDays || !dto.workStartTime || !dto.workEndTime) {
        throw new Error(
          'Legacy format requires workingDays, workStartTime, and workEndTime fields',
        );
      }
      return this.handleLegacyFormat(tenantId, dto);
    }
  }

  private async handlePerDayFormat(
    tenantId: string,
    dto: UpsertScheduleConfigDto,
  ): Promise<AppointmentScheduleConfig> {
    // Convert days object to proper DayConfig format
    const daysConfig: Record<string, DayConfig> = {};
    for (const [dayKey, dayData] of Object.entries(dto.days!)) {
      daysConfig[dayKey] = {
        enabled: dayData.enabled,
        workStartTime: dayData.workStartTime,
        workEndTime: dayData.workEndTime,
        lunchStartTime: dayData.lunchStartTime,
        lunchEndTime: dayData.lunchEndTime,
      };
    }

    // For per-day format, we still need to populate legacy fields for backward compatibility
    // Use the first enabled day as the default values
    const firstEnabledDay = Object.values(daysConfig).find(day => day.enabled);
    if (!firstEnabledDay) {
      throw new Error('At least one day must be enabled');
    }

    // Extract working days from the days config
    const workingDays = Object.entries(daysConfig)
      .filter(([_, dayConfig]) => dayConfig.enabled)
      .map(([dayKey, _]) => parseInt(dayKey));

    const config = new AppointmentScheduleConfig({
      tenantId,
      workingDays, // Legacy field populated from per-day config
      workStartTime: firstEnabledDay.workStartTime, // Legacy field
      workEndTime: firstEnabledDay.workEndTime, // Legacy field
      slotIntervalMinutes: dto.slotIntervalMinutes,
      capacityPerSlot: dto.capacityPerSlot,
      lunchStartTime: firstEnabledDay.lunchStartTime, // Legacy field
      lunchEndTime: firstEnabledDay.lunchEndTime, // Legacy field
      daysConfig, // New per-day config
    });

    return await this.scheduleConfigRepository.upsert(config);
  }

  private async handleLegacyFormat(
    tenantId: string,
    dto: UpsertScheduleConfigDto,
  ): Promise<AppointmentScheduleConfig> {
    // Construct entity using legacy fields only
    const config = new AppointmentScheduleConfig({
      tenantId,
      workingDays: dto.workingDays!,
      workStartTime: dto.workStartTime!,
      workEndTime: dto.workEndTime!,
      slotIntervalMinutes: dto.slotIntervalMinutes,
      capacityPerSlot: dto.capacityPerSlot,
      lunchStartTime: dto.lunchStartTime,
      lunchEndTime: dto.lunchEndTime,
      // No daysConfig for legacy format
    });

    return await this.scheduleConfigRepository.upsert(config);
  }
}
