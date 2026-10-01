import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { SettingsService } from '../../application/services/settings.service';
import { UpdateModuleSettingsDto } from '../../application/dtos/update-module-settings.dto';
import { SettingDescriptorResponseDto } from '../../application/dtos/settings-response.dto';

const MODULE_SETTINGS_SCHEMA = {
  type: 'object' as const,
  additionalProperties: true,
  description:
    'Merged settings for one module, keyed by setting key (camelCase). Value type varies per key ' +
    '(boolean, string, number, or arbitrary JSON) — see the module registry for the concrete shape.',
  example: { emailEnabled: true, inappEnabled: true, contactEmail: '' },
};

@ApiTags('Tenant Settings')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
@ApiExtraModels(SettingDescriptorResponseDto)
@Controller()
export class TenantSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'All settings', description: 'Every registered module and key with merged value, default, type, scope, description' })
  @ApiOkResponse({
    description:
      'Every registered module and key, with merged value, default, type, scope and description. ' +
      'Top level is keyed by module name; each module maps setting key (camelCase) to its descriptor.',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: { $ref: getSchemaPath(SettingDescriptorResponseDto) },
      },
      example: {
        notifications: {
          emailEnabled: {
            value: true,
            default: true,
            type: 'boolean',
            scope: 'tenant',
            description: 'Send notification emails to tenant admins',
          },
        },
      },
    },
  })
  async all(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.settingsService.describeAll(admin.tenant_id!);
  }

  @Get(':module')
  @RequirePermissions('settings.read')
  @ApiParam({ name: 'module', type: 'string', example: 'notifications' })
  @ApiOperation({ summary: 'One module settings (merged values only)' })
  @ApiOkResponse({ description: 'Merged settings for the module', schema: MODULE_SETTINGS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Unknown module' })
  async module(@CurrentAdmin() admin: CurrentAdminPayload, @Param('module') module: string) {
    return this.settingsService.getModule(admin.tenant_id!, module);
  }

  @Patch(':module')
  @RequirePermissions('settings.manage')
  @ApiParam({ name: 'module', type: 'string', example: 'notifications' })
  @ApiOperation({ summary: 'Update module settings', description: 'Partial: only provided keys are written. Unknown keys → 400, superadmin-scoped keys → 403.' })
  @ApiOkResponse({ description: 'Merged settings for the module after the update', schema: MODULE_SETTINGS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Unknown module, unknown setting key, or invalid value for a setting' })
  @ApiForbiddenResponse({ description: 'Setting is superadmin-scoped and not writable at tenant scope' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('module') module: string,
    @Body() dto: UpdateModuleSettingsDto,
  ) {
    for (const [key, value] of Object.entries(dto.values)) {
      await this.settingsService.set(admin.tenant_id!, module, key, value, admin.admin_id);
    }
    return this.settingsService.getModule(admin.tenant_id!, module);
  }
}
