export class AttachmentNotFoundError extends Error {
  constructor(attachmentId: string) {
    super(`Attachment with ID ${attachmentId} not found`);
    this.name = 'AttachmentNotFoundError';
  }
}
