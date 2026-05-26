/**
 * Domain Error: Asset Not Found
 * 
 * Thrown when a MediaAsset with the specified ID does not exist.
 * This is a pure domain error with business language - no HTTP status codes.
 * 
 * Validates: Requirement 13.1
 */
export class AssetNotFoundError extends Error {
  constructor(assetId: number) {
    super(`Media asset with ID ${assetId} not found`);
    this.name = 'AssetNotFoundError';
  }
}
