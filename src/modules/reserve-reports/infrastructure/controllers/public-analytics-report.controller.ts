import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsReportService } from '../../application/services/analytics-report.service';
import { LookupReportDto } from '../../application/dtos/lookup-report.dto';
import { Public } from '../../../../shared/auth/decorators/public.decorator';

@ApiTags('Analytics Reports - Public')
@Controller('lookup')
@Public()
export class PublicAnalyticsReportController {
  constructor(private readonly service: AnalyticsReportService) {}

  @Get()
  @ApiOperation({
    summary: 'Look up analytics report URL by phone number',
    description: 'Public endpoint. Returns the report URL associated with the given phone number.',
  })
  @ApiQuery({ name: 'phone', required: true, type: String })
  async lookup(@Query() dto: LookupReportDto) {
    return this.service.lookupByPhone(dto.phone);
  }
}
