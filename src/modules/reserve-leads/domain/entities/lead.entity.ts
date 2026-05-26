import { Prisma } from "../../../../generated/prisma/client";
import Email from '../../../../shared/domain/value-objects/email.vo';
import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';

export enum EOriginLead {
  seo_tool = 1,
  seo_archive = 2,
  email = 3,
  facebook_ads = 4,
  google_ads = 5,
  page = 6,
}

export enum ELeadStatus {
  new = 1,
  archived = 8,
}

export class Lead {
  public id?: string;
  public name?: string;
  public email?: Email;
  public phone_number?: PhoneNumber;
  public origin: EOriginLead;
  public origin_font?: string;
  public description?: string;
  public data?: Prisma.InputJsonValue;
  public status: ELeadStatus;
  public created_at?: Date;
  public updated_at?: Date;
  public collectionId?: string;
  public tenantId?: string;
  public ipAddress?: string;
  public userAgent?: string;
  public country?: string;
  public city?: string;
  public region?: string;

  constructor(lead: Lead) {
    this.id = lead.id ?? null;
    this.name = lead.name ?? null;
    this.email = lead.email ?? null;
    this.phone_number = lead.phone_number ?? null;
    this.origin = lead.origin;
    this.origin_font = lead.origin_font ?? null;
    this.description = lead.description ?? null;
    this.data = lead.data;
    this.status = lead.status;
    this.created_at = lead.created_at ?? null;
    this.updated_at = lead.updated_at ?? null;
    this.collectionId = lead.collectionId ?? null;
    this.tenantId = lead.tenantId ?? null;
    this.ipAddress = lead.ipAddress ?? null;
    this.userAgent = lead.userAgent ?? null;
    this.country = lead.country ?? null;
    this.city = lead.city ?? null;
    this.region = lead.region ?? null;
  }
}
