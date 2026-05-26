/**
 * Domain Error: Invalid File Type
 * 
 * Thrown when a file's mime type does not match the collection's allowed_mime_types.
 * This is a pure domain error with business language - no HTTP status codes.
 * 
 * Validates: Requirement 13.4
 */
export class InvalidFileTypeError extends Error {
  constructor(mimeType: string, allowedTypes: string[]) {
    super(`File type '${mimeType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    this.name = 'InvalidFileTypeError';
  }
}
