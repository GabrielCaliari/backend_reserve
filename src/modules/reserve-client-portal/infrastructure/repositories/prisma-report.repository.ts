import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  IReportRepository,
  IUpsertOtaMonthlyData,
  ICreateMonthlyReport,
  IUpdateMonthlyReport,
} from '../../domain/interfaces/report.repository.interface';
import { OtaMonthlyDataEntity } from '../../domain/entities/ota-monthly-data.entity';
import { MonthlyReportEntity } from '../../domain/entities/monthly-report.entity';
import { EReportStatus } from '../../domain/enums/report-status.enum';

@Injectable()
export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertOtaMonthlyData(data: IUpsertOtaMonthlyData): Promise<OtaMonthlyDataEntity> {
    try {
      const result = await this.prisma.otaMonthlyData.upsert({
        where: {
          client_id_reference_month: {
            client_id: data.client_id,
            reference_month: data.reference_month,
          },
        },
        update: {
          ota_bookings: data.ota_bookings,
          ota_revenue: data.ota_revenue,
          commission_rate: data.commission_rate,
          commission_paid: data.commission_paid,
          platform_breakdown: data.platform_breakdown as any,
          inserted_by: data.inserted_by,
        },
        create: {
          client_id: data.client_id,
          reference_month: data.reference_month,
          ota_bookings: data.ota_bookings,
          ota_revenue: data.ota_revenue,
          commission_rate: data.commission_rate ?? 0.22,
          commission_paid: data.commission_paid ?? 0,
          platform_breakdown: data.platform_breakdown as any,
          inserted_by: data.inserted_by,
        },
      });
      return new OtaMonthlyDataEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error upserting OTA monthly data', error);
    }
  }

  async findOtaDataByClientId(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<OtaMonthlyDataEntity[]> {
    try {
      const results = await this.prisma.otaMonthlyData.findMany({
        where: {
          client_id: clientId,
          reference_month: { gte: from, lte: to },
        },
        orderBy: { reference_month: 'asc' },
      });
      return results.map((r) => new OtaMonthlyDataEntity(r as any));
    } catch (error) {
      throw new RepositoryException('Error finding OTA monthly data', error);
    }
  }

  async createMonthlyReport(data: ICreateMonthlyReport): Promise<MonthlyReportEntity> {
    try {
      const result = await this.prisma.monthlyReport.create({
        data: {
          client_id: data.client_id,
          reference_month: data.reference_month,
          executive_summary: data.executive_summary,
          highlights: data.highlights as any,
          next_steps: data.next_steps as any,
          admin_comment: data.admin_comment,
        },
      });
      return new MonthlyReportEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error creating monthly report', error);
    }
  }

  async findReportById(id: string): Promise<MonthlyReportEntity | null> {
    try {
      const result = await this.prisma.monthlyReport.findUnique({ where: { id } });
      return result ? new MonthlyReportEntity(result as any) : null;
    } catch (error) {
      throw new RepositoryException('Error finding monthly report by id', error);
    }
  }

  async findReportsByClientId(
    clientId: string,
    page: number,
    limit: number,
  ): Promise<{ data: MonthlyReportEntity[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.prisma.monthlyReport.findMany({
          where: { client_id: clientId },
          skip,
          take: limit,
          orderBy: { reference_month: 'desc' },
        }),
        this.prisma.monthlyReport.count({ where: { client_id: clientId } }),
      ]);
      return {
        data: data.map((r) => new MonthlyReportEntity(r as any)),
        total,
      };
    } catch (error) {
      throw new RepositoryException('Error listing monthly reports', error);
    }
  }

  async updateMonthlyReport(id: string, data: IUpdateMonthlyReport): Promise<MonthlyReportEntity> {
    try {
      const result = await this.prisma.monthlyReport.update({
        where: { id },
        data: data as any,
      });
      return new MonthlyReportEntity(result as any);
    } catch (error) {
      throw new RepositoryException('Error updating monthly report', error);
    }
  }

  async findPendingNotifications(): Promise<MonthlyReportEntity[]> {
    try {
      const results = await this.prisma.monthlyReport.findMany({
        where: {
          status: EReportStatus.PUBLISHED as any,
          notification_sent: false,
        },
        orderBy: { published_at: 'asc' },
      });
      return results.map((r) => new MonthlyReportEntity(r as any));
    } catch (error) {
      throw new RepositoryException('Error finding pending notifications', error);
    }
  }
}
