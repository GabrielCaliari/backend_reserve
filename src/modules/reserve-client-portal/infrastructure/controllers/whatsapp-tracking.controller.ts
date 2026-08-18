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
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import {
  ScopedToTenantResource,
  TenantResourceScopeGuard,
} from '../guards/tenant-resource-scope.guard';
import { WhatsAppTrackingService } from '../../application/services/whatsapp-tracking.service';
import {
  CreateWhatsAppTrackingLinkDto,
  UpdateWhatsAppTrackingLinkDto,
} from '../../application/dtos/whatsapp-tracking-link.dto';

/**
 * Rotas chaveadas por `:clientId`/`:linkId`. O tenant vem do header
 * `x-tenant-id` (o `x-skip-tenant` saiu destas chamadas no dashboard), e as duas
 * chaves sao conferidas: `:clientId` contra HotelClient e `:linkId` contra o
 * proprio link — o service so cruza os dois em `getLinkStats`, entao sem o guard
 * um `:linkId` de outro tenant passava em `update`/`delete`.
 *
 * O redirect publico `wa/:code` continua fora: e @Public() e nao tem sessao.
 */
@Controller('admin/hotel-portal/whatsapp-links')
@UseGuards(
  AdminJwtGuard,
  TenantGuard,
  ModuleAccessGuard,
  TenantResourceScopeGuard,
  PermissionsGuard,
)
@RequiresModule('client-portal')
@ScopedToTenantResource(
  { kind: 'hotelClient', key: 'clientId' },
  { kind: 'whatsAppTrackingLink', key: 'linkId' },
)
@RequirePermissions('hotel-portal.whatsapp-links.manage')
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
