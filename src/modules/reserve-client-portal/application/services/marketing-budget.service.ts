import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { InsertMarketingBudgetDto } from '../dtos/insert-marketing-budget.dto';

@Injectable()
export class MarketingBudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(clientId: string, dto: InsertMarketingBudgetDto, adminId: string) {
    try {
      const referenceMonth = new Date(dto.reference_month);

      const record = await this.prisma.marketingBudget.upsert({
        where: {
          client_id_reference_month: {
            client_id: clientId,
            reference_month: referenceMonth,
          },
        },
        create: {
          client_id: clientId,
          reference_month: referenceMonth,
          total_budget: dto.total_budget,
          meta_ads_budget: dto.meta_ads_budget ?? 0,
          google_ads_budget: dto.google_ads_budget ?? 0,
          other_budget: dto.other_budget ?? 0,
          notes: dto.notes ?? null,
          inserted_by: adminId,
        },
        update: {
          total_budget: dto.total_budget,
          meta_ads_budget: dto.meta_ads_budget ?? 0,
          google_ads_budget: dto.google_ads_budget ?? 0,
          other_budget: dto.other_budget ?? 0,
          notes: dto.notes ?? null,
          inserted_by: adminId,
        },
      });

      return successResponse(record, 201);
    } catch (error) {
      return errorResponse('500:MARKETING_BUDGET_NOT_SAVED', 500, error);
    }
  }

  async findByClientId(clientId: string, months = 6) {
    try {
      const records = await this.prisma.marketingBudget.findMany({
        where: { client_id: clientId },
        orderBy: { reference_month: 'desc' },
        take: months,
      });
      return successResponse(records);
    } catch (error) {
      return errorResponse('500:MARKETING_BUDGET_NOT_FOUND', 500, error);
    }
  }

  async getComparison(clientId: string, referenceMonth: string) {
    try {
      const monthDate = new Date(referenceMonth);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const budget = await this.prisma.marketingBudget.findUnique({
        where: {
          client_id_reference_month: {
            client_id: clientId,
            reference_month: monthDate,
          },
        },
      });

      const spendAgg = await this.prisma.campaignMetric.aggregate({
        where: {
          client_id: clientId,
          metric_date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { spend: true },
      });

      const actual_spend = spendAgg._sum.spend ?? 0;
      const total_budget = budget?.total_budget ?? 0;
      const remaining = total_budget - actual_spend;
      const pct_used = total_budget > 0 ? parseFloat(((actual_spend / total_budget) * 100).toFixed(2)) : 0;

      return successResponse({
        budget,
        actual_spend,
        remaining,
        pct_used,
      });
    } catch (error) {
      return errorResponse('500:MARKETING_BUDGET_COMPARISON_ERROR', 500, error);
    }
  }
}
