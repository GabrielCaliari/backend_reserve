import { Inject, Injectable } from '@nestjs/common';
import { 
  ILeadAttachmentRepository, 
  LEAD_ATTACHMENT_REPOSITORY 
} from '../../domain/interfaces/lead-attachment.repository.interface';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { AttachmentNotFoundError } from '../../domain/errors/attachment-not-found.error';

@Injectable()
export class RemoveLeadAttachmentUseCase {
  constructor(
    @Inject(LEAD_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: ILeadAttachmentRepository,
  ) {}

  async execute(attachmentId: string) {
    try {
      // Verify attachment exists
      const attachment = await this.attachmentRepository.findById(attachmentId);
      if (!attachment) {
        throw new AttachmentNotFoundError(attachmentId);
      }

      // Delete attachment (does not delete the media asset itself)
      await this.attachmentRepository.delete(attachmentId);

      return successResponse({ message: 'Attachment removed successfully' });
    } catch (err) {
      if (err instanceof AttachmentNotFoundError) {
        return errorResponse('404:Attachment not found', 404);
      }
      return errorResponse('500:Failed to remove attachment', 500, err);
    }
  }
}
