import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { ManageTenantBillingConfigUseCase } from '../../application/use-cases/manage-tenant-billing-config.use-case';
import {
  CreateTenantBillingConfigDTO,
  UpdateTenantBillingConfigDTO,
  TenantBillingConfigResponseDTO,
} from '../../application/dtos/tenant-billing-config.dto';
import { AdminJwtGuard, TenantGuard } from '../../../../shared/auth/guards';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';

@ApiTags('Payments - Billing Config')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
@Controller('payments/billing-config')
export class TenantBillingConfigController {
  constructor(
    private readonly manageBillingConfig: ManageTenantBillingConfigUseCase,
  ) {}

  @Get('/')
  @RequirePermissions('billing-config.read')
  @ApiOperation({
    summary: 'Get billing config for the current tenant',
    description:
      'Returns the billing configuration for the tenant. Stripe secret keys are never returned — only a boolean indicating whether they are set.',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing config found',
    type: TenantBillingConfigResponseDTO,
  })
  @ApiResponse({ status: 404, description: 'No billing config found for this tenant' })
  async get(@Req() req: any): Promise<TenantBillingConfigResponseDTO> {
    const config = await this.manageBillingConfig.getByTenantId(req.tenant_id);
    if (!config) {
      throw new NotFoundException('No billing config found for this tenant.');
    }
    return config;
  }

  @Post('/')
  @RequirePermissions('billing-config.manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create billing config for the current tenant',
    description:
      'Creates the billing configuration. Each tenant can have only one config. ' +
      'Stripe secret keys are encrypted at rest and never returned in responses.',
  })
  @ApiResponse({
    status: 201,
    description: 'Billing config created',
    type: TenantBillingConfigResponseDTO,
  })
  @ApiResponse({ status: 409, description: 'Billing config already exists — use PATCH to update' })
  async create(
    @Req() req: any,
    @Body() dto: CreateTenantBillingConfigDTO,
  ): Promise<TenantBillingConfigResponseDTO> {
    return this.manageBillingConfig.create(req.tenant_id, dto);
  }

  @Patch('/')
  @RequirePermissions('billing-config.manage')
  @ApiOperation({
    summary: 'Update billing config for the current tenant',
    description:
      'Partially updates the billing configuration. Only provided fields are updated. ' +
      'To rotate a Stripe key, simply send the new value — it will be re-encrypted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing config updated',
    type: TenantBillingConfigResponseDTO,
  })
  @ApiResponse({ status: 404, description: 'Billing config not found' })
  async update(
    @Req() req: any,
    @Body() dto: UpdateTenantBillingConfigDTO,
  ): Promise<TenantBillingConfigResponseDTO> {
    return this.manageBillingConfig.update(req.tenant_id, dto);
  }

  @Delete('/')
  @RequirePermissions('billing-config.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete billing config for the current tenant',
    description: 'Removes the billing configuration. This does NOT cancel active subscriptions.',
  })
  @ApiResponse({ status: 204, description: 'Billing config deleted' })
  @ApiResponse({ status: 404, description: 'Billing config not found' })
  async delete(@Req() req: any): Promise<void> {
    return this.manageBillingConfig.delete(req.tenant_id);
  }
}
