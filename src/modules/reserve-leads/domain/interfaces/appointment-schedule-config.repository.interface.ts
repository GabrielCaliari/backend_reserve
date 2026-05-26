import { AppointmentScheduleConfig } from '../entities/appointment-schedule-config.entity';

export const APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY = Symbol(
  'APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY',
);

export interface IAppointmentScheduleConfigRepository {
  upsert(config: AppointmentScheduleConfig): Promise<AppointmentScheduleConfig>;
  findByTenantId(tenantId: string): Promise<AppointmentScheduleConfig | null>;
}
