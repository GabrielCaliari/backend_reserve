import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { WhatsAppService } from '../../application/services/whatsapp.service';
import { CreateWhatsAppTemplateDto, SendWhatsAppMessageDto } from '../../application/dtos/whatsapp.dto';

/**
 * Rotas chaveadas por `:clientId`, chamadas pelo dashboard com `x-skip-tenant:
 * true` (sem `x-tenant-id`). Sem tenant na request o TenantGuard nao roda: FORA
 * do gate de client-portal.
 */
@Controller('admin/hotel-portal/whatsapp')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.whatsapp.manage')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post(':clientId/templates')
  async createTemplate(
    @Param('clientId') clientId: string,
    @Body() dto: CreateWhatsAppTemplateDto,
    @Res() res: Response,
  ) {
    const result = await this.whatsappService.createTemplate(clientId, dto);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/templates')
  async findTemplates(
    @Param('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const result = await this.whatsappService.findTemplates(clientId);
    return res.status(result.status).json(result.data);
  }

  @Post(':clientId/send')
  async sendMessage(
    @Param('clientId') clientId: string,
    @Body() dto: SendWhatsAppMessageDto,
    @Res() res: Response,
  ) {
    const result = await this.whatsappService.sendMessage(clientId, dto);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/messages')
  async getMessageHistory(
    @Param('clientId') clientId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.whatsappService.getMessageHistory(clientId, +page || 1, +limit || 20);
    return res.status(result.status).json(result.data);
  }
}
