import { EReportStatus } from '../enums/report-status.enum';

export class MonthlyReportEntity {
  id: string;
  client_id: string;
  reference_month: Date;
  status: EReportStatus;
  executive_summary?: string | null;
  highlights?: any | null;
  next_steps?: any | null;
  admin_comment?: string | null;
  published_at?: Date | null;
  notification_sent: boolean;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<MonthlyReportEntity>) {
    Object.assign(this, partial);
  }
}
