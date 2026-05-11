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
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { AnalyticsReportService } from '../../application/services/analytics-report.service';
import { CreateAnalyticsReportDto } from '../../application/dtos/create-analytics-report.dto';
import { UpdateAnalyticsReportDto } from '../../application/dtos/update-analytics-report.dto';

@ApiTags('Analytics Reports')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@Controller()
export class AnalyticsReportController {
  constructor(private readonly service: AnalyticsReportService) {}

  @Post()
  @RequirePermissions('analytics-reports.manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create analytics report link (phone → URL)' })
  async create(@Body() dto: CreateAnalyticsReportDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions('analytics-reports.manage')
  @ApiOperation({ summary: 'List all analytics report links' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll(Number(page), Number(limit));
  }

  @Patch(':id')
  @RequirePermissions('analytics-reports.manage')
  @ApiOperation({ summary: 'Update analytics report link' })
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateAnalyticsReportDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('analytics-reports.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete analytics report link' })
  async delete(@Param('id', ParseCuidPipe) id: string) {
    await this.service.delete(id);
  }
}
