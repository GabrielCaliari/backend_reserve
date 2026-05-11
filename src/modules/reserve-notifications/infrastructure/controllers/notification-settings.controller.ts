import { Body, Controller, Get, Param, Patch, Res, UseGuards, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationSettingsService } from '../../application/services/notification-settings.service';
import { UpdateNotificationSettingsDTO } from '../../application/dtos';

@ApiTags('Notification Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('notifications/settings')
export class NotificationSettingsController {
  constructor(private readonly service: NotificationSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get own tenant notification settings' })
  async getOwn(@Headers('x-tenant-id') tenantId: string, @Res() res: Response) {
    const result = await this.service.getSettings(tenantId);
    return res.status(200).json(result);
  }

  @Patch()
  @ApiOperation({ summary: 'Update own tenant notification settings' })
  async updateOwn(@Headers('x-tenant-id') tenantId: string, @Body() dto: UpdateNotificationSettingsDTO, @Res() res: Response) {
    const result = await this.service.updateSettings(tenantId, dto);
    return res.status(200).json(result);
  }

  @Get('/:tenantId')
  @RequirePermissions('notifications.platform.manage')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get any tenant notification settings (super_admin)' })
  async getForTenant(@Param('tenantId', ParseCuidPipe) tenantId: string, @Res() res: Response) {
    const result = await this.service.getSettings(tenantId);
    return res.status(200).json(result);
  }

  @Patch('/:tenantId')
  @RequirePermissions('notifications.platform.manage')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update any tenant notification settings (super_admin)' })
  async updateForTenant(@Param('tenantId', ParseCuidPipe) tenantId: string, @Body() dto: UpdateNotificationSettingsDTO, @Res() res: Response) {
    const result = await this.service.updateSettings(tenantId, dto);
    return res.status(200).json(result);
  }
}
