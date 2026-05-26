import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { HotelClientService } from '../../application/services/hotel-client.service';
import { OtaDirectService } from '../../application/services/ota-direct.service';
import { CreateClientDto } from '../../application/dtos/create-client.dto';
import { UpdateClientDto } from '../../application/dtos/update-client.dto';
import { InsertOtaDataDto } from '../../application/dtos/insert-ota-data.dto';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';

@Controller('admin/hotel-portal/clients')
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
export class AdminHotelClientController {
  constructor(
    private readonly hotelClientService: HotelClientService,
    private readonly otaDirectService: OtaDirectService,
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
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Res() res: Response,
  ) {
    const result = await this.hotelClientService.findAll(Number(page), Number(limit));
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
  @Roles(EAdminRole.super_admin)
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
