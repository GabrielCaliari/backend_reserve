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
  selectById(id: number): Promise<any>;
  selectBySlug(slug: string): Promise<any>;
  selectAll(): Promise<any[]>;
  update(id: number, data: IUpdateTenant): Promise<any>;
}

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
