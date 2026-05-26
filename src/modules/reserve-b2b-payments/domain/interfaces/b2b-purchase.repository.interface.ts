import { B2BPurchaseEntity } from '../entities/b2b-purchase.entity';
import { EPurchaseStatus } from '../enums/purchase-status.enum';

export const B2B_PURCHASE_REPOSITORY = Symbol('B2B_PURCHASE_REPOSITORY');

export interface CreateB2BPurchaseData {
  tenantId: string;
  productId: string;
  stripeCheckoutId?: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateB2BPurchaseData {
  status?: EPurchaseStatus;
  stripePaymentIntent?: string;
  userId?: string;
  checkoutCompletedAt?: Date;
  checkoutAbandonedAt?: Date;
}

export interface ListB2BPurchasesFilter {
  status?: EPurchaseStatus | 'all';
  limit?: number;
  offset?: number;
}

export interface IB2BPurchaseRepository {
  create(data: CreateB2BPurchaseData): Promise<B2BPurchaseEntity>;
  findById(id: string, tenantId: string): Promise<B2BPurchaseEntity | null>;
  findByStripeCheckoutId(tenantId: string, checkoutId: string): Promise<B2BPurchaseEntity | null>;
  findAllByTenant(tenantId: string, filter: ListB2BPurchasesFilter): Promise<{ data: B2BPurchaseEntity[]; total: number }>;
  updateByStripeCheckoutId(tenantId: string, checkoutId: string, data: UpdateB2BPurchaseData): Promise<void>;
  countByStatus(tenantId: string, status: EPurchaseStatus): Promise<number>;
  getTotalRevenue(tenantId: string): Promise<number>;
}
