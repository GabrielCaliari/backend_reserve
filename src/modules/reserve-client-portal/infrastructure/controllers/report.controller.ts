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
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';

@Controller('admin/hotel-portal/reports')
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
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
  @Roles(EAdminRole.super_admin, EAdminRole.owner)
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishReportDto,
    @Res() res: Response,
  ) {
    const result = await this.reportService.publish(id, dto);
    return res.status(result.status).json(result.data);
  }
}
