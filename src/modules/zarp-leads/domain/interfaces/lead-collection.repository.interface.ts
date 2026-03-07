import { LeadCollection } from '../entities/lead-collection.entity';

export const LEAD_COLLECTION_REPOSITORY = Symbol('LEAD_COLLECTION_REPOSITORY');

export interface ILeadCollectionRepository {
  create(collection: LeadCollection): Promise<LeadCollection>;
  findById(id: string, tenantId?: string): Promise<LeadCollection | null>;
  findBySlugAndTenantId(slug: string, tenantId: string): Promise<LeadCollection | null>;
  findBySlug(slug: string): Promise<LeadCollection | null>;
  findBySecretKey(hash: string): Promise<LeadCollection | null>;
  findAllByTenantId(tenantId: string, query?: { page?: number; limit?: number; active?: boolean }): Promise<{ collections: LeadCollection[]; total: number }>;
  findAll(query?: { page?: number; limit?: number; active?: boolean; tenant_id?: string }): Promise<{ collections: LeadCollection[]; total: number }>;
  update(id: string, collection: Partial<LeadCollection>): Promise<LeadCollection>;
  count(tenantId: string): Promise<number>;
}
