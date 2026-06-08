import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { GetTenantCapabilitiesUseCase } from '../../application/use-cases/get-tenant-capabilities.use-case';
import {
  ModuleResolutionResponseDto,
  TenantCapabilitiesResponseDto,
} from '../../application/dtos/tenant-capabilities-response.dto';

@ApiTags('Tenant Management')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active tenant ID' })
@ApiExtraModels(ModuleResolutionResponseDto)
@UseGuards(AdminJwtGuard, TenantGuard)
@Controller('tenant-capabilities')
export class TenantCapabilitiesController {
  constructor(private readonly getTenantCapabilities: GetTenantCapabilitiesUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Get effective capabilities for the active tenant and admin',
    description:
      'Returns tenant type, resolved module availability with inheritance source, and the caller effective permissions.',
  })
  @ApiOkResponse({
    description: 'Effective tenant capabilities for the caller',
    type: TenantCapabilitiesResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiForbiddenResponse({
    description: 'Tenant is inactive, admin account is inactive/not found, or admin has no role in this tenant',
  })
  get(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.getTenantCapabilities.execute(admin.admin_id, admin.tenant_id!);
  }
}
