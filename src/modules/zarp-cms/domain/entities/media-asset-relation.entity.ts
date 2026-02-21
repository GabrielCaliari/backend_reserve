export interface ICreateMediaAssetRelation {
  asset_id: string; // UUID reference to MediaAsset
  entity_type: string;
  entity_id: string; // Polymorphic: can be UUID or integer (stored as string)
  entity_id_type: 'uuid' | 'int'; // Discriminator for entity_id format
  relation_type: string;
  display_order?: number;
  metadata?: Record<string, any>;
}

/**
 * MediaAssetRelation Entity
 * 
 * Represents a polymorphic relation between a MediaAsset and any entity type.
 * This enables flexible attachment of media to articles, brands, companies, users, etc.
 * 
 * **Key Features:**
 * - Polymorphic: Works with any entity_type without code changes
 * - Lowercase normalization: entity_type and relation_type are stored in lowercase
 * - Ordered: Supports display_order for sorting
 * - Extensible: metadata field for additional context
 * - UUID Support: Handles both UUID and integer entity IDs via entity_id_type discriminator
 * 
 * **Validates: Requirements 3.1, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4, 17.3, 17.4, 17.6**
 */
export class MediaAssetRelation {
  public readonly id?: string; // UUID (12-character cuid)
  public asset_id: string; // UUID reference to MediaAsset
  public entity_type: string;
  public entity_id: string; // Polymorphic: can be UUID or integer (stored as string)
  public entity_id_type: 'uuid' | 'int'; // Discriminator for entity_id format
  public relation_type: string;
  public display_order?: number;
  public metadata?: Record<string, any>;
  public created_at?: Date;

  constructor(data: ICreateMediaAssetRelation) {
    this.asset_id = data.asset_id;
    this.entity_type = data.entity_type.toLowerCase();
    this.entity_id = data.entity_id;
    this.entity_id_type = data.entity_id_type;
    this.relation_type = data.relation_type.toLowerCase();
    this.display_order = data.display_order;
    this.metadata = data.metadata;
  }

  /**
   * Updates the display order for sorting relations
   * 
   * @param newOrder - The new display order value
   */
  updateOrder(newOrder: number): void {
    this.display_order = newOrder;
  }

  /**
   * Checks if the entity_id is a UUID format
   * 
   * @returns true if entity_id_type is 'uuid', false otherwise
   */
  isUuidEntity(): boolean {
    return this.entity_id_type === 'uuid';
  }

  /**
   * Gets the entity_id as a number (for integer entity types)
   * 
   * @returns The entity_id parsed as a number
   * @throws Error if entity_id_type is not 'int'
   */
  getEntityIdAsNumber(): number {
    if (this.entity_id_type !== 'int') {
      throw new Error('Cannot convert UUID entity_id to number');
    }
    return parseInt(this.entity_id, 10);
  }
}
