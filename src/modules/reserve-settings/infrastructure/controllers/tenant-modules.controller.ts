import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ModuleFlagsService } from '../../application/services/module-flags.service';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';

const MODULE_FLAGS_SCHEMA = {
  type: 'object' as const,
  additionalProperties: { type: 'boolean' as const },
  description:
    'Enabled/disabled flag for every gateable module, keyed by module name ' +
    `(${GATEABLE_MODULES.join(', ')})`,
  example: Object.fromEntries(GATEABLE_MODULES.map((module, i) => [module, i % 2 === 0])),
};

@ApiTags('Settings')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
@Controller('modules')
export class TenantModulesController {
  constructor(private readonly moduleFlags: ModuleFlagsService) {}

  @Get()
  @RequirePermissions('settings.modules.read')
  @ApiOperation({
    summary: 'Enabled modules for the current tenant',
    description: 'Dashboard reads this once at load to hide disabled modules',
  })
  @ApiOkResponse({ description: 'Module flags for the current tenant, keyed by module name', schema: MODULE_FLAGS_SCHEMA })
  async get(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.moduleFlags.getFlags(admin.tenant_id!);
  }
}
