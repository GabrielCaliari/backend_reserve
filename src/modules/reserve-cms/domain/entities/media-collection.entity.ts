import { ECollectionType } from '../enums/collection-type.enum';

export interface ICreateMediaCollection {
  name: string;
  slug: string;
  description?: string;
  type: ECollectionType;
  max_file_size?: number;
  allowed_mime_types?: string[];
  max_items?: number;
  tenant_id: string;
}

export class MediaCollection {
  public readonly id?: string; // UUID (12-character cuid)
  public name: string;
  public slug: string;
  public description?: string;
  public type: ECollectionType;
  public max_file_size?: number;
  public allowed_mime_types?: string[];
  public max_items?: number;
  public tenant_id: string;
  public created_at?: Date;
  public updated_at?: Date;

  constructor(data: ICreateMediaCollection) {
    this.name = data.name;
    this.slug = data.slug;
    this.description = data.description;
    this.type = data.type;
    this.max_file_size = data.max_file_size;
    this.allowed_mime_types = data.allowed_mime_types;
    this.max_items = data.max_items;
    this.tenant_id = data.tenant_id;
  }

  /**
   * Validates if a file size is within the collection's maximum allowed size.
   * 
   * @param size - The file size in bytes to validate
   * @returns true if the file size is valid (within limit or no limit set), false otherwise
   * 
   * **Validates: Requirements 2.3, 4.2**
   */
  validateFileSize(size: number): boolean {
    if (!this.max_file_size) return true;
    return size <= this.max_file_size;
  }

  /**
   * Validates if a mime type is allowed by the collection's rules.
   * Supports wildcard patterns:
   * - '*' matches any mime type
   * - 'image/*' matches any mime type starting with 'image/'
   * - 'image/jpeg' matches exact mime type
   * 
   * @param mimeType - The mime type to validate (e.g., 'image/jpeg', 'application/pdf')
   * @returns true if the mime type is allowed (matches rules or no rules set), false otherwise
   * 
   * **Validates: Requirements 2.4, 2.6, 4.3**
   */
  validateMimeType(mimeType: string): boolean {
    if (!this.allowed_mime_types || this.allowed_mime_types.length === 0) {
      return true;
    }

    return this.allowed_mime_types.some((allowed) => {
      // Match wildcard '*' - allows any mime type
      if (allowed === '*') return true;

      // Match wildcard pattern 'type/*' (e.g., 'image/*')
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, -2);
        return mimeType.startsWith(prefix + '/');
      }

      // Match exact mime type
      return allowed === mimeType;
    });
  }

  /**
   * Checks if more items can be added to the collection based on max_items limit.
   * 
   * @param currentCount - The current number of items in the collection
   * @returns true if more items can be added (below limit or no limit set), false otherwise
   * 
   * **Validates: Requirements 2.5, 4.4**
   */
  canAddMoreItems(currentCount: number): boolean {
    if (!this.max_items) return true;
    return currentCount < this.max_items;
  }
}
