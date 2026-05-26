import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  IDashboardRepository,
} from '../../domain/interfaces/dashboard.repository.interface';
import { errorResponse, successResponse } from '../../../../shared/helpers';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  async getSnapshotSummary(clientId: string, from: Date, to: Date) {
    try {
      const snapshots = await this.dashboardRepository.findSnapshotsByClientId(clientId, from, to);
      return successResponse(snapshots);
    } catch (error) {
      return errorResponse('500:DASHBOARD_SNAPSHOTS_NOT_FOUND', 500, error);
    }
  }

  async getCampaignMetrics(clientId: string, from: Date, to: Date) {
    try {
      const metrics = await this.dashboardRepository.findCampaignMetricsByClientId(clientId, from, to);
      return successResponse(metrics);
    } catch (error) {
      return errorResponse('500:CAMPAIGN_METRICS_NOT_FOUND', 500, error);
    }
  }

  async getSiteMetrics(clientId: string, from: Date, to: Date) {
    try {
      const metrics = await this.dashboardRepository.findSiteMetricsByClientId(clientId, from, to);
      return successResponse(metrics);
    } catch (error) {
      return errorResponse('500:SITE_METRICS_NOT_FOUND', 500, error);
    }
  }

  async getFullDashboard(clientId: string, from: Date, to: Date) {
    try {
      const [snapshots, campaigns, site] = await Promise.all([
        this.dashboardRepository.findSnapshotsByClientId(clientId, from, to),
        this.dashboardRepository.findCampaignMetricsByClientId(clientId, from, to),
        this.dashboardRepository.findSiteMetricsByClientId(clientId, from, to),
      ]);

      return successResponse({
        snapshots,
        campaigns,
        site,
        period: { from, to },
      });
    } catch (error) {
      return errorResponse('500:DASHBOARD_NOT_LOADED', 500, error);
    }
  }
}
