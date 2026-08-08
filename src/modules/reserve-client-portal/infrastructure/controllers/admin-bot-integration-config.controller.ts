import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { BotIntegrationConfigService } from '../../application/services/bot-integration-config.service';
import {
  CreateBotIntegrationConfigDto,
  UpdateBotIntegrationConfigDto,
} from '../../application/dtos/bot-integration-config.dto';

@Controller('admin/hotel-portal/:tenantId/bot-integration-config')
// O tenant vem do proprio caminho (`:tenantId`), entao o TenantGuard o resolve
// sem depender de header, valida que o admin pertence a ele e publica
// request.tenant_id - pre-requisito do ModuleAccessGuard.
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('client-portal')
@RequirePermissions('hotel-portal.bot-integration.manage')
export class AdminBotIntegrationConfigController {
  constructor(private readonly botIntegrationConfigService: BotIntegrationConfigService) {}

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateBotIntegrationConfigDto,
  ) {
    return this.botIntegrationConfigService.create(tenantId, dto);
  }

  @Get()
  async findOne(@Param('tenantId') tenantId: string) {
    return this.botIntegrationConfigService.findByTenant(tenantId);
  }

  @Patch()
  async update(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateBotIntegrationConfigDto,
  ) {
    return this.botIntegrationConfigService.update(tenantId, dto);
  }

  @Patch('regenerate-key')
  async regenerateKey(@Param('tenantId') tenantId: string) {
    return this.botIntegrationConfigService.regenerateKey(tenantId);
  }

  @Patch('deactivate')
  async deactivate(@Param('tenantId') tenantId: string) {
    return this.botIntegrationConfigService.deactivate(tenantId);
  }

  @Patch('reactivate')
  async reactivate(@Param('tenantId') tenantId: string) {
    return this.botIntegrationConfigService.reactivate(tenantId);
  }
}
