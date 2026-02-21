import { EAccessMode } from '../enums/access-mode.enum';
import { CollectionSource } from '../value-objects/collection-source.vo';

export class LeadCollection {
  id?: number;
  name: string;
  slug: string;
  source: string;
  sourceType?: string;
  sourceChannel?: string;
  sourceCampaign?: string;
  accessMode: EAccessMode;
  allowedDomains: string[];
  active: boolean;
  metadata?: any;
  tenantId: number;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(
    init?: Partial<LeadCollection>
  ) {
    if (init) {
      Object.assign(this, init);
    }
  }

  isPublic(): boolean {
    return this.accessMode === EAccessMode.public;
  }

  isPrivate(): boolean {
    return this.accessMode === EAccessMode.private;
  }

  isRestricted(): boolean {
    return this.accessMode === EAccessMode.restricted;
  }

  isActive(): boolean {
    return this.active === true;
  }

  getCollectionSource(): CollectionSource | null {
    if (!this.sourceType) return null;
    return new CollectionSource(this.sourceType, this.sourceChannel, this.sourceCampaign);
  }

  setCollectionSource(source: CollectionSource): void {
    this.sourceType = source.type;
    this.sourceChannel = source.channel;
    this.sourceCampaign = source.campaign;
  }
}
