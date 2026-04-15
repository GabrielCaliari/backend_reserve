import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { Appointment, EAppointmentStatus } from '../../domain/entities/appointment.entity';
import {
  IAppointmentRepository,
  PrismaTransactionClient,
} from '../../domain/interfaces/appointment.repository.interface';
import {
  PaginationParams,
  PaginatedResult,
} from '../../domain/interfaces/appointment-blocked-period.repository.interface';

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    appointment: Appointment,
    tx?: PrismaTransactionClient,
  ): Promise<Appointment> {
    try {
      const client = tx ?? this.prisma;
      const raw = await client.appointment.create({
        data: {
          tenant_id: appointment.tenantId,
          lead_id: appointment.leadId,
          schedule_config_id: appointment.scheduleConfigId,
          appointment_date: appointment.appointmentDate,
          slot_start_time: appointment.slotStartTime,
          slot_end_time: appointment.slotEndTime,
          status: appointment.status,
          ...(appointment.selectedProduct && {
            selected_product: appointment.selectedProduct,
          }),
          ...(appointment.notes && { notes: appointment.notes }),
        },
      });

      return this.toDomain(raw);
    } catch (error) {
      throw new RepositoryException('Error creating appointment', error);
    }
  }

  async findById(id: string, tenantId: string): Promise<Appointment | null> {
    try {
      const raw = await this.prisma.appointment.findFirst({
        where: {
          id,
          tenant_id: tenantId,
        },
        include: {
          Lead: {
            select: {
              name: true,
              email: true,
              phone_number: true,
            },
          },
        },
      });

      return raw ? this.toDomain(raw) : null;
    } catch (error) {
      throw new RepositoryException('Error finding appointment', error);
    }
  }

  async findAllByTenantId(
    tenantId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Appointment>> {
    try {
      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const skip = (page - 1) * limit;

      const [raws, count] = await Promise.all([
        this.prisma.appointment.findMany({
          where: { tenant_id: tenantId },
          skip,
          take: limit,
          orderBy: [
            { appointment_date: 'asc' },
            { slot_start_time: 'asc' },
          ],
        }),
        this.prisma.appointment.count({
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
      throw new RepositoryException('Error listing appointments', error);
    }
  }

  async countBySlot(
    tenantId: string,
    date: Date,
    slotStart: string,
  ): Promise<number> {
    try {
      const count = await this.prisma.appointment.count({
        where: {
          tenant_id: tenantId,
          appointment_date: date,
          slot_start_time: slotStart,
          status: EAppointmentStatus.confirmed,
        },
      });

      return count;
    } catch (error) {
      throw new RepositoryException('Error counting appointments by slot', error);
    }
  }

  async updateStatus(
    id: string,
    status: EAppointmentStatus,
    tx?: PrismaTransactionClient,
  ): Promise<Appointment> {
    try {
      const client = tx ?? this.prisma;
      const raw = await client.appointment.update({
        where: { id },
        data: { status },
      });

      return this.toDomain(raw);
    } catch (error) {
      throw new RepositoryException('Error updating appointment status', error);
    }
  }

  async lockAndCountBySlot(
    tenantId: string,
    date: Date,
    slotStart: string,
    tx: PrismaTransactionClient,
  ): Promise<number> {
    try {
      // PostgreSQL does not allow FOR UPDATE with aggregate functions (COUNT).
      // Strategy: lock the matching rows first with SELECT ... FOR UPDATE,
      // then count them. Both steps run inside the same transaction so the
      // lock is held until the transaction commits/rolls back.
      await tx.$queryRaw`
        SELECT id
        FROM "Appointment"
        WHERE tenant_id = ${tenantId}
          AND appointment_date = ${date}
          AND slot_start_time = ${slotStart}
          AND status = ${EAppointmentStatus.confirmed}::"EAppointmentStatus"
        FOR UPDATE
      `;

      const result = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "Appointment"
        WHERE tenant_id = ${tenantId}
          AND appointment_date = ${date}
          AND slot_start_time = ${slotStart}
          AND status = ${EAppointmentStatus.confirmed}::"EAppointmentStatus"
      `;

      return Number(result[0].count);
    } catch (error) {
      throw new RepositoryException(
        'Error locking and counting appointments by slot',
        error,
      );
    }
  }

  private toDomain(raw: any): Appointment {
    return new Appointment({
      id: raw.id,
      tenantId: raw.tenant_id,
      leadId: raw.lead_id,
      scheduleConfigId: raw.schedule_config_id,
      appointmentDate: raw.appointment_date,
      slotStartTime: raw.slot_start_time,
      slotEndTime: raw.slot_end_time,
      status: raw.status as EAppointmentStatus,
      selectedProduct: raw.selected_product ?? undefined,
      notes: raw.notes ?? undefined,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }
}
