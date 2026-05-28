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
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { WhatsAppService } from '../../application/services/whatsapp.service';
import { CreateWhatsAppTemplateDto, SendWhatsAppMessageDto } from '../../application/dtos/whatsapp.dto';

@Controller('admin/hotel-portal/whatsapp')
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
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
