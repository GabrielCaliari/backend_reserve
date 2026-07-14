import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HotelClientService } from '../../application/services/hotel-client.service';
import { OtaDirectService } from '../../application/services/ota-direct.service';
import { ImportHistoricalBaselineUseCase } from '../../application/use-cases/import-historical-baseline.use-case';
import { CreateClientDto } from '../../application/dtos/create-client.dto';
import { UpdateClientDto } from '../../application/dtos/update-client.dto';
import { InsertOtaDataDto } from '../../application/dtos/insert-ota-data.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';

@Controller('admin/hotel-portal/clients')
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('hotel-portal.clients.manage')
export class AdminHotelClientController {
  constructor(
    private readonly hotelClientService: HotelClientService,
    private readonly otaDirectService: OtaDirectService,
    private readonly importHistoricalBaselineUseCase: ImportHistoricalBaselineUseCase,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateClientDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.hotelClientService.create(dto, admin.admin_id);
    return res.status(result.status).json(result.data);
  }

  @Get()
  async findAll(
    @Headers('x-skip-tenant') skipTenant: string,
    @Headers('x-tenant-id') tenantIdHeader: string,
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Res() res: Response,
  ) {
    // x-skip-tenant: true → super admin listing all clients
    if (skipTenant === 'true') {
      const result = await this.hotelClientService.findAll(Number(page), Number(limit));
      return res.status(result.status).json(result.data);
    }

    // x-tenant-id present → return all HotelClients for that tenant
    const tenantId = tenantIdHeader ?? (req as any).tenant_id;
    if (!tenantId) {
      return res.status(400).json({ message: 'Missing x-tenant-id header' });
    }

    const result = await this.hotelClientService.findAllByTenant(tenantId);
    return res.status(result.status).json(result.data);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Res() res: Response) {
    const result = await this.hotelClientService.findById(id);
    return res.status(result.status).json(result.data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Res() res: Response,
  ) {
    const result = await this.hotelClientService.update(id, dto);
    return res.status(result.status).json(result.data);
  }

  @Delete(':id')
  @RequirePermissions('hotel-portal.clients.deactivate')
  async deactivate(@Param('id') id: string, @Res() res: Response) {
    const result = await this.hotelClientService.deactivate(id);
    return res.status(result.status).json(result.data);
  }

  @Post(':id/ota-data')
  async insertOtaData(
    @Param('id') clientId: string,
    @Body() dto: InsertOtaDataDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Res() res: Response,
  ) {
    const result = await this.otaDirectService.insertOtaData(
      { ...dto, client_id: clientId },
      admin.admin_id,
    );
    return res.status(result.status).json(result.data);
  }

  @Post(':id/import-baseline')
  async importBaseline(@Param('id') clientId: string, @Res() res: Response) {
    const result = await this.importHistoricalBaselineUseCase.execute(clientId);
    return res.status(200).json(result);
  }

  @Get(':id/ota-data')
  async getOtaData(
    @Param('id') clientId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();
    const result = await this.otaDirectService.getOtaData(clientId, fromDate, toDate);
    return res.status(result.status).json(result.data);
  }
}
