import { Body, Controller, Get, Param, Patch, Res, UseGuards, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationSettingsService } from '../../application/services/notification-settings.service';
import { UpdateNotificationSettingsDTO } from '../../application/dtos';
import { NotificationSettingsResponseDto } from '../../application/dtos/notification-response.dto';

@ApiTags('Notification Settings')
@ApiBearerAuth()
// TenantGuard atende as duas formas de rota daqui: as proprias (`/`, via header
// x-tenant-id) e as de super_admin (`/:tenantId`, via route param — o guard
// resolve o param primeiro). O super_admin passa direto pelo ModuleAccessGuard,
// entao continua conseguindo administrar tenant com o modulo desligado.
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard)
@RequiresModule('notifications')
@Controller('notifications/settings')
export class NotificationSettingsController {
  constructor(private readonly service: NotificationSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get own tenant notification settings' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  async getOwn(@Headers('x-tenant-id') tenantId: string, @Res() res: Response) {
    const result = await this.service.getSettings(tenantId);
    return res.status(200).json(result);
  }

  @Patch()
  @ApiOperation({ summary: 'Update own tenant notification settings' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  async updateOwn(@Headers('x-tenant-id') tenantId: string, @Body() dto: UpdateNotificationSettingsDTO, @Res() res: Response) {
    const result = await this.service.updateSettings(tenantId, dto);
    return res.status(200).json(result);
  }

  @Get('/:tenantId')
  @RequirePermissions('notifications.platform.manage')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get any tenant notification settings (super_admin)' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  async getForTenant(@Param('tenantId', ParseCuidPipe) tenantId: string, @Res() res: Response) {
    const result = await this.service.getSettings(tenantId);
    return res.status(200).json(result);
  }

  @Patch('/:tenantId')
  @RequirePermissions('notifications.platform.manage')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update any tenant notification settings (super_admin)' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  async updateForTenant(@Param('tenantId', ParseCuidPipe) tenantId: string, @Body() dto: UpdateNotificationSettingsDTO, @Res() res: Response) {
    const result = await this.service.updateSettings(tenantId, dto);
    return res.status(200).json(result);
  }
}
