/**
 * Domain Error: Collection Not Found
 * 
 * Thrown when a MediaCollection with the specified identifier (ID or slug) does not exist.
 * This is a pure domain error with business language - no HTTP status codes.
 * 
 * Validates: Requirement 13.2
 */
export class CollectionNotFoundError extends Error {
  constructor(identifier: string | number) {
    super(`Media collection ${identifier} not found`);
    this.name = 'CollectionNotFoundError';
  }
}
