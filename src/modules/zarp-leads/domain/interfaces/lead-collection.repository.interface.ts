import { LeadCollection } from '../entities/lead-collection.entity';

export const LEAD_COLLECTION_REPOSITORY = Symbol('LEAD_COLLECTION_REPOSITORY');

export interface ILeadCollectionRepository {
  create(collection: LeadCollection): Promise<LeadCollection>;
  findById(id: number, tenantId?: number): Promise<LeadCollection | null>;
  findBySlugAndTenantId(slug: string, tenantId: number): Promise<LeadCollection | null>;
  findBySlug(slug: string): Promise<LeadCollection | null>;
  getSecrets(id: number): Promise<{ secret_key_hash: string; secret_key_salt: string } | null>;
  findAllByTenantId(tenantId: number, query?: { page?: number; limit?: number; access_mode?: string; active?: boolean }): Promise<{ collections: LeadCollection[]; total: number }>;
  findAll(query?: { page?: number; limit?: number; access_mode?: string; active?: boolean; tenant_id?: number }): Promise<{ collections: LeadCollection[]; total: number }>; // For super admins
  findBySecretKey(hash: string): Promise<LeadCollection | null>;
  update(id: number, collection: LeadCollection): Promise<LeadCollection>;
  count(tenantId: number): Promise<number>;
  updateSecretKey(id: number, hash: string, salt: string): Promise<void>;
  clearSecretKey(id: number): Promise<void>;
}
