import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { EventNotificationService } from './event-notification.service';
import { CreateEventNotificationDTO, CreateEventNotificationEventDTO, CreateEventNotificationEventParam, IdEventNotificationEventParam, IdNotificationEventNotificationEventParam } from './event-notification.dto';
import { Request, Response } from 'express';
import { AdminValidateJwtTokenGuard } from 'src/common/guards/admin-validate-jwt-token/admin-validate-jwt-token.guard';

@Controller()
export class EventNotificationController {
    constructor(
        private eventNotificationService: EventNotificationService,
    ) { }

    @Post('/sms/create')
    @UseGuards(AdminValidateJwtTokenGuard)
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
    @UseGuards(AdminValidateJwtTokenGuard)
    async findSMSNotification(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const response = await this.eventNotificationService.findSMSNotification();

        return res.status(response.status).json(response.data);
    }

    @Post('/sms/webhook/:uuid')
    @UseGuards(AdminValidateJwtTokenGuard)
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
    @UseGuards(AdminValidateJwtTokenGuard)
    async findByIdNotificationSMSNotificationEvent(
        @Res() res: Response,
        @Param() { id_notification }: IdNotificationEventNotificationEventParam
    ) {
        const response = await this.eventNotificationService.findByIdNotificationSMSNotificationEvent({ id_notification });

        return res.status(response.status).json(response.data);
    }

    @Get('/sms/:id')
    @UseGuards(AdminValidateJwtTokenGuard)
    async findByIdSMSNotification(
        @Req() req: Request,
        @Res() res: Response,
        @Param() { id }: IdEventNotificationEventParam
    ) {
        const response = await this.eventNotificationService.findByIdSMSNotification({ id });
        return res.status(response.status).json(response.data);
    }
}
