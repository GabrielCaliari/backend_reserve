import { EAssetStatus } from '../enums/asset-status.enum';

export interface ICreateMediaAsset {
  url: string;
  storage_key: string;
  filename: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  alt_text?: string;
  metadata?: Record<string, any>;
  status?: EAssetStatus;
  collection_id: string; // UUID reference to MediaCollection
  tenant_id: string;
  created_by: string;
}

export class MediaAsset {
  public readonly id?: string; // UUID (12-character cuid)
  public url: string;
  public storage_key: string;
  public filename: string;
  public mime_type: string;
  public file_size: number;
  public width?: number;
  public height?: number;
  public alt_text?: string;
  public metadata?: Record<string, any>;
  public status: EAssetStatus;
  public collection_id: string; // UUID reference to MediaCollection
  public tenant_id: string;
  public created_by: string;
  public created_at?: Date;
  public updated_at?: Date;

  constructor(data: ICreateMediaAsset) {
    // Validate required fields
    if (!data.url || data.url.trim().length === 0) {
      throw new Error('URL is required');
    }
    if (!data.storage_key || data.storage_key.trim().length === 0) {
      throw new Error('Storage key is required');
    }
    if (!data.filename || data.filename.trim().length === 0) {
      throw new Error('Filename is required');
    }
    if (!data.mime_type || data.mime_type.trim().length === 0) {
      throw new Error('Mime type is required');
    }
    if (data.file_size <= 0) {
      throw new Error('File size must be greater than 0');
    }
    if (!data.collection_id || data.collection_id.trim().length === 0) {
      throw new Error('Collection ID is required');
    }
    if (!data.tenant_id || data.tenant_id.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }
    if (!data.created_by || data.created_by.trim().length === 0) {
      throw new Error('Created by is required');
    }

    this.url = data.url;
    this.storage_key = data.storage_key;
    this.filename = data.filename;
    this.mime_type = data.mime_type;
    this.file_size = data.file_size;
    this.width = data.width;
    this.height = data.height;
    this.alt_text = data.alt_text;
    this.metadata = data.metadata;
    this.status = data.status || EAssetStatus.processing;
    this.collection_id = data.collection_id;
    this.tenant_id = data.tenant_id;
    this.created_by = data.created_by;
  }

  /**
   * Marks the asset as ready for use after successful processing
   */
  markAsReady(): void {
    this.status = EAssetStatus.ready;
  }

  /**
   * Marks the asset as failed if processing or upload encountered errors
   */
  markAsFailed(): void {
    this.status = EAssetStatus.failed;
  }

  /**
   * Archives the asset, making it inactive but preserving the record
   */
  archive(): void {
    this.status = EAssetStatus.archived;
  }

  /**
   * Updates the asset's metadata fields
   * @param alt_text - Optional alternative text for accessibility
   * @param metadata - Optional additional metadata as key-value pairs
   */
  updateMetadata(alt_text?: string, metadata?: Record<string, any>): void {
    if (alt_text !== undefined) {
      this.alt_text = alt_text;
    }
    if (metadata !== undefined) {
      this.metadata = { ...this.metadata, ...metadata };
    }
  }
}
