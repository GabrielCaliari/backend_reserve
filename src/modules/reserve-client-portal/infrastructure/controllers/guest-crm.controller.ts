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
import { GuestCrmService } from '../../application/services/guest-crm.service';
import { CreateGuestDto, CreateGuestStayDto } from '../../application/dtos/create-guest.dto';
import { EGuestSegment } from '../../domain/enums/guest-segment.enum';

/**
 * Rotas heterogeneas: umas chaveadas por `:clientId`, outras por `guest/:guestId`.
 * O decorator declara as duas chaves e o guard ignora a que nao existir na rota,
 * entao um unico decorator de classe cobre as duas familias. Dados de hospede
 * sao PII: sem esta checagem qualquer admin lia o CRM de outro cliente.
 */
@Controller('admin/hotel-portal/guests')
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
  { kind: 'hotelGuest', key: 'guestId' },
)
@RequirePermissions('hotel-portal.guests.manage')
export class GuestCrmController {
  constructor(private readonly guestCrmService: GuestCrmService) {}

  @Post(':clientId')
  async create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateGuestDto,
    @Res() res: Response,
  ) {
    const result = await this.guestCrmService.create(clientId, dto);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId')
  async findByClientId(
    @Param('clientId') clientId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('segment') segment: string,
    @Res() res: Response,
  ) {
    const seg = Object.values(EGuestSegment).includes(segment as EGuestSegment)
      ? (segment as EGuestSegment)
      : undefined;

    const result = await this.guestCrmService.findByClientId(clientId, +page || 1, +limit || 20, seg);
    return res.status(result.status).json(result.data);
  }

  @Get(':clientId/reactivation')
  async getReactivationList(
    @Param('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const result = await this.guestCrmService.getReactivationList(clientId);
    return res.status(result.status).json(result.data);
  }

  @Get('guest/:guestId')
  async findById(
    @Param('guestId') guestId: string,
    @Res() res: Response,
  ) {
    const result = await this.guestCrmService.findById(guestId);
    return res.status(result.status).json(result.data);
  }

  @Post('guest/:guestId/stays')
  async addStay(
    @Param('guestId') guestId: string,
    @Body() dto: CreateGuestStayDto,
    @Res() res: Response,
  ) {
    const result = await this.guestCrmService.addStay(guestId, dto);
    return res.status(result.status).json(result.data);
  }
}
