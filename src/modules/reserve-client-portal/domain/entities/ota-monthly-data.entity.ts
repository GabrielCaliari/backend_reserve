export class OtaMonthlyDataEntity {
  id: string;
  client_id: string;
  reference_month: Date;
  ota_bookings: number;
  ota_revenue: number;
  commission_rate: number;
  commission_paid: number;
  platform_breakdown?: Record<string, any> | null;
  inserted_by: string;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<OtaMonthlyDataEntity>) {
    Object.assign(this, partial);
  }
}
