import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  IDashboardRepository,
  IUpsertSiteMetric,
} from '../../domain/interfaces/dashboard.repository.interface';
import { errorResponse, successResponse } from '../../../../shared/helpers';

@Injectable()
export class SiteAnalyticsService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  async upsertMetric(data: IUpsertSiteMetric) {
    try {
      const metric = await this.dashboardRepository.upsertSiteMetric(data);
      return successResponse(metric, 201);
    } catch (error) {
      return errorResponse('500:SITE_METRIC_NOT_SAVED', 500, error);
    }
  }

  async getMetrics(clientId: string, from: Date, to: Date) {
    try {
      const metrics = await this.dashboardRepository.findSiteMetricsByClientId(
        clientId,
        from,
        to,
      );
      return successResponse(metrics);
    } catch (error) {
      return errorResponse('500:SITE_METRICS_NOT_FOUND', 500, error);
    }
  }
}
