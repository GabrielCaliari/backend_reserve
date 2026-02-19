import { MediaAsset } from '../../domain/entities/media-asset.entity';

/**
 * MediaAsset Presenter
 * 
 * Transforms MediaAsset domain entities into API response format.
 * Keeps controllers thin by handling response formatting logic.
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 */
export class MediaAssetPresenter {
  /**
   * Presents a single MediaAsset entity
   */
  static present(asset: MediaAsset) {
    return {
      id: asset.id,
      url: asset.url,
      storage_key: asset.storage_key,
      filename: asset.filename,
      mime_type: asset.mime_type,
      file_size: asset.file_size,
      width: asset.width,
      height: asset.height,
      alt_text: asset.alt_text,
      metadata: asset.metadata,
      status: asset.status,
      collection_id: asset.collection_id,
      tenant_id: asset.tenant_id,
      created_by: asset.created_by,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
    };
  }

  /**
   * Presents a list of MediaAsset entities
   */
  static presentList(assets: MediaAsset[]) {
    return assets.map((asset) => this.present(asset));
  }

  /**
   * Presents a paginated result of MediaAsset entities
   */
  static presentPaginated(result: {
    data: MediaAsset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }) {
    return {
      data: this.presentList(result.data),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
