export interface ICreateTenant {
  name: string;
  slug: string;
  domain?: string;
}

export interface IUpdateTenant {
  name?: string;
  slug?: string;
  domain?: string;
  active?: boolean;
  archived_at?: Date | null;
  deletion_requested_at?: Date | null;
  deletion_scheduled_for_at?: Date | null;
  deletion_requested_by?: string | null;
  deletion_reason?: string | null;
}

export interface ITenantRepository {
  create(data: ICreateTenant): Promise<any>;
  selectById(id: string): Promise<any>;
  selectBySlug(slug: string): Promise<any>;
  selectAll(): Promise<any[]>;
  update(id: string, data: IUpdateTenant): Promise<any>;
  deactivate(id: string): Promise<any>;
  activate(id: string): Promise<any>;
  delete(id: string): Promise<any>;
  scheduleDeletion(id: string, data: Pick<IUpdateTenant, 'archived_at' | 'deletion_requested_at' | 'deletion_scheduled_for_at' | 'deletion_requested_by' | 'deletion_reason'>): Promise<any>;
  restoreDeletion(id: string): Promise<any>;
  findDueForDeletion(now: Date): Promise<any[]>;
}

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
