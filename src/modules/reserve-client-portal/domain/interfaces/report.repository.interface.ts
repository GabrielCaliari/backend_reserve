import { MonthlyReportEntity } from '../entities/monthly-report.entity';
import { OtaMonthlyDataEntity } from '../entities/ota-monthly-data.entity';
import { EReportStatus } from '../enums/report-status.enum';

export const REPORT_REPOSITORY = 'REPORT_REPOSITORY';

export interface IUpsertOtaMonthlyData {
  client_id: string;
  reference_month: Date;
  ota_bookings: number;
  ota_revenue: number;
  commission_rate?: number;
  commission_paid?: number;
  platform_breakdown?: Record<string, any>;
  inserted_by: string;
}

export interface ICreateMonthlyReport {
  client_id: string;
  reference_month: Date;
  executive_summary?: string;
  highlights?: any;
  next_steps?: any;
  admin_comment?: string;
}

export interface IUpdateMonthlyReport {
  executive_summary?: string | null;
  highlights?: any | null;
  next_steps?: any | null;
  admin_comment?: string | null;
  status?: EReportStatus;
  published_at?: Date | null;
  notification_sent?: boolean;
}

export interface IReportRepository {
  upsertOtaMonthlyData(data: IUpsertOtaMonthlyData): Promise<OtaMonthlyDataEntity>;
  findOtaDataByClientId(clientId: string, from: Date, to: Date): Promise<OtaMonthlyDataEntity[]>;
  createMonthlyReport(data: ICreateMonthlyReport): Promise<MonthlyReportEntity>;
  findReportById(id: string): Promise<MonthlyReportEntity | null>;
  findReportsByClientId(clientId: string, page: number, limit: number): Promise<{ data: MonthlyReportEntity[]; total: number }>;
  updateMonthlyReport(id: string, data: IUpdateMonthlyReport): Promise<MonthlyReportEntity>;
  findPendingNotifications(): Promise<MonthlyReportEntity[]>;
}
