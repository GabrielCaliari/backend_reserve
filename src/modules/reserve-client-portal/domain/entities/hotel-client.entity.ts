export class HotelClientEntity {
  id: string;
  admin_id: string;
  hotel_name: string;
  logo_url?: string | null;
  country: string;
  booking_engine?: string | null;
  target_occupancy: number;
  target_direct_pct: number;
  contract_start: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<HotelClientEntity>) {
    Object.assign(this, partial);
  }
}
