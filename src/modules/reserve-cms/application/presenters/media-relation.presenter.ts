import { MediaAssetRelation } from '../../domain/entities/media-asset-relation.entity';

/**
 * MediaRelation Presenter
 * 
 * Transforms MediaAssetRelation domain entities into API response format.
 * Keeps controllers thin by handling response formatting logic.
 * 
 * **Validates: Requirements 7.12, 7.13, 7.14, 7.15**
 */
export class MediaRelationPresenter {
  /**
   * Presents a single MediaAssetRelation entity
   */
  static present(relation: MediaAssetRelation) {
    return {
      id: relation.id,
      asset_id: relation.asset_id,
      entity_type: relation.entity_type,
      entity_id: relation.entity_id,
      relation_type: relation.relation_type,
      display_order: relation.display_order,
      metadata: relation.metadata,
      created_at: relation.created_at,
    };
  }

  /**
   * Presents a list of MediaAssetRelation entities
   */
  static presentList(relations: MediaAssetRelation[]) {
    return relations.map((relation) => this.present(relation));
  }
}
