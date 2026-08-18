import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import {
  CreatePolicyDto,
  CreatePriceRuleDto,
  CreateRatePlanDto,
  CreateSeasonDto,
  UpdatePolicyDto,
  UpdatePriceRuleDto,
  UpdateRatePlanDto,
  UpdateSeasonDto,
} from '../../application/dtos/tarifa.dto';
import { TarifaService } from '../../application/services/tarifa.service';

@Controller('motor/:tenantId/tarifas')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('motor')
export class MotorTarifaController {
  constructor(private readonly tarifaService: TarifaService) {}

  @Get()
  @RequirePermissions('motor.read')
  async overview(@Param('tenantId') tenantId: string) {
    return this.tarifaService.overview(tenantId);
  }

  @Post('seasons')
  @RequirePermissions('motor.settings.manage')
  async createSeason(@Param('tenantId') tenantId: string, @Body() dto: CreateSeasonDto) {
    return this.tarifaService.createSeason(tenantId, dto);
  }

  @Put('seasons/:id')
  @RequirePermissions('motor.settings.manage')
  async updateSeason(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSeasonDto,
  ) {
    return this.tarifaService.updateSeason(tenantId, id, dto);
  }

  @Delete('seasons/:id')
  @RequirePermissions('motor.settings.manage')
  async deleteSeason(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.tarifaService.deleteSeason(tenantId, id);
  }

  @Post('price-rules')
  @RequirePermissions('motor.settings.manage')
  async createPriceRule(@Param('tenantId') tenantId: string, @Body() dto: CreatePriceRuleDto) {
    return this.tarifaService.createPriceRule(tenantId, dto);
  }

  @Put('price-rules/:id')
  @RequirePermissions('motor.settings.manage')
  async updatePriceRule(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePriceRuleDto,
  ) {
    return this.tarifaService.updatePriceRule(tenantId, id, dto);
  }

  @Delete('price-rules/:id')
  @RequirePermissions('motor.settings.manage')
  async deletePriceRule(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.tarifaService.deletePriceRule(tenantId, id);
  }

  @Post('policies')
  @RequirePermissions('motor.settings.manage')
  async createPolicy(@Param('tenantId') tenantId: string, @Body() dto: CreatePolicyDto) {
    return this.tarifaService.createPolicy(tenantId, dto);
  }

  @Put('policies/:id')
  @RequirePermissions('motor.settings.manage')
  async updatePolicy(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.tarifaService.updatePolicy(tenantId, id, dto);
  }

  @Post('rate-plans')
  @RequirePermissions('motor.settings.manage')
  async createRatePlan(@Param('tenantId') tenantId: string, @Body() dto: CreateRatePlanDto) {
    return this.tarifaService.createRatePlan(tenantId, dto);
  }

  @Put('rate-plans/:id')
  @RequirePermissions('motor.settings.manage')
  async updateRatePlan(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRatePlanDto,
  ) {
    return this.tarifaService.updateRatePlan(tenantId, id, dto);
  }
}
