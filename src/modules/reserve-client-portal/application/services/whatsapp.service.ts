import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { CreateWhatsAppTemplateDto, SendWhatsAppMessageDto } from '../dtos/whatsapp.dto';
import { WhatsAppProvider } from '../../infrastructure/providers/whatsapp.provider';

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappProvider: WhatsAppProvider,
  ) {}

  async createTemplate(clientId: string, dto: CreateWhatsAppTemplateDto) {
    try {
      const template = await this.prisma.whatsAppTemplate.create({
        data: {
          client_id: clientId,
          name: dto.name,
          type: dto.type,
          body: dto.body,
          active: dto.active ?? true,
        },
      });
      return successResponse(template, 201);
    } catch (error) {
      return errorResponse('500:WHATSAPP_TEMPLATE_NOT_CREATED', 500, error);
    }
  }

  async findTemplates(clientId: string) {
    try {
      const templates = await this.prisma.whatsAppTemplate.findMany({
        where: { client_id: clientId, active: true },
        orderBy: { created_at: 'desc' },
      });
      return successResponse(templates);
    } catch (error) {
      return errorResponse('500:WHATSAPP_TEMPLATES_NOT_FOUND', 500, error);
    }
  }

  async sendMessage(clientId: string, dto: SendWhatsAppMessageDto) {
    try {
      const template = await this.prisma.whatsAppTemplate.findFirst({
        where: { id: dto.template_id, client_id: clientId, active: true },
      });

      if (!template) {
        return errorResponse('404:WHATSAPP_TEMPLATE_NOT_FOUND', 404);
      }

      const variables: Record<string, string> = {};
      if (dto.guest_name) {
        variables['guest_name'] = dto.guest_name;
        variables['name'] = dto.guest_name;
      }

      const body = this.whatsappProvider.interpolateTemplate(template.body, variables);

      const message = await this.prisma.whatsAppMessage.create({
        data: {
          client_id: clientId,
          template_id: template.id,
          guest_phone: dto.guest_phone,
          guest_name: dto.guest_name ?? null,
          status: 'PENDING',
        },
      });

      const result = await this.whatsappProvider.sendTextMessage(dto.guest_phone, body);

      if (result.success) {
        await this.prisma.whatsAppMessage.update({
          where: { id: message.id },
          data: { status: 'SENT', sent_at: new Date() },
        });
        return successResponse({ ...message, status: 'SENT', messageId: result.messageId }, 201);
      } else {
        await this.prisma.whatsAppMessage.update({
          where: { id: message.id },
          data: { status: 'FAILED', error: result.error ?? 'Unknown error' },
        });
        return errorResponse('500:WHATSAPP_SEND_FAILED', 500);
      }
    } catch (error) {
      return errorResponse('500:WHATSAPP_MESSAGE_ERROR', 500, error);
    }
  }

  async getMessageHistory(clientId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [messages, total] = await this.prisma.$transaction([
        this.prisma.whatsAppMessage.findMany({
          where: { client_id: clientId },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
          include: { Template: { select: { name: true, type: true } } },
        }),
        this.prisma.whatsAppMessage.count({ where: { client_id: clientId } }),
      ]);

      return successResponse({ messages, total, page, limit });
    } catch (error) {
      return errorResponse('500:WHATSAPP_HISTORY_ERROR', 500, error);
    }
  }
}
