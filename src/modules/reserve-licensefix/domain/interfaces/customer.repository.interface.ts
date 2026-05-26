export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export type CustomerRole = 'study' | 'admin';

export interface ICreateCustomer {
  tenant_id: string;
  email: string;
  name: string;
  phone_number?: string;
  stripe_customer_id?: string;
}

export interface ICustomer {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  phone_number: string | null;
  stripe_customer_id: string | null;
  role: CustomerRole;
  created_at: Date;
  updated_at: Date;
}

export interface ICustomerRepository {
  findByTenantAndEmail(tenantId: string, email: string): Promise<ICustomer | null>;
  findById(id: string): Promise<ICustomer | null>;
  create(data: ICreateCustomer): Promise<ICustomer>;
  updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<void>;
  updateRole(id: string, role: CustomerRole): Promise<void>;
}
