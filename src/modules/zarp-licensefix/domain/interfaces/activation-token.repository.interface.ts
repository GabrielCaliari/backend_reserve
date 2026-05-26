import { ETokenType } from '../enums/token-type.enum';

export const ACTIVATION_TOKEN_REPOSITORY = Symbol('ACTIVATION_TOKEN_REPOSITORY');

export interface ICreateActivationToken {
  customer_id: string;
  tenant_id: string;
  token: string;
  type: ETokenType;
  expires_at: Date;
}

export interface IActivationToken {
  id: string;
  customer_id: string;
  tenant_id: string;
  token: string;
  type: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IActivationTokenRepository {
  create(data: ICreateActivationToken): Promise<IActivationToken>;
  findByToken(token: string): Promise<IActivationToken | null>;
  findActivePending(customerId: string, tenantId: string, type: ETokenType): Promise<IActivationToken | null>;
  markAsUsed(id: string): Promise<void>;
}
