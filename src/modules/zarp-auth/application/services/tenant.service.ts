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
import {
  CreateTenantDTO,
  ScheduleTenantDeletionDTO,
  UpdateTenantDTO,
} from '../dtos/tenant-management.dto';

const TENANT_DELETION_RETENTION_DAYS = 15;

function isTenantScopedRole(role: EAdminRole): boolean {
  return [EAdminRole.owner, EAdminRole.manager, EAdminRole.editor, EAdminRole.viewer].includes(role);
}

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

  async findAll(page = 1, limit = 20) {
    try {
      const { data, total } = await this.tenantRepository.selectAllPaginated(page, limit);
      return successResponse({
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
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

      if (!admin.active) {
        return errorResponse('400:ADMIN_ACCOUNT_DEACTIVATED', 400);
      }

      const tenant = await this.tenantRepository.selectById(tenantId);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      if (!tenant.active || tenant.deletion_scheduled_for_at) {
        return errorResponse('409:TENANT_NOT_AVAILABLE_FOR_ASSIGNMENT', 409);
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

  async findTenantsByAdmin(adminId: string, page = 1, limit = 20) {
    try {
      const admin = await this.adminRepository.selectById(adminId);
      if (!admin) {
        return errorResponse(errorTypes._404.admin_nf, 404);
      }

      let data: any[];
      let total: number;

      if (admin.role === EAdminRole.super_admin) {
        const result = await this.tenantRepository.selectAllPaginated(page, limit);
        data = result.data;
        total = result.total;
      } else {
        const result = await this.adminTenantRepository.findTenantsByAdminIdPaginated(adminId, page, limit);
        data = result.data;
        total = result.total;
      }

      return successResponse({
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return errorResponse('500:ADMIN_TENANTS_NOT_LISTED', 500, error);
    }
  }

  async findAdminsByTenant(tenantId: string, page = 1, limit = 20) {
    try {
      const tenant = await this.tenantRepository.selectById(tenantId);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      const { data, total } = await this.adminTenantRepository.findAdminsByTenantIdPaginated(tenantId, page, limit);
      return successResponse({
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
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

      if (tenant.deletion_scheduled_for_at) {
        return errorResponse('409:TENANT_DELETION_ALREADY_SCHEDULED_USE_RESTORE', 409);
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

  async scheduleDeletion(id: string, adminId: string, dto?: ScheduleTenantDeletionDTO) {
    try {
      const tenant = await this.tenantRepository.selectById(id);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      if (tenant.deletion_scheduled_for_at) {
        return errorResponse('409:TENANT_DELETION_ALREADY_SCHEDULED', 409);
      }

      const deletionRequestedAt = new Date();
      const deletionScheduledForAt = new Date(deletionRequestedAt);
      deletionScheduledForAt.setDate(deletionScheduledForAt.getDate() + TENANT_DELETION_RETENTION_DAYS);

      const scheduled = await this.tenantRepository.scheduleDeletion(id, {
        archived_at: deletionRequestedAt,
        deletion_requested_at: deletionRequestedAt,
        deletion_scheduled_for_at: deletionScheduledForAt,
        deletion_requested_by: adminId,
        deletion_reason: dto?.reason ?? null,
      });

      return successResponse({
        id: scheduled.id,
        active: scheduled.active,
        archived_at: scheduled.archived_at,
        deletion_requested_at: scheduled.deletion_requested_at,
        deletion_scheduled_for_at: scheduled.deletion_scheduled_for_at,
        deletion_requested_by: scheduled.deletion_requested_by,
        deletion_reason: scheduled.deletion_reason,
        scheduled_for_deletion: true,
      });
    } catch (error) {
      return errorResponse('500:TENANT_DELETION_NOT_SCHEDULED', 500, error);
    }
  }

  async restoreDeletion(id: string) {
    try {
      const tenant = await this.tenantRepository.selectById(id);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      if (!tenant.deletion_scheduled_for_at) {
        return errorResponse('409:TENANT_DELETION_NOT_SCHEDULED', 409);
      }

      const restored = await this.tenantRepository.restoreDeletion(id);
      return successResponse(restored);
    } catch (error) {
      return errorResponse('500:TENANT_DELETION_NOT_RESTORED', 500, error);
    }
  }

  async getDeletionStatus(id: string) {
    try {
      const tenant = await this.tenantRepository.selectById(id);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      return successResponse({
        id: tenant.id,
        active: tenant.active,
        scheduled_for_deletion: tenant.deletion_scheduled_for_at !== null,
        archived_at: tenant.archived_at,
        deletion_requested_at: tenant.deletion_requested_at,
        deletion_scheduled_for_at: tenant.deletion_scheduled_for_at,
        deletion_requested_by: tenant.deletion_requested_by,
        deletion_reason: tenant.deletion_reason,
      });
    } catch (error) {
      return errorResponse('500:TENANT_DELETION_STATUS_NOT_AVAILABLE', 500, error);
    }
  }

  async purgeDueTenants(now = new Date()) {
    const dueTenants = await this.tenantRepository.findDueForDeletion(now);

    for (const tenant of dueTenants) {
      await this.tenantRepository.delete(tenant.id);
    }

    return dueTenants.length;
  }

  async updateAdminRole(adminId: string, tenantId: string, role: EAdminRole) {
    try {
      if (!isTenantScopedRole(role)) {
        return errorResponse('400:INVALID_TENANT_ROLE', 400);
      }

      const admin = await this.adminRepository.selectById(adminId);
      if (!admin) {
        return errorResponse(errorTypes._404.admin_nf, 404);
      }

      const tenant = await this.tenantRepository.selectById(tenantId);
      if (!tenant) {
        return errorResponse('404:TENANT_NOT_FOUND', 404);
      }

      if (!tenant.active || tenant.deletion_scheduled_for_at) {
        return errorResponse('409:TENANT_NOT_AVAILABLE_FOR_ROLE_UPDATE', 409);
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
