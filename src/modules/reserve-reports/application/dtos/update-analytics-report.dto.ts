import { PartialType } from '@nestjs/swagger';
import { CreateAnalyticsReportDto } from './create-analytics-report.dto';

export class UpdateAnalyticsReportDto extends PartialType(CreateAnalyticsReportDto) {}
