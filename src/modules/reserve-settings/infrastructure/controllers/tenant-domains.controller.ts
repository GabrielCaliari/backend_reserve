import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { TenantDomainsService } from '../../application/services/tenant-domains.service';
import {
  CreateTenantDomainDto,
  TenantDomainResponseDto,
  UpdateTenantDomainDto,
} from '../../application/dtos/tenant-domain.dto';

// Platform-level: superadmin addresses any tenant by route param — deliberately NO TenantGuard.
@ApiTags('Tenant Domains')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('settings.domains.manage')
@Controller('tenants/:tenantId/domains')
export class TenantDomainsController {
  constructor(private readonly domains: TenantDomainsService) {}

  @Get()
  @ApiOperation({ summary: 'List CORS domains registered for a tenant' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiOkResponse({ type: [TenantDomainResponseDto] })
  list(@Param('tenantId') tenantId: string) {
    return this.domains.list(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Register a CORS domain for a tenant' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiOkResponse({ type: TenantDomainResponseDto })
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateTenantDomainDto) {
    return this.domains.create(tenantId, dto);
  }

  @Patch(':domainId')
  @ApiOperation({ summary: 'Update (activate/deactivate, set primary) a tenant CORS domain' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiParam({ name: 'domainId', type: 'string' })
  @ApiOkResponse({ type: TenantDomainResponseDto })
  update(
    @Param('tenantId') tenantId: string,
    @Param('domainId', ParseCuidPipe) domainId: string,
    @Body() dto: UpdateTenantDomainDto,
  ) {
    return this.domains.update(tenantId, domainId, dto);
  }

  @Delete(':domainId')
  @ApiOperation({ summary: 'Remove a tenant CORS domain' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiParam({ name: 'domainId', type: 'string' })
  remove(@Param('tenantId') tenantId: string, @Param('domainId', ParseCuidPipe) domainId: string) {
    return this.domains.remove(tenantId, domainId);
  }
}
