import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IHotelClientRepository,
  ICreateHotelClient,
  IUpdateHotelClient,
} from '../../domain/interfaces/hotel-client.repository.interface';
import { HotelClientEntity } from '../../domain/entities/hotel-client.entity';
import {
  IDashboardRepository,
  IUpsertDashboardSnapshot,
  IUpsertCampaignMetric,
  IUpsertSiteMetric,
} from '../../domain/interfaces/dashboard.repository.interface';
import { DashboardSnapshotEntity } from '../../domain/entities/dashboard-snapshot.entity';
import { CampaignMetricEntity } from '../../domain/entities/campaign-metric.entity';
import { SiteMetricEntity } from '../../domain/entities/site-metric.entity';

@Injectable()
export class PrismaHotelClientRepository
  implements IHotelClientRepository, IDashboardRepository
{
  constructor(private readonly prisma: PrismaService) {}

  // ─── IHotelClientRepository ──────────────────────────────────────────────

  async create(data: ICreateHotelClient): Promise<HotelClientEntity> {
    try {
      const result = await this.prisma.hotelClient.create({ data });
      return new HotelClientEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error creating hotel client', error);
    }
  }

  async findById(id: string): Promise<HotelClientEntity | null> {
    try {
      const result = await this.prisma.hotelClient.findUnique({ where: { id } });
      return result ? new HotelClientEntity(result as any) : null;
    } catch (error) {
      throw new RepositoryException('Error finding hotel client by id', error);
    }
  }

  async findByAdminId(adminId: string): Promise<HotelClientEntity[]> {
    try {
      const results = await this.prisma.hotelClient.findMany({
        where: { admin_id: adminId, is_active: true },
        orderBy: { created_at: 'desc' },
      });
      return results.map((r) => new HotelClientEntity(r as any));
    } catch (error) {
      throw new RepositoryException('Error finding hotel clients by admin id', error);
    }
  }

  async findAll(page: number, limit: number): Promise<{ data: HotelClientEntity[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.prisma.hotelClient.findMany({
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.hotelClient.count(),
      ]);
      return {
        data: data.map((r) => new HotelClientEntity(r as any)),
        total,
      };
    } catch (error) {
      throw new RepositoryException('Error listing hotel clients', error);
    }
  }

  async update(id: string, data: IUpdateHotelClient): Promise<HotelClientEntity> {
    try {
      const result = await this.prisma.hotelClient.update({ where: { id }, data });
      return new HotelClientEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error updating hotel client', error);
    }
  }

  async deactivate(id: string): Promise<HotelClientEntity> {
    try {
      const result = await this.prisma.hotelClient.update({
        where: { id },
        data: { is_active: false },
      });
      return new HotelClientEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error deactivating hotel client', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.hotelClient.delete({ where: { id } });
    } catch (error) {
      throw new RepositoryException('Error deleting hotel client', error);
    }
  }

  // ─── IDashboardRepository ─────────────────────────────────────────────────

  async upsertSnapshot(data: IUpsertDashboardSnapshot): Promise<DashboardSnapshotEntity> {
    try {
      const result = await this.prisma.dashboardSnapshot.upsert({
        where: {
          client_id_snapshot_date: {
            client_id: data.client_id,
            snapshot_date: data.snapshot_date,
          },
        },
        update: {
          direct_bookings: data.direct_bookings,
          ota_bookings: data.ota_bookings,
          direct_revenue: data.direct_revenue,
          ota_revenue: data.ota_revenue,
          ota_commission_paid: data.ota_commission_paid,
          occupancy_rate: data.occupancy_rate,
          site_visitors: data.site_visitors,
          site_conversion_rate: data.site_conversion_rate,
        },
        create: data,
      });
      return new DashboardSnapshotEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error upserting dashboard snapshot', error);
    }
  }

  async findSnapshotsByClientId(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<DashboardSnapshotEntity[]> {
    try {
      const results = await this.prisma.dashboardSnapshot.findMany({
        where: {
          client_id: clientId,
          snapshot_date: { gte: from, lte: to },
        },
        orderBy: { snapshot_date: 'asc' },
      });
      return results.map((r) => new DashboardSnapshotEntity(r as any));
    } catch (error) {
      throw new RepositoryException('Error finding dashboard snapshots', error);
    }
  }

  async upsertCampaignMetric(data: IUpsertCampaignMetric): Promise<CampaignMetricEntity> {
    try {
      const existing = await this.prisma.campaignMetric.findFirst({
        where: {
          client_id: data.client_id,
          channel: data.channel as any,
          campaign_name: data.campaign_name,
          metric_date: data.metric_date,
        },
      });

      let result: any;
      if (existing) {
        result = await this.prisma.campaignMetric.update({
          where: { id: existing.id },
          data: {
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            conversions: data.conversions,
            revenue_attributed: data.revenue_attributed,
            cost_per_booking: data.cost_per_booking,
            roas: data.roas,
          },
        });
      } else {
        result = await this.prisma.campaignMetric.create({ data: data as any });
      }

      return new CampaignMetricEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error upserting campaign metric', error);
    }
  }

  async findCampaignMetricsByClientId(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<CampaignMetricEntity[]> {
    try {
      const results = await this.prisma.campaignMetric.findMany({
        where: {
          client_id: clientId,
          metric_date: { gte: from, lte: to },
        },
        orderBy: { metric_date: 'asc' },
      });
      return results.map((r) => new CampaignMetricEntity(r as any));
    } catch (error) {
      throw new RepositoryException('Error finding campaign metrics', error);
    }
  }

  async upsertSiteMetric(data: IUpsertSiteMetric): Promise<SiteMetricEntity> {
    try {
      const result = await this.prisma.siteMetric.upsert({
        where: {
          client_id_metric_date: {
            client_id: data.client_id,
            metric_date: data.metric_date,
          },
        },
        update: {
          organic_visitors: data.organic_visitors,
          paid_visitors: data.paid_visitors,
          direct_visitors: data.direct_visitors,
          social_visitors: data.social_visitors,
          package_page_views: data.package_page_views,
          checkout_starts: data.checkout_starts,
          checkout_completes: data.checkout_completes,
          avg_time_on_package: data.avg_time_on_package,
          bounce_rate: data.bounce_rate,
        },
        create: data,
      });
      return new SiteMetricEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error upserting site metric', error);
    }
  }

  async findSiteMetricsByClientId(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<SiteMetricEntity[]> {
    try {
      const results = await this.prisma.siteMetric.findMany({
        where: {
          client_id: clientId,
          metric_date: { gte: from, lte: to },
        },
        orderBy: { metric_date: 'asc' },
      });
      return results.map((r) => new SiteMetricEntity(r as any));
    } catch (error) {
      throw new RepositoryException('Error finding site metrics', error);
    }
  }
}
