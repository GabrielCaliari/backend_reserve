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
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import {
  ScopedToTenantResource,
  TenantResourceScopeGuard,
} from '../guards/tenant-resource-scope.guard';
import { WhatsAppService } from '../../application/services/whatsapp.service';
import { CreateWhatsAppTemplateDto, SendBotMessageDto, SendWhatsAppMessageDto } from '../../application/dtos/whatsapp.dto';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

/**
 * Rotas chaveadas por `:clientId`. O tenant vem do header `x-tenant-id` (o
 * dashboard nao manda mais `x-skip-tenant` aqui): o TenantGuard o resolve, o
 * ModuleAccessGuard gateia o modulo e o TenantResourceScopeGuard confere que o
 * cliente pedido e do tenant da sessao — senao um admin dispararia mensagens
 * de WhatsApp em nome de outro cliente.
 */
@Controller('admin/hotel-portal/whatsapp')
@UseGuards(
  AdminJwtGuard,
  TenantGuard,
  ModuleAccessGuard,
  TenantResourceScopeGuard,
  PermissionsGuard,
)
@RequiresModule('client-portal')
@ScopedToTenantResource({ kind: 'hotelClient', key: 'clientId' })
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
    @Body() body: Record<string, unknown>,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    // Texto livre (formulario do painel) vai ao bot pelo Canal B; o envio por
    // template continua no fluxo antigo.
    const result =
      typeof body.body === 'string'
        ? await this.whatsappService.sendBotMessage(clientId, admin.admin_id, body as unknown as SendBotMessageDto)
        : await this.whatsappService.sendMessage(clientId, body as unknown as SendWhatsAppMessageDto);
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
