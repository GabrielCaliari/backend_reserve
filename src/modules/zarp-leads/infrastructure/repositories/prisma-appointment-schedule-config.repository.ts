import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { AppointmentScheduleConfig, DayConfig } from '../../domain/entities/appointment-schedule-config.entity';
import { IAppointmentScheduleConfigRepository } from '../../domain/interfaces/appointment-schedule-config.repository.interface';

@Injectable()
export class PrismaAppointmentScheduleConfigRepository
  implements IAppointmentScheduleConfigRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    config: AppointmentScheduleConfig,
  ): Promise<AppointmentScheduleConfig> {
    try {
      const raw = await this.prisma.appointmentScheduleConfig.upsert({
        where: { tenant_id: config.tenantId },
        create: {
          tenant_id: config.tenantId,
          working_days: config.workingDays,
          work_start_time: config.workStartTime,
          work_end_time: config.workEndTime,
          slot_interval_minutes: config.slotIntervalMinutes,
          capacity_per_slot: config.capacityPerSlot,
          lunch_start_time: config.lunchStartTime || null,
          lunch_end_time: config.lunchEndTime || null,
          days_config: config.daysConfig ? JSON.stringify(config.daysConfig) : null,
        },
        update: {
          working_days: config.workingDays,
          work_start_time: config.workStartTime,
          work_end_time: config.workEndTime,
          slot_interval_minutes: config.slotIntervalMinutes,
          capacity_per_slot: config.capacityPerSlot,
          lunch_start_time: config.lunchStartTime || null,
          lunch_end_time: config.lunchEndTime || null,
          days_config: config.daysConfig ? JSON.stringify(config.daysConfig) : null,
        },
      });

      return this.toDomain(raw);
    } catch (error) {
      throw new RepositoryException(
        'Error upserting appointment schedule config',
        error,
      );
    }
  }

  async findByTenantId(
    tenantId: string,
  ): Promise<AppointmentScheduleConfig | null> {
    try {
      const raw = await this.prisma.appointmentScheduleConfig.findUnique({
        where: { tenant_id: tenantId },
      });

      return raw ? this.toDomain(raw) : null;
    } catch (error) {
      throw new RepositoryException(
        'Error finding appointment schedule config',
        error,
      );
    }
  }

  private toDomain(raw: any): AppointmentScheduleConfig {
    // Parse days_config JSON if present
    let daysConfig: Record<string, DayConfig> | undefined;
    if (raw.days_config) {
      try {
        daysConfig = typeof raw.days_config === 'string' 
          ? JSON.parse(raw.days_config) 
          : raw.days_config;
      } catch (error) {
        // If JSON parsing fails, ignore days_config and fall back to legacy fields
        daysConfig = undefined;
      }
    }

    return new AppointmentScheduleConfig({
      id: raw.id,
      tenantId: raw.tenant_id,
      workingDays: raw.working_days,
      workStartTime: raw.work_start_time,
      workEndTime: raw.work_end_time,
      slotIntervalMinutes: raw.slot_interval_minutes,
      capacityPerSlot: raw.capacity_per_slot,
      lunchStartTime: raw.lunch_start_time ?? undefined,
      lunchEndTime: raw.lunch_end_time ?? undefined,
      daysConfig,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }
}
