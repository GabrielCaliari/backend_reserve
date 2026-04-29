import { EPurchaseStatus } from '../enums/purchase-status.enum';

export class B2BPurchaseEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string | null,
    public readonly productId: string,
    public readonly stripeCheckoutId: string | null,
    public readonly stripePaymentIntent: string | null,
    public readonly checkoutStartedAt: Date | null,
    public readonly checkoutCompletedAt: Date | null,
    public readonly checkoutAbandonedAt: Date | null,
    public readonly status: EPurchaseStatus,
    public readonly amount: number, // cents
    public readonly currency: string,
    public readonly customerEmail: string,
    public readonly customerName: string | null,
    public readonly customerPhone: string | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isCompleted(): boolean {
    return this.status === EPurchaseStatus.COMPLETED;
  }

  isAbandoned(): boolean {
    return this.status === EPurchaseStatus.ABANDONED;
  }
}
