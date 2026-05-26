import { Module } from '@nestjs/common';
import { AnalyticsReportService } from './application/services/analytics-report.service';
import { PrismaAnalyticsReportRepository } from './infrastructure/repositories/prisma-analytics-report.repository';
import { AnalyticsReportController } from './infrastructure/controllers/analytics-report.controller';
import { PublicAnalyticsReportController } from './infrastructure/controllers/public-analytics-report.controller';
import { ANALYTICS_REPORT_REPOSITORY } from './domain/interfaces';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';

@Module({
  imports: [ReserveAuthModule],
  controllers: [AnalyticsReportController, PublicAnalyticsReportController],
  providers: [
    AnalyticsReportService,
    PrismaAnalyticsReportRepository,
    {
      provide: ANALYTICS_REPORT_REPOSITORY,
      useClass: PrismaAnalyticsReportRepository,
    },
  ],
})
export class ReserveReportsModule {}
