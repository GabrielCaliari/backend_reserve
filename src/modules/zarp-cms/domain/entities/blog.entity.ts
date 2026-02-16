export class Blog {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  secret_key_hash: string;
  secret_key_salt: string;
  tenant_id: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;

  constructor(partial: Partial<Blog>) {
    Object.assign(this, partial);
    this.active = partial.active ?? true;
    this.created_at = partial.created_at ?? new Date();
    this.updated_at = partial.updated_at ?? new Date();
  }
}
