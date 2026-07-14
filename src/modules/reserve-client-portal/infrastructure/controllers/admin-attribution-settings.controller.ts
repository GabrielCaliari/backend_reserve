import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AttributionSettingsService } from '../../application/services/attribution-settings.service';
import { UpdateAttributionSettingsDto } from '../../application/dtos/attribution-settings.dto';

@Controller('admin/hotel-portal/:tenantId/attribution-settings')
@UseGuards(AdminJwtGuard, PermissionsGuard)
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
