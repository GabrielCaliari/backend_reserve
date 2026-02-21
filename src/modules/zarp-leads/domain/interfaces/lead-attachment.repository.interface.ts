export const LEAD_ATTACHMENT_REPOSITORY = Symbol('LEAD_ATTACHMENT_REPOSITORY');

export interface LeadAttachmentData {
  id: number;
  leadId: string;
  assetId: number;
  label?: string;
  createdAt: Date;
}

export interface ILeadAttachmentRepository {
  create(leadId: string, assetId: number, label?: string): Promise<LeadAttachmentData>;
  findByLeadId(leadId: string): Promise<LeadAttachmentData[]>;
  findById(id: number): Promise<LeadAttachmentData | null>;
  delete(id: number): Promise<void>;
  deleteByLeadId(leadId: string): Promise<void>;
}
