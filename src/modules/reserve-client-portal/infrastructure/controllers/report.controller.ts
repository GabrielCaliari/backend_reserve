import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportService } from '../../application/services/report.service';
import { CreateReportDto, PublishReportDto } from '../../application/dtos/publish-report.dto';
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

/**
 * Tres chaves distintas apontam para o mesmo tenant aqui: `client/:clientId`
 * (HotelClient), `:id` (MonthlyReport) e o `client_id` no corpo do POST de
 * criacao — sem este ultimo um admin criaria relatorio no cliente de outro
 * tenant, ja que o corpo nao passa por rota nenhuma. O guard ignora a
 * referencia cuja chave nao existe na requisicao.
 *
 * `@RequiresModule('client-portal')` gateia o modulo pelo tenant da sessao, que
 * o TenantGuard resolve do header `x-tenant-id` (o dashboard parou de mandar
 * `x-skip-tenant` nestas chamadas).
 */
@Controller('admin/hotel-portal/reports')
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
  { kind: 'monthlyReport', key: 'id' },
  { kind: 'hotelClient', key: 'client_id', source: 'body' },
)
@RequirePermissions('hotel-portal.reports.manage')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  async create(@Body() dto: CreateReportDto, @Res() res: Response) {
    const result = await this.reportService.createReport(dto);
    return res.status(result.status).json(result.data);
  }

  @Get('client/:clientId')
  async findByClientId(
    @Param('clientId') clientId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '12',
    @Res() res: Response,
  ) {
    const result = await this.reportService.findByClientId(clientId, Number(page), Number(limit));
    return res.status(result.status).json(result.data);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Res() res: Response) {
    const result = await this.reportService.findById(id);
    return res.status(result.status).json(result.data);
  }

  @Patch(':id/submit-review')
  async submitForReview(@Param('id') id: string, @Res() res: Response) {
    const result = await this.reportService.submitForReview(id);
    return res.status(result.status).json(result.data);
  }

  @Patch(':id/publish')
  @RequirePermissions('hotel-portal.reports.publish')
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishReportDto,
    @Res() res: Response,
  ) {
    const result = await this.reportService.publish(id, dto);
    return res.status(result.status).json(result.data);
  }
}
