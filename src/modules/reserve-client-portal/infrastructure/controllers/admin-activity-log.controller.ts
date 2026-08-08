import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ActivityLogService } from '../../application/services/activity-log.service';
import { CreateActivityLogDto } from '../../application/dtos/activity-log.dto';
import { EActivityLogType } from '../../domain/enums/activity-log-type.enum';

@Controller('admin/hotel-portal/:tenantId/activities')
// O tenant vem do proprio caminho (`:tenantId`), entao o TenantGuard o resolve
// sem depender de header, valida que o admin pertence a ele e publica
// request.tenant_id - pre-requisito do ModuleAccessGuard.
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('client-portal')
@RequirePermissions('hotel-portal.activity-log.manage')
export class AdminActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateActivityLogDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.activityLogService.record(tenantId, {
      type: dto.type ?? EActivityLogType.MANUAL,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      icon: dto.icon,
      createdBy: admin.id,
    });
  }

  @Get()
  async list(
    @Param('tenantId') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.activityLogService.listByTenant(tenantId, Number(page), Number(limit));
  }
}
