import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CustomerOverviewUseCase } from '../../application/use-cases/customer-overview.use-case';

@Controller('licensefix/admin/customers')
export class CustomerOverviewController {
  constructor(private readonly useCase: CustomerOverviewUseCase) {}

  @Get()
  list(
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('accessStatus') accessStatus?: string,
    @Query('examStatus') examStatus?: string,
    @Query('section') section?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.useCase.list({ tenantId, search, accessStatus, examStatus, section, dateFrom, dateTo });
  }

  @Get('export-csv')
  async exportCSV(
    @Res() res: Response,
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('accessStatus') accessStatus?: string,
    @Query('examStatus') examStatus?: string,
    @Query('section') section?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const csv = await this.useCase.exportCSV({ tenantId, search, accessStatus, examStatus, section, dateFrom, dateTo });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="licensefix-customers.csv"');
    return res.send(csv);
  }
}
