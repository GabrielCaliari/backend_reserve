import { Inject, Injectable } from '@nestjs/common';
import {
  HOTEL_CLIENT_REPOSITORY,
  IHotelClientRepository,
} from '../../domain/interfaces/hotel-client.repository.interface';
import { CreateClientDto } from '../dtos/create-client.dto';
import { UpdateClientDto } from '../dtos/update-client.dto';
import { errorResponse, successResponse } from '../../../../shared/helpers';

@Injectable()
export class HotelClientService {
  constructor(
    @Inject(HOTEL_CLIENT_REPOSITORY)
    private readonly hotelClientRepository: IHotelClientRepository,
  ) {}

  async create(dto: CreateClientDto, adminId: string) {
    try {
      const client = await this.hotelClientRepository.create({
        admin_id: adminId,
        hotel_name: dto.hotel_name,
        logo_url: dto.logo_url,
        country: dto.country,
        booking_engine: dto.booking_engine,
        target_occupancy: dto.target_occupancy,
        target_direct_pct: dto.target_direct_pct,
        contract_start: new Date(dto.contract_start),
      });

      return successResponse(client, 201);
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENT_NOT_CREATED', 500, error);
    }
  }

  async findAll(page = 1, limit = 20) {
    try {
      const result = await this.hotelClientRepository.findAll(page, limit);
      return successResponse({
        data: result.data,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENTS_NOT_LISTED', 500, error);
    }
  }

  async findById(id: string) {
    try {
      const client = await this.hotelClientRepository.findById(id);
      if (!client) {
        return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      }
      return successResponse(client);
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENT_NOT_FOUND', 500, error);
    }
  }

  async findByAdminId(adminId: string) {
    try {
      const clients = await this.hotelClientRepository.findByAdminId(adminId);
      return successResponse(clients);
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENTS_NOT_LISTED', 500, error);
    }
  }

  async update(id: string, dto: UpdateClientDto) {
    try {
      const client = await this.hotelClientRepository.findById(id);
      if (!client) {
        return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      }

      const updated = await this.hotelClientRepository.update(id, dto);
      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENT_NOT_UPDATED', 500, error);
    }
  }

  async deactivate(id: string) {
    try {
      const client = await this.hotelClientRepository.findById(id);
      if (!client) {
        return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      }

      const deactivated = await this.hotelClientRepository.deactivate(id);
      return successResponse({ id: deactivated.id, is_active: deactivated.is_active });
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENT_NOT_DEACTIVATED', 500, error);
    }
  }
}
