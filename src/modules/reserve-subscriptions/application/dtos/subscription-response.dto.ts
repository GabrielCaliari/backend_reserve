import { ESubscriptionStatus } from '../../domain/enums/subscription-status.enum';

export class SubscriptionResponseDTO {
  id: string;
  tenantId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  stripeProductId?: string;
  status: ESubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  amount: number;
  formattedAmount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  daysRemaining: number;
  isActive: boolean;
  isInTrial: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
