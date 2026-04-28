import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { UserJwtGuard } from '../../../../shared/auth/guards/user-jwt.guard';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { CreateStripePlanUseCase } from '../../application/use-cases/create-stripe-plan.use-case';
import { ArchiveStripePlanUseCase } from '../../application/use-cases/archive-stripe-plan.use-case';
import { ListStripePlansUseCase } from '../../application/use-cases/list-stripe-plans.use-case';
import { UpdateStripePlanUseCase } from '../../application/use-cases/update-stripe-plan.use-case';
import { CreateStripePlanDTO, UpdateStripePlanDTO, StripePlanResponseDTO } from '../../application/dtos/stripe-plan.dto';
import { StripePlanPresenter } from '../presenters/stripe-plan.presenter';

@ApiTags('Plans')
@Controller('plans')
export class StripePlansController {
  constructor(
    private readonly createStripePlanUseCase: CreateStripePlanUseCase,
    private readonly archiveStripePlanUseCase: ArchiveStripePlanUseCase,
    private readonly listStripePlansUseCase: ListStripePlansUseCase,
    private readonly updateStripePlanUseCase: UpdateStripePlanUseCase,
  ) {}

  // ─── Admin endpoints ────────────────────────────────────────────────────────

  @Get('admin/list')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all plans (admin)',
    description: 'Returns all plans including inactive ones from Stripe API using tenant-specific keys. Requires x-tenant-id header with the selected tenant.',
  })
  @ApiResponse({ status: 200, description: 'Plans listed', type: [StripePlanResponseDTO] })
  @ApiResponse({ status: 400, description: 'Missing x-tenant-id header or tenant not configured' })
  async adminListPlans(
    @Headers('x-tenant-id') tenantId: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ): Promise<StripePlanResponseDTO[]> {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required. Please select a tenant.');
    }

    // CRITICAL FIX: Now uses tenant_id from header (selected tenant), not from admin token
    const plans = await this.listStripePlansUseCase.executeAdmin(tenantId);
    return StripePlanPresenter.toResponseList(plans);
  }

  @Post('admin/create')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a plan (admin)',
    description:
      'Creates a Stripe Product + recurring Price via the Stripe API, ' +
      'then persists the plan locally. ' +
      'If trial_days > 0 and credits_released_trial_period > 0, a free trial price is also created.',
  })
  @ApiResponse({ status: 201, description: 'Plan created', type: StripePlanResponseDTO })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  @ApiResponse({ status: 400, description: 'Invalid billing_interval or Stripe error' })
  async adminCreatePlan(@Body() dto: CreateStripePlanDTO): Promise<StripePlanResponseDTO> {
    const plan = await this.createStripePlanUseCase.execute(dto);
    return StripePlanPresenter.toResponse(plan);
  }

  @Patch('admin/:id')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update plan metadata (admin)',
    description:
      'Updates local metadata only (name, description, credits, limits). ' +
      'Stripe IDs are immutable — changing them would break active subscriptions.',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan updated', type: StripePlanResponseDTO })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async adminUpdatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateStripePlanDTO,
  ): Promise<StripePlanResponseDTO> {
    const plan = await this.updateStripePlanUseCase.execute(id, dto);
    return StripePlanPresenter.toResponse(plan);
  }

  @Delete('admin/:id')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive a plan (admin)',
    description:
      'Archives the plan in Stripe (sets active=false on product and prices) ' +
      'and marks it as inactive locally. ' +
      'Never deletes — preserves billing history for existing subscribers. ' +
      'Requires tenant_id as query parameter to resolve the Stripe secret key.',
  })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan archived', schema: { example: { archived: true } } })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 400, description: 'Stripe secret key not configured for this tenant' })
  async adminArchivePlan(
    @Param('id') id: string,
    @Query('tenant_id') tenantId: string,
  ): Promise<{ archived: boolean }> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id query parameter is required');
    }
    return this.archiveStripePlanUseCase.execute(id, tenantId);
  }

  // ─── Public endpoint ────────────────────────────────────────────────────────

  @Get('list')
  @UseGuards(UserJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List active plans (user)',
    description: 'Returns only active plans. Used by the frontend to render the pricing page. Requires x-tenant-id header.',
  })
  @ApiResponse({ status: 200, description: 'Active plans listed', type: [StripePlanResponseDTO] })
  @ApiResponse({ status: 400, description: 'Missing x-tenant-id header' })
  async listActivePlans(@Headers('x-tenant-id') tenantId: string): Promise<StripePlanResponseDTO[]> {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required. Please select a tenant.');
    }

    const plans = await this.listStripePlansUseCase.executePublic(tenantId);
    return StripePlanPresenter.toResponseList(plans);
  }
}
