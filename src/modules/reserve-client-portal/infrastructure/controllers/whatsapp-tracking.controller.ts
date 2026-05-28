import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { WhatsAppTrackingService } from '../../application/services/whatsapp-tracking.service';
import {
  CreateWhatsAppTrackingLinkDto,
  UpdateWhatsAppTrackingLinkDto,
} from '../../application/dtos/whatsapp-tracking-link.dto';

@Controller('admin/hotel-portal/whatsapp-links')
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
export class WhatsAppTrackingController {
  constructor(private readonly trackingService: WhatsAppTrackingService) {}

  @Post(':clientId')
  async createLink(
    @Param('clientId') clientId: string,
    @Body() dto: CreateWhatsAppTrackingLinkDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const adminId = (req as any).admin?.id ?? 'unknown';
    const result = await this.trackingService.createLink(clientId, adminId, dto);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId')
  async findLinks(
    @Param('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const result = await this.trackingService.findLinks(clientId);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/:linkId/stats')
  async getLinkStats(
    @Param('clientId') clientId: string,
    @Param('linkId') linkId: string,
    @Res() res: Response,
  ) {
    const result = await this.trackingService.getLinkStats(clientId, linkId);
    return res.status(result.status).json(result.data);
  }

  @Put(':clientId/:linkId')
  async updateLink(
    @Param('clientId') clientId: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateWhatsAppTrackingLinkDto,
    @Res() res: Response,
  ) {
    const result = await this.trackingService.updateLink(clientId, linkId, dto);
    return res.status(result.status).json(result.data);
  }

  @Delete(':clientId/:linkId')
  async deleteLink(
    @Param('clientId') clientId: string,
    @Param('linkId') linkId: string,
    @Res() res: Response,
  ) {
    const result = await this.trackingService.deleteLink(clientId, linkId);
    return res.status(result.status).json(result.data);
  }
}
