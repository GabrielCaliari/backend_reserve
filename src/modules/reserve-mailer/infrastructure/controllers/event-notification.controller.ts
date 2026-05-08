import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { EventNotificationService } from '../../application/services/event-notification.service';
import { CreateEventNotificationDTO, CreateEventNotificationEventDTO, CreateEventNotificationEventParam, IdEventNotificationEventParam, IdNotificationEventNotificationEventParam } from '../../application/dtos/event-notification.dto';
import { Request, Response } from 'express';
import { AdminJwtGuard } from '../../../../shared/auth/guards';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Event Notification (SMS)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@Controller()
export class EventNotificationController {
    constructor(
        private eventNotificationService: EventNotificationService,
    ) { }

    @Post('/sms/create')
    @RequirePermissions('mailer.sms.create')
    @ApiOperation({ summary: 'Create SMS notification', description: 'Creates a new SMS notification and returns a unique webhook UUID' })
    @ApiResponse({ status: 200, description: 'SMS notification created successfully' })
    @ApiResponse({ status: 500, description: 'Failed to create SMS notification' })
    async createSMSNotification(
        @Req() req: Request,
        @Res() res: Response,
        @Body() data: CreateEventNotificationDTO
    ) {
        const response = await this.eventNotificationService.createSMSNotification({
            name: data.name
        });

        return res.status(response.status).json(response.data);
    }

    @Get('/sms')
    @RequirePermissions('mailer.sms.read')
    @ApiOperation({ summary: 'List SMS notifications', description: 'Returns all registered SMS notifications' })
    @ApiResponse({ status: 200, description: 'SMS notification list' })
    @ApiResponse({ status: 500, description: 'Failed to fetch notifications' })
    async findSMSNotification(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const response = await this.eventNotificationService.findSMSNotification();

        return res.status(response.status).json(response.data);
    }

    @Post('/sms/webhook/:uuid')
    @RequirePermissions('mailer.sms.send')
    @ApiOperation({ summary: 'Send SMS via webhook', description: 'Sends an SMS through the notification webhook. Supports templates with dynamic parameters.' })
    @ApiParam({ name: 'uuid', description: 'Notification webhook UUID', type: 'string' })
    @ApiResponse({ status: 200, description: 'SMS sent successfully' })
    @ApiResponse({ status: 404, description: 'Webhook not found' })
    @ApiResponse({ status: 500, description: 'Failed to send SMS' })
    async createSMSNotificationEvent(
        @Res() res: Response,
        @Body() data: CreateEventNotificationEventDTO,
        @Param() params: CreateEventNotificationEventParam
    ) {
        const response = await this.eventNotificationService.createSMSNotificationEvent({
            destination_number: data.destination_number,
            message: data.message,
            message_params: data.message_params,
            sender_number: data.sender_number,
            uuid: params.uuid
        });

        return res.status(response.status).json(response.data);
    }

    @Get('/sms/webhook/:id_notification')
    @RequirePermissions('mailer.sms.read')
    @ApiOperation({ summary: 'List events by notification', description: 'Returns all SMS events for a specific notification' })
    @ApiParam({ name: 'id_notification', description: 'SMS notification ID', type: 'string' })
    @ApiResponse({ status: 200, description: 'SMS event list' })
    @ApiResponse({ status: 500, description: 'Failed to fetch events' })
    async findByIdNotificationSMSNotificationEvent(
        @Res() res: Response,
        @Param() { id_notification }: IdNotificationEventNotificationEventParam
    ) {
        const response = await this.eventNotificationService.findByIdNotificationSMSNotificationEvent({ id_notification });

        return res.status(response.status).json(response.data);
    }

    @Get('/sms/:id')
    @RequirePermissions('mailer.sms.read')
    @ApiOperation({ summary: 'Get SMS notification by ID', description: 'Returns a specific SMS notification by ID' })
    @ApiParam({ name: 'id', description: 'SMS notification ID', type: 'string' })
    @ApiResponse({ status: 200, description: 'SMS notification found' })
    @ApiResponse({ status: 404, description: 'SMS notification not found' })
    @ApiResponse({ status: 500, description: 'Failed to fetch notification' })
    async findByIdSMSNotification(
        @Req() req: Request,
        @Res() res: Response,
        @Param() { id }: IdEventNotificationEventParam
    ) {
        const response = await this.eventNotificationService.findByIdSMSNotification({ id });
        return res.status(response.status).json(response.data);
    }
}
