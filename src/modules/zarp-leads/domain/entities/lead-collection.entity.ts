import { EAccessMode } from '../enums/access-mode.enum';

export class LeadCollection {
  id?: number;
  name: string;
  slug: string;
  source: string;
  accessMode: EAccessMode;
  allowedDomains: string[];
  active: boolean;
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
}
