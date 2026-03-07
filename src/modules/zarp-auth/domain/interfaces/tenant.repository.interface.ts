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
}

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
