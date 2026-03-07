import { Inject, Injectable } from '@nestjs/common';
import { ILeadRepository, LEAD_REPOSITORY } from '../../domain/interfaces/lead.repository.interface';
import { 
  ILeadAttachmentRepository, 
  LEAD_ATTACHMENT_REPOSITORY 
} from '../../domain/interfaces/lead-attachment.repository.interface';
import { errorResponse, successResponse } from '../../../../shared/helpers';

@Injectable()
export class AttachFileToLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leadRepository: ILeadRepository,
    @Inject(LEAD_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: ILeadAttachmentRepository,
  ) {}

  async execute(leadId: string, assetId: string, label?: string) {
    try {
      // Verify lead exists
      const lead = await this.leadRepository.findById(leadId);
      if (!lead) {
        return errorResponse('404:Lead not found', 404);
      }

      // Create attachment
      const attachment = await this.attachmentRepository.create(leadId, assetId, label);

      return successResponse({ id: attachment.id }, 201);
    } catch (err) {
      return errorResponse('500:Failed to attach file to lead', 500, err);
    }
  }
}
