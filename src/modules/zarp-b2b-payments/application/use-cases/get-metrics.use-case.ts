import { Injectable, Inject } from '@nestjs/common';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import { EPurchaseStatus } from '../../domain/enums/purchase-status.enum';

export interface B2BMetrics {
  totalCheckoutsStarted: number;
  totalCheckoutsCompleted: number;
  totalCheckoutsAbandoned: number;
  totalCheckoutsRefunded: number;
  conversionRate: number;
  abandonmentRate: number;
  totalRevenue: number; // cents
  averageOrderValue: number; // cents
}

@Injectable()
export class GetMetricsUseCase {
  constructor(
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
  ) {}

  async execute(tenantId: string): Promise<B2BMetrics> {
    const [started, completed, abandoned, refunded, totalRevenue] = await Promise.all([
      this.purchaseRepo.countByStatus(tenantId, EPurchaseStatus.PENDING),
      this.purchaseRepo.countByStatus(tenantId, EPurchaseStatus.COMPLETED),
      this.purchaseRepo.countByStatus(tenantId, EPurchaseStatus.ABANDONED),
      this.purchaseRepo.countByStatus(tenantId, EPurchaseStatus.REFUNDED),
      this.purchaseRepo.getTotalRevenue(tenantId),
    ]);

    const totalStarted = started + completed + abandoned + refunded;
    const conversionRate = totalStarted > 0 ? (completed / totalStarted) * 100 : 0;
    const abandonmentRate = totalStarted > 0 ? (abandoned / totalStarted) * 100 : 0;
    const averageOrderValue = completed > 0 ? totalRevenue / completed : 0;

    return {
      totalCheckoutsStarted: totalStarted,
      totalCheckoutsCompleted: completed,
      totalCheckoutsAbandoned: abandoned,
      totalCheckoutsRefunded: refunded,
      conversionRate: Math.round(conversionRate * 10) / 10,
      abandonmentRate: Math.round(abandonmentRate * 10) / 10,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue),
    };
  }
}
