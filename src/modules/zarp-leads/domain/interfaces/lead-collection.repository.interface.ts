import { LeadCollection } from '../entities/lead-collection.entity';

export const LEAD_COLLECTION_REPOSITORY = Symbol('LEAD_COLLECTION_REPOSITORY');

export interface ILeadCollectionRepository {
  create(collection: LeadCollection): Promise<LeadCollection>;
  findById(id: number, tenantId?: number): Promise<LeadCollection | null>;
  findBySlugAndTenantId(slug: string, tenantId: number): Promise<LeadCollection | null>;
  findBySlug(slug: string): Promise<LeadCollection | null>;
  findBySecretKey(hash: string): Promise<LeadCollection | null>;
  findAllByTenantId(tenantId: number, query?: { page?: number; limit?: number; active?: boolean }): Promise<{ collections: LeadCollection[]; total: number }>;
  findAll(query?: { page?: number; limit?: number; active?: boolean; tenant_id?: number }): Promise<{ collections: LeadCollection[]; total: number }>;
  update(id: number, collection: Partial<LeadCollection>): Promise<LeadCollection>;
  count(tenantId: number): Promise<number>;
}
