import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { 
  ILeadAttachmentRepository, 
  LeadAttachmentData 
} from '../../domain/interfaces/lead-attachment.repository.interface';

@Injectable()
export class PrismaLeadAttachmentRepository implements ILeadAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(leadId: string, assetId: number, label?: string): Promise<LeadAttachmentData> {
    const attachment = await this.prisma.leadAttachment.create({
      data: {
        lead_id: leadId,
        asset_id: String(assetId),
        label,
      },
    });

    return this.toDomain(attachment);
  }

  async findByLeadId(leadId: string): Promise<LeadAttachmentData[]> {
    const attachments = await this.prisma.leadAttachment.findMany({
      where: { lead_id: leadId },
      orderBy: { created_at: 'desc' },
    });

    return attachments.map(this.toDomain);
  }

  async findById(id: number): Promise<LeadAttachmentData | null> {
    const attachment = await this.prisma.leadAttachment.findUnique({
      where: { id },
    });

    return attachment ? this.toDomain(attachment) : null;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.leadAttachment.delete({
      where: { id },
    });
  }

  async deleteByLeadId(leadId: string): Promise<void> {
    await this.prisma.leadAttachment.deleteMany({
      where: { lead_id: leadId },
    });
  }

  private toDomain(raw: any): LeadAttachmentData {
    return {
      id: raw.id,
      leadId: raw.lead_id,
      assetId: raw.asset_id,
      label: raw.label,
      createdAt: raw.created_at,
    };
  }
}
