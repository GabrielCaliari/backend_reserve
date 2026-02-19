/**
 * Domain Error: Relation Already Exists
 * 
 * Thrown when attempting to create a duplicate MediaAssetRelation.
 * The combination of (asset_id, entity_type, entity_id, relation_type) must be unique.
 * This is a pure domain error with business language - no HTTP status codes.
 * 
 * Validates: Requirement 13.6
 */
export class RelationAlreadyExistsError extends Error {
  constructor(
    assetId: number,
    entityType: string,
    entityId: number,
    relationType: string,
  ) {
    super(
      `Asset ${assetId} is already attached to ${entityType} ${entityId} with relation type '${relationType}'`,
    );
    this.name = 'RelationAlreadyExistsError';
  }
}
