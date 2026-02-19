/**
 * Domain Error: Collection Limit Exceeded
 * 
 * Thrown when attempting to add an asset to a collection that has reached its max_items limit.
 * This is a pure domain error with business language - no HTTP status codes.
 * 
 * Validates: Requirement 13.3
 */
export class CollectionLimitExceededError extends Error {
  constructor(collectionName: string, limit: number) {
    super(`Collection '${collectionName}' has reached its maximum limit of ${limit} items`);
    this.name = 'CollectionLimitExceededError';
  }
}
