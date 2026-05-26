export interface ICreateUserCollection {
  name: string;
  slug: string;
  description?: string | null;
  tenant_id: string;
  active?: boolean;
}

export interface IUpdateUserCollection {
  name?: string;
  slug?: string;
  description?: string | null;
  active?: boolean;
}

export interface IUserCollectionRepository {
  create(data: ICreateUserCollection): Promise<any>;
  findById(id: string, tenantId?: string): Promise<any>;
  findBySlugAndTenantId(slug: string, tenantId: string): Promise<any>;
  findAllByTenantId(tenantId: string): Promise<any[]>;
  findAllByUserId(userId: string, tenantId?: string): Promise<any[]>;
  update(id: string, data: IUpdateUserCollection): Promise<any>;
  deactivate(id: string): Promise<any>;
}

export const USER_COLLECTION_REPOSITORY = Symbol('USER_COLLECTION_REPOSITORY');