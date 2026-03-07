import { Inject, Injectable } from '@nestjs/common';
import { errorTypes } from '../../../../shared/constants/error-types';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import {
  TENANT_REPOSITORY,
  ITenantRepository,
} from '../../domain/interfaces/tenant.repository.interface';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../domain/interfaces/admin-tenant.repository.interface';
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
} from '../../domain/interfaces/admin.repository.interface';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { CreateTenantDTO, UpdateTenantDTO } from '../dtos/tenant-management.dto';

@Injectable()
export class TenantService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: ITenantRepository,
    @Inject(ADMIN_TENANT_REPOSITORY) private readonly adminTenantRepository: IAdminTenantRepository,
    @Inject(ADMIN_REPOSITORY) private readonly adminRepository: IAdminRepository,
  ) {}

  async create(dto: CreateTenantDTO) {
    try {
      const existing = await this.tenantRepository.selectBySlug(dto.slug);
      if (existing) {
        return errorResponse('400:TENANT_SLUG_ALREADY_EXISTS', 400);
      }

      const tenant = await this.tenantRepository.create({
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain,
      });

      return successResponse(tenant, 201);
    } catch (error) {
      return errorResponse('500:TENANT_NOT_CREATED', 500, error);
    }
  }

  async findAll() {
    try {
      const tenants = await this.tenantRepository.selectAll();
      return successResponse(tenants);
    } catch (error) {
      return errorResponse('500:TENANTS_NOT_LISTED', 500, error);
    }
  }

  async findById(id: string) {
    try {
      const tenant = await this.tenantRepository.selectById(id);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }
      return successResponse(tenant);
    } catch (error) {
      return errorResponse('500:TENANT_NOT_FOUND', 500, error);
    }
  }

  async update(id: string, dto: UpdateTenantDTO) {
    try {
      const tenant = await this.tenantRepository.selectById(id);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      if (dto.slug && dto.slug !== tenant.slug) {
        const existing = await this.tenantRepository.selectBySlug(dto.slug);
        if (existing) {
          return errorResponse('400:TENANT_SLUG_ALREADY_EXISTS', 400);
        }
      }

      const updated = await this.tenantRepository.update(id, dto);
      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:TENANT_NOT_UPDATED', 500, error);
    }
  }

  async assignAdmin(adminId: string, tenantId: string) {
    try {
      const admin = await this.adminRepository.selectById(adminId);
      if (!admin) {
        return errorResponse(errorTypes._404.admin_nf, 404);
      }

      const tenant = await this.tenantRepository.selectById(tenantId);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      const record = await this.adminTenantRepository.assign({
        admin_id: adminId,
        tenant_id: tenantId,
      });

      return successResponse(record, 201);
    } catch (error) {
      return errorResponse('500:ADMIN_TENANT_ASSIGN_ERROR', 500, error);
    }
  }

  async unassignAdmin(adminId: string, tenantId: string) {
    try {
      await this.adminTenantRepository.unassign(adminId, tenantId);
      return successResponse({ removed: true });
    } catch (error) {
      return errorResponse('500:ADMIN_TENANT_UNASSIGN_ERROR', 500, error);
    }
  }

  async findTenantsByAdmin(adminId: string) {
    try {
      const admin = await this.adminRepository.selectById(adminId);
      if (!admin) {
        return errorResponse(errorTypes._404.admin_nf, 404);
      }

      // Super admins see all tenants
      if (admin.role === EAdminRole.super_admin) {
        const tenants = await this.tenantRepository.selectAll();
        return successResponse(tenants);
      }

      const tenants = await this.adminTenantRepository.findTenantsByAdminId(adminId);
      return successResponse(tenants);
    } catch (error) {
      return errorResponse('500:ADMIN_TENANTS_NOT_LISTED', 500, error);
    }
  }

  async findAdminsByTenant(tenantId: string) {
    try {
      const tenant = await this.tenantRepository.selectById(tenantId);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      const admins = await this.adminTenantRepository.findAdminsByTenantId(tenantId);
      return successResponse(admins);
    } catch (error) {
      return errorResponse('500:TENANT_ADMINS_NOT_LISTED', 500, error);
    }
  }

  async deactivate(id: string) {
    try {
      const tenant = await this.tenantRepository.selectById(id);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      const deactivated = await this.tenantRepository.deactivate(id);
      return successResponse({
        id: deactivated.id,
        active: deactivated.active,
      });
    } catch (error) {
      return errorResponse('500:TENANT_NOT_DEACTIVATED', 500, error);
    }
  }

  async activate(id: string) {
    try {
      const tenant = await this.tenantRepository.selectById(id);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      const activated = await this.tenantRepository.activate(id);
      return successResponse({
        id: activated.id,
        active: activated.active,
      });
    } catch (error) {
      return errorResponse('500:TENANT_NOT_ACTIVATED', 500, error);
    }
  }

  async delete(id: string) {
    try {
      const tenant = await this.tenantRepository.selectById(id);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      await this.tenantRepository.delete(id);
      return successResponse({ deleted: true });
    } catch (error) {
      return errorResponse('500:TENANT_NOT_DELETED', 500, error);
    }
  }

  async updateAdminRole(adminId: string, tenantId: string, role: EAdminRole) {
    try {
      const admin = await this.adminRepository.selectById(adminId);
      if (!admin) {
        return errorResponse(errorTypes._404.admin_nf, 404);
      }

      const tenant = await this.tenantRepository.selectById(tenantId);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      const isInTenant = await this.adminTenantRepository.isAdminInTenant(adminId, tenantId);
      if (!isInTenant) {
        return errorResponse('404:ADMIN_NOT_IN_TENANT', 404);
      }

      const updated = await this.adminTenantRepository.updateRole(adminId, tenantId, role);
      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:ADMIN_TENANT_ROLE_NOT_UPDATED', 500, error);
    }
  }
}
