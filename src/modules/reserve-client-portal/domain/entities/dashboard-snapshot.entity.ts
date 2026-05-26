export class DashboardSnapshotEntity {
  id: string;
  client_id: string;
  snapshot_date: Date;
  direct_bookings: number;
  ota_bookings: number;
  direct_revenue: number;
  ota_revenue: number;
  ota_commission_paid: number;
  occupancy_rate: number;
  site_visitors: number;
  site_conversion_rate: number;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<DashboardSnapshotEntity>) {
    Object.assign(this, partial);
  }
}
