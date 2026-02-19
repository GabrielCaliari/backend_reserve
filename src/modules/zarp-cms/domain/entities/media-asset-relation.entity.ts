export interface ICreateMediaAssetRelation {
  asset_id: number;
  entity_type: string;
  entity_id: number;
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
 * 
 * **Validates: Requirements 3.1, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4**
 */
export class MediaAssetRelation {
  public readonly id?: number;
  public asset_id: number;
  public entity_type: string;
  public entity_id: number;
  public relation_type: string;
  public display_order?: number;
  public metadata?: Record<string, any>;
  public created_at?: Date;

  constructor(data: ICreateMediaAssetRelation) {
    this.asset_id = data.asset_id;
    this.entity_type = data.entity_type.toLowerCase();
    this.entity_id = data.entity_id;
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
}
