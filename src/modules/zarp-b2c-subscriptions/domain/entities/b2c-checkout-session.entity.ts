export type B2CCheckoutStatus = 'pending' | 'completed' | 'expired' | 'abandoned';

export interface B2CCheckoutSessionProps {
  id: string;
  tenantId: string;
  userId: string | null;
  productId: string;
  priceId: string;
  stripeCheckoutId: string;
  stripePriceId: string;
  status: B2CCheckoutStatus;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  isLeadPurchase: boolean;
  checkoutStartedAt: Date;
  checkoutCompletedAt: Date | null;
  checkoutExpiredAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class B2CCheckoutSessionEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string | null;
  readonly productId: string;
  readonly priceId: string;
  readonly stripeCheckoutId: string;
  readonly stripePriceId: string;
  readonly status: B2CCheckoutStatus;
  readonly amount: number;
  readonly currency: string;
  readonly customerEmail: string;
  readonly customerName: string | null;
  readonly customerPhone: string | null;
  readonly isLeadPurchase: boolean;
  readonly checkoutStartedAt: Date;
  readonly checkoutCompletedAt: Date | null;
  readonly checkoutExpiredAt: Date | null;
  readonly metadata: Record<string, any> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: B2CCheckoutSessionProps) {
    Object.assign(this, props);
  }
}
