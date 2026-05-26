export class UserSubscriptionResponseDTO {
  id: string;
  userId: string;
  productId: string;
  productPriceId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}
