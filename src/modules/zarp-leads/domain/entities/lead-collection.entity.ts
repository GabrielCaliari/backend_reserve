export class LeadCollection {
  public readonly id?: number;
  public name: string;
  public slug: string;
  public source: string;
  public secretKeyHash: string;
  public secretKeySalt: string;
  public active: boolean;
  public tenantId: number;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: {
    id?: number;
    name: string;
    slug: string;
    source: string;
    secretKeyHash: string;
    secretKeySalt: string;
    active?: boolean;
    tenantId: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.source = data.source;
    this.secretKeyHash = data.secretKeyHash;
    this.secretKeySalt = data.secretKeySalt;
    this.active = data.active ?? true;
    this.tenantId = data.tenantId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  isActive(): boolean {
    return this.active;
  }
}
