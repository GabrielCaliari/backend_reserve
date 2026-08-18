import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import {
  ConnectChannelAdminDto,
  Reconcile2xDto,
  SaveRoomMapDto,
} from '../../application/dtos/channel-admin.dto';
import { ChannelAdminService } from '../../application/services/channel-admin.service';

/**
 * API admin de canais (spec §5, tela /dashboard/motor/canais). Mesma cadeia
 * de guards dos demais controllers admin do motor. Nenhuma rota devolve
 * refresh token; o webhook_secret aparece SO na resposta do connect.
 */
@Controller('motor/:tenantId/canais')
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('motor')
export class MotorChannelController {
  constructor(private readonly channelAdminService: ChannelAdminService) {}

  @Get()
  @RequirePermissions('motor.read')
  async overview(@Param('tenantId') tenantId: string) {
    return this.channelAdminService.overview(tenantId);
  }

  @Post('connect')
  @RequirePermissions('motor.settings.manage')
  async connect(@Param('tenantId') tenantId: string, @Body() dto: ConnectChannelAdminDto) {
    return this.channelAdminService.connect(tenantId, dto);
  }

  @Put('room-map')
  @RequirePermissions('motor.settings.manage')
  async saveRoomMap(@Param('tenantId') tenantId: string, @Body() dto: SaveRoomMapDto) {
    return this.channelAdminService.saveRoomMap(tenantId, dto.map);
  }

  @Put('reconcile-2x')
  @RequirePermissions('motor.settings.manage')
  async setReconcile2x(@Param('tenantId') tenantId: string, @Body() dto: Reconcile2xDto) {
    return this.channelAdminService.setReconcile2x(tenantId, dto.enabled);
  }

  @Post('reconcile')
  @RequirePermissions('motor.reservations.manage')
  async reconcileNow(@Param('tenantId') tenantId: string) {
    return this.channelAdminService.reconcileNow(tenantId);
  }
}
