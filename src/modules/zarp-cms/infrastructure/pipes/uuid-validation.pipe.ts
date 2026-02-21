import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidUUID } from '../../domain/utils/uuid.util';

/**
 * UUID Validation Pipe
 * 
 * Validates that route parameters, query parameters, or body fields
 * contain valid UUID format (12-character cuid).
 * 
 * **Usage in Controllers:**
 * 
 * ```typescript
 * // Validate route parameter
 * @Get(':id')
 * async findOne(@Param('id', UuidValidationPipe) id: string) {
 *   // id is guaranteed to be valid UUID format
 * }
 * 
 * // Validate query parameter
 * @Get()
 * async findByBlog(@Query('blogId', UuidValidationPipe) blogId: string) {
 *   // blogId is guaranteed to be valid UUID format
 * }
 * 
 * // Validate multiple parameters
 * @Get(':blogId/articles/:articleId')
 * async findArticle(
 *   @Param('blogId', UuidValidationPipe) blogId: string,
 *   @Param('articleId', UuidValidationPipe) articleId: string,
 * ) {
 *   // Both IDs are validated
 * }
 * ```
 * 
 * **UUID Format:**
 * - 12 characters
 * - Alphanumeric (case-insensitive)
 * - Example: "ckl1234abcd5"
 * 
 * **Error Response:**
 * Throws BadRequestException with message:
 * "Invalid UUID format for {fieldName}: {value}"
 */
@Injectable()
export class UuidValidationPipe implements PipeTransform<string, string> {
  /**
   * Transform and validate UUID value
   * 
   * @param value - The UUID string to validate
   * @param metadata - Metadata about the parameter being validated
   * @returns The validated UUID string
   * @throws BadRequestException if UUID format is invalid
   */
  transform(value: string, metadata: ArgumentMetadata): string {
    // Get field name for error message
    const fieldName = metadata.data || 'ID';
    
    // Validate UUID format
    if (!isValidUUID(value)) {
      throw new BadRequestException(
        `Invalid UUID format for ${fieldName}: ${value}. Expected 12-character alphanumeric string (cuid format).`
      );
    }
    
    return value;
  }
}
