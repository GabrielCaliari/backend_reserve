/**
 * Tenant domain entity.
 * Represents a client company that uses the Zarp platform.
 * Each tenant has its own CMS, metrics, and admin users.
 */
export class Tenant {
  public readonly id?: number;
  public name: string;
  public slug: string;
  public domain: string | null;
  public active: boolean;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;

  constructor(data: {
    id?: number;
    name: string;
    slug: string;
    domain?: string | null;
    active?: boolean;
    created_at?: Date;
    updated_at?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.domain = data.domain ?? null;
    this.active = data.active ?? true;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  deactivate(): void {
    this.active = false;
  }

  activate(): void {
    this.active = true;
  }
}
