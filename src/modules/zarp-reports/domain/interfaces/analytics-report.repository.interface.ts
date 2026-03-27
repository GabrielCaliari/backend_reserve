import { AnalyticsReport } from '../entities/analytics-report.entity';

export const ANALYTICS_REPORT_REPOSITORY = Symbol('ANALYTICS_REPORT_REPOSITORY');

export interface IAnalyticsReportRepository {
  create(data: AnalyticsReport): Promise<AnalyticsReport>;
  update(id: string, data: Partial<AnalyticsReport>): Promise<AnalyticsReport>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<AnalyticsReport | null>;
  findByPhone(phone: string): Promise<AnalyticsReport | null>;
  findAll(params: { page: number; limit: number }): Promise<{ data: AnalyticsReport[]; total: number }>;
}
