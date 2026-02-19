/**
 * Error constants for zarp-cms (media management)
 * Format: 'STATUS_CODE:Error message'
 * 
 * These constants follow the project pattern of combining HTTP status codes
 * with descriptive error messages for consistent error handling.
 */

// Media Asset Errors
export const ERROR_ASSET_NOT_FOUND = '404:Media asset not found';
export const ERROR_STORAGE_PROVIDER_ERROR = '500:Storage provider operation failed';
export const ERROR_IMAGE_PROCESSING_FAILED = '500:Image processing failed';

// Media Collection Errors
export const ERROR_COLLECTION_NOT_FOUND = '404:Media collection not found';
export const ERROR_COLLECTION_SLUG_EXISTS = '409:Collection slug already exists for this tenant';
export const ERROR_COLLECTION_LIMIT_EXCEEDED = '400:Collection has reached its maximum item limit';
export const ERROR_COLLECTION_NOT_EMPTY = '400:Cannot delete collection that contains assets';

// Validation Errors
export const ERROR_INVALID_FILE_TYPE = '422:File type not allowed for this collection';
export const ERROR_FILE_SIZE_EXCEEDED = '422:File size exceeds collection maximum';

// Relation Errors
export const ERROR_RELATION_ALREADY_EXISTS = '409:Asset is already attached to this entity with this relation type';
