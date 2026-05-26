import { Controller, Get, Param, Post, Query, Res, UseGuards, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationTenantService } from '../../application/services/notification-tenant.service';

@ApiTags('Notifications (tenant admin)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('notifications/tenant')
export class NotificationTenantController {
  constructor(private readonly service: NotificationTenantService) {}

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current admin' })
  async unreadCount(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Headers('x-tenant-id') tenantId: string,
    @Res() res: Response,
  ) {
    const count = await this.service.getUnreadCount(tenantId, admin.admin_id);
    return res.status(200).json({ count });
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for tenant admin inbox' })
  async list(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Res() res: Response,
  ) {
    const result = await this.service.listForTenant(tenantId, admin.admin_id, Number(page), Number(limit));
    return res.status(200).json(result);
  }

  @Post('/:id/view')
  @ApiOperation({ summary: 'Mark notification as viewed' })
  async markViewed(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Headers('x-tenant-id') tenantId: string,
    @Res() res: Response,
  ) {
    await this.service.markAsViewed(id, tenantId, admin.admin_id);
    return res.status(200).json({ ok: true });
  }
}
