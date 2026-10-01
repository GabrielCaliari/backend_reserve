import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ModuleFlagsService } from '../../application/services/module-flags.service';
import { UpdateTenantModulesDto } from '../../application/dtos/update-tenant-modules.dto';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';

const MODULE_FLAGS_SCHEMA = {
  type: 'object' as const,
  additionalProperties: { type: 'boolean' as const },
  description:
    'Enabled/disabled flag for every gateable module, keyed by module name ' +
    `(${GATEABLE_MODULES.join(', ')})`,
  example: Object.fromEntries(GATEABLE_MODULES.map((module, i) => [module, i % 2 === 0])),
};

// Platform-level: superadmin addresses any tenant by route param — deliberately NO TenantGuard.
@ApiTags('Superadmin Modules')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('settings.modules.manage')
@Controller('tenants/:tenantId/modules')
export class SuperadminModulesController {
  constructor(private readonly moduleFlags: ModuleFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Module flags for a tenant (superadmin)' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiOkResponse({ description: 'Module flags for the tenant, keyed by module name', schema: MODULE_FLAGS_SCHEMA })
  async get(@Param('tenantId') tenantId: string) {
    return this.moduleFlags.getFlags(tenantId);
  }

  @Patch()
  @ApiOperation({ summary: 'Enable/disable modules for a tenant (superadmin)' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiOkResponse({ description: 'Updated module flags for the tenant, keyed by module name', schema: MODULE_FLAGS_SCHEMA })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiBadRequestResponse({ description: 'Unknown module name, non-boolean flag, or master tenant modules cannot be overridden' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantModulesDto,
  ) {
    return this.moduleFlags.setFlags(tenantId, dto.modules as any, admin.admin_id);
  }
}
