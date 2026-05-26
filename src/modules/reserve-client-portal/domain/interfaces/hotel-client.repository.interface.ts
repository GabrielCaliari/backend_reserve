import { HotelClientEntity } from '../entities/hotel-client.entity';

export const HOTEL_CLIENT_REPOSITORY = 'HOTEL_CLIENT_REPOSITORY';

export interface ICreateHotelClient {
  admin_id: string;
  hotel_name: string;
  logo_url?: string;
  country: string;
  booking_engine?: string;
  target_occupancy?: number;
  target_direct_pct?: number;
  contract_start: Date;
}

export interface IUpdateHotelClient {
  hotel_name?: string;
  logo_url?: string | null;
  country?: string;
  booking_engine?: string | null;
  target_occupancy?: number;
  target_direct_pct?: number;
  is_active?: boolean;
}

export interface IHotelClientRepository {
  create(data: ICreateHotelClient): Promise<HotelClientEntity>;
  findById(id: string): Promise<HotelClientEntity | null>;
  findByAdminId(adminId: string): Promise<HotelClientEntity[]>;
  findAll(page: number, limit: number): Promise<{ data: HotelClientEntity[]; total: number }>;
  update(id: string, data: IUpdateHotelClient): Promise<HotelClientEntity>;
  deactivate(id: string): Promise<HotelClientEntity>;
  delete(id: string): Promise<void>;
}
