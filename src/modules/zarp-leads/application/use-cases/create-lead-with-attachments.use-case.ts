import { Inject, Injectable } from '@nestjs/common';
import { ILeadRepository, LEAD_REPOSITORY } from '../../domain/interfaces/lead.repository.interface';
import { 
  ILeadAttachmentRepository, 
  LEAD_ATTACHMENT_REPOSITORY 
} from '../../domain/interfaces/lead-attachment.repository.interface';
import { Lead, ELeadStatus } from '../../domain/entities/lead.entity';
import { CreateLeadWithAttachmentsDto } from '../dtos/create-lead-with-attachments.dto';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import Email from '../../../../shared/domain/value-objects/email.vo';
import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';

@Injectable()
export class CreateLeadWithAttachmentsUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepository: ILeadRepository,
    @Inject(LEAD_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: ILeadAttachmentRepository,
  ) {}

  async execute(dto: CreateLeadWithAttachmentsDto, collection?: { id: number; tenantId: number }) {
    try {
      // Create lead entity
      const lead = new Lead({
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.email ? { email: new Email(dto.email) } : {}),
        ...(dto.phone_number ? { phone_number: new PhoneNumber(dto.phone_number) } : {}),
        ...(dto.origin_font ? { origin_font: dto.origin_font } : {}),
        ...(dto.description ? { description: dto.description } : {}),
        ...(dto.data ? { data: dto.data } : {}),
        origin: dto.origin,
        status: ELeadStatus.new,
        ...(collection ? { collectionId: collection.id, tenantId: collection.tenantId } : {}),
      });

      // Save lead
      const savedLead = await this.leadRepository.create(lead);

      // Attach files if provided
      if (dto.attachments && dto.attachments.length > 0) {
        for (const attachment of dto.attachments) {
          await this.attachmentRepository.create(
            savedLead.id!,
            attachment.asset_id,
            attachment.label
          );
        }
      }

      return successResponse({ id: savedLead.id }, 201);
    } catch (err) {
      return errorResponse('500:Failed to create lead with attachments', 500, err);
    }
  }
}
