import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { EventNotificationService } from '../../application/services/event-notification.service';
import { CreateEventNotificationDTO, CreateEventNotificationEventDTO, CreateEventNotificationEventParam, IdEventNotificationEventParam, IdNotificationEventNotificationEventParam } from '../../application/dtos/event-notification.dto';
import { Request, Response } from 'express';
import { AdminJwtGuard } from '@/shared/auth/guards';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Event Notification (SMS)')
@ApiBearerAuth()
@Controller()
export class EventNotificationController {
    constructor(
        private eventNotificationService: EventNotificationService,
    ) { }

    @Post('/sms/create')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'Criar notificação SMS', description: 'Cria uma nova notificação SMS e retorna um webhook UUID único' })
    @ApiResponse({ status: 200, description: 'Notificação SMS criada com sucesso' })
    @ApiResponse({ status: 500, description: 'Erro ao criar notificação SMS' })
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
    @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'Listar notificações SMS', description: 'Retorna todas as notificações SMS cadastradas' })
    @ApiResponse({ status: 200, description: 'Lista de notificações SMS' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar notificações' })
    async findSMSNotification(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const response = await this.eventNotificationService.findSMSNotification();

        return res.status(response.status).json(response.data);
    }

    @Post('/sms/webhook/:uuid')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'Enviar SMS via webhook', description: 'Envia um SMS através do webhook da notificação. Suporta templates com parâmetros dinâmicos.' })
    @ApiParam({ name: 'uuid', description: 'UUID do webhook da notificação', type: 'string' })
    @ApiResponse({ status: 200, description: 'SMS enviado com sucesso' })
    @ApiResponse({ status: 404, description: 'Webhook não encontrado' })
    @ApiResponse({ status: 500, description: 'Erro ao enviar SMS' })
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
    @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'Listar eventos por notificação', description: 'Retorna todos os eventos SMS de uma notificação específica' })
    @ApiParam({ name: 'id_notification', description: 'ID da notificação SMS', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lista de eventos SMS' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar eventos' })
    async findByIdNotificationSMSNotificationEvent(
        @Res() res: Response,
        @Param() { id_notification }: IdNotificationEventNotificationEventParam
    ) {
        const response = await this.eventNotificationService.findByIdNotificationSMSNotificationEvent({ id_notification });

        return res.status(response.status).json(response.data);
    }

    @Get('/sms/:id')
    @UseGuards(AdminJwtGuard)
    @ApiOperation({ summary: 'Buscar notificação SMS por ID', description: 'Retorna uma notificação SMS específica pelo ID' })
    @ApiParam({ name: 'id', description: 'ID da notificação SMS', type: 'string' })
    @ApiResponse({ status: 200, description: 'Notificação SMS encontrada' })
    @ApiResponse({ status: 404, description: 'Notificação SMS não encontrada' })
    @ApiResponse({ status: 500, description: 'Erro ao buscar notificação' })
    async findByIdSMSNotification(
        @Req() req: Request,
        @Res() res: Response,
        @Param() { id }: IdEventNotificationEventParam
    ) {
        const response = await this.eventNotificationService.findByIdSMSNotification({ id });
        return res.status(response.status).json(response.data);
    }
}
