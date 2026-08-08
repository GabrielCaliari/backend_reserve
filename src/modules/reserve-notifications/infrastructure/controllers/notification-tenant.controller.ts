import { Controller, Get, Param, Post, Query, Res, UseGuards, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationTenantService } from '../../application/services/notification-tenant.service';
import {
  OkResponseDto,
  PaginatedTenantNotificationsResponseDto,
  UnreadCountResponseDto,
} from '../../application/dtos/notification-response.dto';

@ApiTags('Notifications (tenant admin)')
@ApiBearerAuth()
// Inbox do admin do tenant: TenantGuard resolve o x-tenant-id que os handlers ja
// liam a mao e publica request.tenant_id, sem o qual o ModuleAccessGuard nao
// consegue resolver a politica do modulo.
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard)
@RequiresModule('notifications')
@Controller('notifications/tenant')
export class NotificationTenantController {
  constructor(private readonly service: NotificationTenantService) {}

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current admin' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
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
  @ApiOkResponse({ type: PaginatedTenantNotificationsResponseDto })
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
  @ApiOkResponse({ type: OkResponseDto })
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
