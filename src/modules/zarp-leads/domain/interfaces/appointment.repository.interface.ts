import { Appointment, EAppointmentStatus } from '../entities/appointment.entity';
import { PaginationParams, PaginatedResult } from './appointment-blocked-period.repository.interface';

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');

// Type for Prisma transaction client (implementation-agnostic at domain level)
export type PrismaTransactionClient = any;

export interface IAppointmentRepository {
  create(
    appointment: Appointment,
    tx?: PrismaTransactionClient,
  ): Promise<Appointment>;
  findById(id: string, tenantId: string): Promise<Appointment | null>;
  findAllByTenantId(
    tenantId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Appointment>>;
  countBySlot(tenantId: string, date: Date, slotStart: string): Promise<number>;
  updateStatus(
    id: string,
    status: EAppointmentStatus,
    tx?: PrismaTransactionClient,
  ): Promise<Appointment>;
  lockAndCountBySlot(
    tenantId: string,
    date: Date,
    slotStart: string,
    tx: PrismaTransactionClient,
  ): Promise<number>;
}
