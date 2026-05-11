import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationService } from '../../application/services/notification.service';
import { CreateNotificationDTO, UpdateNotificationDTO, ListNotificationsQueryDTO } from '../../application/dtos';

@ApiTags('Notifications (super_admin)')
@ApiBearerAuth()
@RequirePermissions('notifications.platform.manage')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create notification draft (super_admin)' })
  async create(@Body() dto: CreateNotificationDTO, @CurrentAdmin() admin: CurrentAdminPayload, @Res() res: Response) {
    const result = await this.service.create(dto, admin.admin_id);
    return res.status(201).json(result);
  }

  @Post('/:id/publish')
  @ApiOperation({ summary: 'Publish notification draft (super_admin)' })
  async publish(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.service.publish(id);
    return res.status(200).json(result);
  }

  @Get()
  @ApiOperation({ summary: 'List all notifications (super_admin)' })
  async list(@Query() query: ListNotificationsQueryDTO, @Res() res: Response) {
    const result = await this.service.list(query);
    return res.status(200).json(result);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get notification by ID (super_admin)' })
  async findById(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.service.findById(id);
    return res.status(200).json(result);
  }

  @Patch('/:id')
  @ApiOperation({ summary: 'Update notification draft (super_admin)' })
  async update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateNotificationDTO, @Res() res: Response) {
    const result = await this.service.update(id, dto);
    return res.status(200).json(result);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete notification draft (super_admin)' })
  async delete(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    await this.service.delete(id);
    return res.status(204).send();
  }
}
