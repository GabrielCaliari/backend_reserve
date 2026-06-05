import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { SettingsService } from '../../application/services/settings.service';
import { UpdateModuleSettingsDto } from '../../application/dtos/update-module-settings.dto';

const MODULE_SETTINGS_SCHEMA = {
  type: 'object' as const,
  additionalProperties: true,
  description:
    'Merged settings for one module, keyed by setting key (camelCase). Value type varies per key ' +
    '(boolean, string, number, or arbitrary JSON) — see the module registry for the concrete shape.',
  example: { emailEnabled: true, inappEnabled: true, contactEmail: '' },
};

// Platform-level: superadmin addresses any tenant by route param — deliberately NO TenantGuard.
@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('settings.modules.manage')
@Controller('tenants/:tenantId')
export class SuperadminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':module')
  @ApiOperation({ summary: 'One module settings for any tenant (superadmin, merged values only)' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiParam({ name: 'module', type: 'string', example: 'notifications' })
  @ApiOkResponse({ description: 'Merged settings for the module', schema: MODULE_SETTINGS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Unknown module' })
  async module(@Param('tenantId') tenantId: string, @Param('module') module: string) {
    return this.settingsService.getModule(tenantId, module);
  }

  @Patch(':module')
  @ApiOperation({ summary: 'Update module settings for any tenant (superadmin)', description: 'Partial: only provided keys are written. Unknown keys → 400.' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiParam({ name: 'module', type: 'string', example: 'notifications' })
  @ApiOkResponse({ description: 'Merged settings for the module after the update', schema: MODULE_SETTINGS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Unknown module, unknown setting key, or invalid value for a setting' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('tenantId') tenantId: string,
    @Param('module') module: string,
    @Body() dto: UpdateModuleSettingsDto,
  ) {
    for (const [key, value] of Object.entries(dto.values)) {
      await this.settingsService.setAsSuperadmin(tenantId, module, key, value, admin.admin_id);
    }
    return this.settingsService.getModule(tenantId, module);
  }
}
