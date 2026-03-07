export const LEAD_ATTACHMENT_REPOSITORY = Symbol('LEAD_ATTACHMENT_REPOSITORY');

export interface LeadAttachmentData {
  id: string;
  leadId: string;
  assetId: string;
  label?: string;
  createdAt: Date;
}

export interface ILeadAttachmentRepository {
  create(leadId: string, assetId: string, label?: string): Promise<LeadAttachmentData>;
  findByLeadId(leadId: string): Promise<LeadAttachmentData[]>;
  findById(id: string): Promise<LeadAttachmentData | null>;
  delete(id: string): Promise<void>;
  deleteByLeadId(leadId: string): Promise<void>;
}
