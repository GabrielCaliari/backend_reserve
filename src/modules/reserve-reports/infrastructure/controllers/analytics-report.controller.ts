import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { RequiresModule } from '../../../../shared/auth/decorators/requires-module.decorator';
import { GetTenantId } from '../../../../shared/decorators/get-tenant-id.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { AnalyticsReportService } from '../../application/services/analytics-report.service';
import { CreateAnalyticsReportDto } from '../../application/dtos/create-analytics-report.dto';
import { UpdateAnalyticsReportDto } from '../../application/dtos/update-analytics-report.dto';

/**
 * Superficie de admin dos vinculos telefone -> URL, escopada por tenant desde a
 * migration 20260808000001. O tenant vem do `x-tenant-id` que o painel envia; o
 * TenantGuard o resolve e publica em `request.tenant_id`, de onde o
 * ModuleAccessGuard le a politica de `reports` e o `@GetTenantId()` alimenta o
 * service. Nenhuma rota daqui enxerga vinculo de outro tenant nem o legado sem
 * dono (tenant_id NULL).
 *
 * A ordem dos guards e contrato: TenantGuard precisa rodar antes do
 * ModuleAccessGuard, que sem `request.tenant_id` falha em vez de gatear.
 */
@ApiTags('Analytics Reports')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('reports')
@Controller()
export class AnalyticsReportController {
  constructor(private readonly service: AnalyticsReportService) {}

  @Post()
  @RequirePermissions('analytics-reports.manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create analytics report link (phone → URL)' })
  async create(@GetTenantId() tenantId: string, @Body() dto: CreateAnalyticsReportDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('analytics-reports.manage')
  @ApiOperation({ summary: 'List analytics report links for the current tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @GetTenantId() tenantId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll(tenantId, Number(page), Number(limit));
  }

  @Patch(':id')
  @RequirePermissions('analytics-reports.manage')
  @ApiOperation({ summary: 'Update analytics report link' })
  async update(
    @GetTenantId() tenantId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateAnalyticsReportDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('analytics-reports.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete analytics report link' })
  async delete(@GetTenantId() tenantId: string, @Param('id', ParseCuidPipe) id: string) {
    await this.service.delete(tenantId, id);
  }
}
