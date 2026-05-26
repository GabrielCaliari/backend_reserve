import { UserProductAccess } from '../entities/user-product-access.entity';

export const USER_PRODUCT_ACCESS_REPOSITORY = Symbol('USER_PRODUCT_ACCESS_REPOSITORY');

export interface IUserProductAccessRepository {
  findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<UserProductAccess | null>;
  findByUserId(userId: string): Promise<UserProductAccess[]>;
  findExpiredAccess(now: Date): Promise<UserProductAccess[]>;
  hasActiveAccess(userId: string, productSlug: string): Promise<boolean>;
  create(data: Partial<UserProductAccess>): Promise<UserProductAccess>;
  update(id: string, data: Partial<UserProductAccess>): Promise<UserProductAccess>;
}
