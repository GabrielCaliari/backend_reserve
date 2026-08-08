import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { AttributionSettingsService } from '../../application/services/attribution-settings.service';
import { UpdateAttributionSettingsDto } from '../../application/dtos/attribution-settings.dto';

@Controller('admin/hotel-portal/:tenantId/attribution-settings')
// O tenant vem do proprio caminho (`:tenantId`), entao o TenantGuard o resolve
// sem depender de header, valida que o admin pertence a ele e publica
// request.tenant_id - pre-requisito do ModuleAccessGuard.
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('client-portal')
@RequirePermissions('hotel-portal.attribution.manage')
export class AdminAttributionSettingsController {
  constructor(private readonly attributionSettingsService: AttributionSettingsService) {}

  @Get()
  async getSettings(@Param('tenantId') tenantId: string) {
    return this.attributionSettingsService.getOrDefault(tenantId);
  }

  @Put()
  async updateSettings(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateAttributionSettingsDto,
  ) {
    return this.attributionSettingsService.upsert(tenantId, dto);
  }
}
