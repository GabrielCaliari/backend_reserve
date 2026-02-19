/**
 * Domain Error: File Size Exceeded
 * 
 * Thrown when a file's size exceeds the collection's max_file_size limit.
 * This is a pure domain error with business language - no HTTP status codes.
 * 
 * Validates: Requirement 13.5
 */
export class FileSizeExceededError extends Error {
  constructor(size: number, maxSize: number) {
    super(`File size ${size} bytes exceeds maximum allowed size of ${maxSize} bytes`);
    this.name = 'FileSizeExceededError';
  }
}
