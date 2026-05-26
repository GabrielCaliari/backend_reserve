import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { AppointmentBlockedPeriod } from '../../domain/entities/appointment-blocked-period.entity';
import {
  IAppointmentBlockedPeriodRepository,
  PaginationParams,
  PaginatedResult,
} from '../../domain/interfaces/appointment-blocked-period.repository.interface';

@Injectable()
export class PrismaAppointmentBlockedPeriodRepository
  implements IAppointmentBlockedPeriodRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    period: AppointmentBlockedPeriod,
  ): Promise<AppointmentBlockedPeriod> {
    try {
      const raw = await this.prisma.appointmentBlockedPeriod.create({
        data: {
          tenant_id: period.tenantId,
          schedule_config_id: period.scheduleConfigId,
          start_datetime: period.startDatetime,
          end_datetime: period.endDatetime,
          ...(period.label && { label: period.label }),
        },
      });

      return this.toDomain(raw);
    } catch (error) {
      throw new RepositoryException(
        'Error creating appointment blocked period',
        error,
      );
    }
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<AppointmentBlockedPeriod | null> {
    try {
      const raw = await this.prisma.appointmentBlockedPeriod.findFirst({
        where: {
          id,
          tenant_id: tenantId,
        },
      });

      return raw ? this.toDomain(raw) : null;
    } catch (error) {
      throw new RepositoryException(
        'Error finding appointment blocked period',
        error,
      );
    }
  }

  async findActiveByTenantIdAndDate(
    tenantId: string,
    date: Date,
  ): Promise<AppointmentBlockedPeriod[]> {
    try {
      // Calculate day start and end for the given date
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const raws = await this.prisma.appointmentBlockedPeriod.findMany({
        where: {
          tenant_id: tenantId,
          // Period overlaps with the day if: start_datetime <= dayEnd AND end_datetime >= dayStart
          start_datetime: { lte: dayEnd },
          end_datetime: { gte: dayStart },
        },
        orderBy: { start_datetime: 'asc' },
      });

      return raws.map((raw) => this.toDomain(raw));
    } catch (error) {
      throw new RepositoryException(
        'Error finding active blocked periods',
        error,
      );
    }
  }

  async findAllByTenantId(
    tenantId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<AppointmentBlockedPeriod>> {
    try {
      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const skip = (page - 1) * limit;

      const [raws, count] = await Promise.all([
        this.prisma.appointmentBlockedPeriod.findMany({
          where: { tenant_id: tenantId },
          skip,
          take: limit,
          orderBy: { start_datetime: 'asc' },
        }),
        this.prisma.appointmentBlockedPeriod.count({
          where: { tenant_id: tenantId },
        }),
      ]);

      return {
        data: raws.map((raw) => this.toDomain(raw)),
        count,
        page,
        limit,
      };
    } catch (error) {
      throw new RepositoryException(
        'Error listing appointment blocked periods',
        error,
      );
    }
  }

  async update(
    period: AppointmentBlockedPeriod,
  ): Promise<AppointmentBlockedPeriod> {
    try {
      const raw = await this.prisma.appointmentBlockedPeriod.update({
        where: { id: period.id },
        data: {
          start_datetime: period.startDatetime,
          end_datetime: period.endDatetime,
          label: period.label ?? null,
        },
      });

      return this.toDomain(raw);
    } catch (error) {
      throw new RepositoryException(
        'Error updating appointment blocked period',
        error,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.appointmentBlockedPeriod.delete({
        where: { id },
      });
    } catch (error) {
      throw new RepositoryException(
        'Error deleting appointment blocked period',
        error,
      );
    }
  }

  private toDomain(raw: any): AppointmentBlockedPeriod {
    return new AppointmentBlockedPeriod({
      id: raw.id,
      tenantId: raw.tenant_id,
      scheduleConfigId: raw.schedule_config_id,
      startDatetime: raw.start_datetime,
      endDatetime: raw.end_datetime,
      label: raw.label ?? undefined,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }
}
