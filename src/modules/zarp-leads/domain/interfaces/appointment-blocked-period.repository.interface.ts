import { AppointmentBlockedPeriod } from '../entities/appointment-blocked-period.entity';
import { EAppointmentStatus } from '../entities/appointment.entity';

export const APPOINTMENT_BLOCKED_PERIOD_REPOSITORY = Symbol(
  'APPOINTMENT_BLOCKED_PERIOD_REPOSITORY',
);

export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: EAppointmentStatus;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
}

export interface IAppointmentBlockedPeriodRepository {
  create(period: AppointmentBlockedPeriod): Promise<AppointmentBlockedPeriod>;
  findById(id: string, tenantId: string): Promise<AppointmentBlockedPeriod | null>;
  findActiveByTenantIdAndDate(
    tenantId: string,
    date: Date,
  ): Promise<AppointmentBlockedPeriod[]>;
  findAllByTenantId(
    tenantId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<AppointmentBlockedPeriod>>;
  update(period: AppointmentBlockedPeriod): Promise<AppointmentBlockedPeriod>;
  delete(id: string): Promise<void>;
}
