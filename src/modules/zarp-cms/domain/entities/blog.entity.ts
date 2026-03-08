export class Blog {
  public readonly id?: string; // UUID (12 characters)
  public name: string;
  public description: string | null;
  public secretKeyHash: string;
  public secretKeySalt: string;
  public mediaCollectionId: string | null;
  public tenantId: string;
  public active: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: {
    id?: string;
    name: string;
    description?: string | null;
    secretKeyHash: string;
    secretKeySalt: string;
    mediaCollectionId?: string | null;
    tenantId: string;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description ?? null;
    this.secretKeyHash = data.secretKeyHash;
    this.secretKeySalt = data.secretKeySalt;
    this.mediaCollectionId = data.mediaCollectionId ?? null;
    this.tenantId = data.tenantId;
    this.active = data.active ?? true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  validateName(): boolean {
    return this.name.length > 0 && this.name.length <= 150;
  }
}
