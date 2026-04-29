import { Inject, Injectable } from '@nestjs/common';
import {
  HOTEL_CLIENT_REPOSITORY,
  IHotelClientRepository,
} from '../../domain/interfaces/hotel-client.repository.interface';
import { CreateClientDto } from '../dtos/create-client.dto';
import { UpdateClientDto } from '../dtos/update-client.dto';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';

@Injectable()
export class HotelClientService {
  constructor(
    @Inject(HOTEL_CLIENT_REPOSITORY)
    private readonly hotelClientRepository: IHotelClientRepository,
    private readonly prisma: PrismaService,
    private readonly hashProvider: HashProvider,
  ) {}

  async create(dto: CreateClientDto, requestingAdminId: string) {
    try {
      // 1. Find or create Admin for this hotel client email
      let admin = await this.prisma.admin.findUnique({ where: { email: dto.email } });

      if (!admin) {
        const password = dto.password ?? this.generatePassword();
        const { hash, salt, version } = this.hashProvider.hash(password);
        admin = await this.prisma.$transaction(async (tx) => {
          const created = await tx.admin.create({
            data: { name: dto.hotel_name, email: dto.email, role: EAdminRole.company_admin },
          });
          await tx.adminCredential.create({ data: { admin_id: created.id, hash, salt, hash_version: version } });
          return created;
        });
      }

      // 2. Link admin to tenant (upsert — idempotent)
      await this.prisma.adminTenant.upsert({
        where: { admin_id_tenant_id: { admin_id: admin.id, tenant_id: dto.tenant_id } },
        update: { active: true },
        create: { admin_id: admin.id, tenant_id: dto.tenant_id, role: EAdminRole.manager },
      });

      // 3. Create HotelClient with tenant_id
      const raw = await this.prisma.hotelClient.create({
        data: {
          admin_id: admin.id,
          tenant_id: dto.tenant_id,
          hotel_name: dto.hotel_name,
          logo_url: dto.logo_url ?? null,
          country: dto.country,
          booking_engine: dto.booking_engine ?? null,
          target_occupancy: dto.target_occupancy ?? 0.7,
          target_direct_pct: dto.target_direct_pct ?? 0.5,
          contract_start: new Date(dto.contract_start),
        },
        include: { ApiCredentials: true },
      });

      return successResponse(
        {
          id: raw.id,
          admin_id: raw.admin_id,
          tenant_id: raw.tenant_id,
          hotel_name: raw.hotel_name,
          country: raw.country,
          booking_engine: raw.booking_engine,
          logo_url: raw.logo_url,
          target_occupancy: raw.target_occupancy,
          target_direct_pct: raw.target_direct_pct,
          contract_start: raw.contract_start,
          is_active: raw.is_active,
          created_at: raw.created_at,
          updated_at: raw.updated_at,
          credentials: raw.ApiCredentials ?? [],
        },
        201,
      );
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

  async findAllByTenant(tenantId: string) {
    try {
      const clients = await this.prisma.hotelClient.findMany({
        where: { tenant_id: tenantId },
        include: { ApiCredentials: true },
        orderBy: { created_at: 'desc' },
      });
      return successResponse(
        clients.map((c) => ({ ...c, credentials: c.ApiCredentials })),
      );
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENTS_NOT_LISTED', 500, error);
    }
  }

  async findById(id: string) {
    try {
      const raw = await this.prisma.hotelClient.findUnique({
        where: { id },
        include: { ApiCredentials: true },
      });
      if (!raw) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      return successResponse({ ...raw, credentials: raw.ApiCredentials });
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

  async getClientForCurrentTenant(tenantId: string) {
    try {
      const client = await this.prisma.hotelClient.findUnique({
        where: { tenant_id: tenantId },
        include: { ApiCredentials: true },
      });
      if (!client) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      return successResponse({ ...client, credentials: client.ApiCredentials });
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENT_NOT_FOUND', 500, error);
    }
  }

  async update(id: string, dto: UpdateClientDto) {
    try {
      const client = await this.hotelClientRepository.findById(id);
      if (!client) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      const updated = await this.hotelClientRepository.update(id, dto);
      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENT_NOT_UPDATED', 500, error);
    }
  }

  async deactivate(id: string) {
    try {
      const client = await this.hotelClientRepository.findById(id);
      if (!client) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
      const deactivated = await this.hotelClientRepository.deactivate(id);
      return successResponse({ id: deactivated.id, is_active: deactivated.is_active });
    } catch (error) {
      return errorResponse('500:HOTEL_CLIENT_NOT_DEACTIVATED', 500, error);
    }
  }

  private generatePassword(): string {
    return Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase();
  }
}
