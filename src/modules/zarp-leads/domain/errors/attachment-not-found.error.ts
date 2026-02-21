export class AttachmentNotFoundError extends Error {
  constructor(attachmentId: number) {
    super(`Attachment with ID ${attachmentId} not found`);
    this.name = 'AttachmentNotFoundError';
  }
}
