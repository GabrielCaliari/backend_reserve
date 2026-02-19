/**
 * Error Constants for CMS Generic Storage
 * 
 * Format: 'STATUS:MESSAGE'
 * These constants are used by the application layer to convert domain errors
 * into ServiceResponse objects with appropriate HTTP status codes.
 * 
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8**
 */

// Asset Errors (404, 500)
export const ERROR_ASSET_NOT_FOUND = '404:Media asset not found';
export const ERROR_CREATE_ASSET = '500:Failed to create media asset';
export const ERROR_UPDATE_ASSET = '500:Failed to update media asset';
export const ERROR_DELETE_ASSET = '500:Failed to delete media asset';

// Collection Errors (404, 409, 400, 500)
export const ERROR_COLLECTION_NOT_FOUND = '404:Media collection not found';
export const ERROR_COLLECTION_SLUG_EXISTS = '409:Collection slug already exists for this tenant';
export const ERROR_COLLECTION_LIMIT_EXCEEDED = '400:Collection has reached its maximum item limit';
export const ERROR_COLLECTION_NOT_EMPTY = '400:Cannot delete collection that contains assets';
export const ERROR_CREATE_COLLECTION = '500:Failed to create media collection';
export const ERROR_UPDATE_COLLECTION = '500:Failed to update media collection';
export const ERROR_DELETE_COLLECTION = '500:Failed to delete media collection';

// Validation Errors (422, 400)
export const ERROR_INVALID_FILE_TYPE = '422:File type not allowed for this collection';
export const ERROR_FILE_SIZE_EXCEEDED = '422:File size exceeds collection maximum';
export const ERROR_INVALID_MIME_TYPE = '422:Invalid mime type format';
export const ERROR_INVALID_FILE = '400:Invalid file upload';

// Relation Errors (409, 404, 500)
export const ERROR_RELATION_ALREADY_EXISTS = '409:Asset is already attached to this entity with this relation type';
export const ERROR_RELATION_NOT_FOUND = '404:Media relation not found';
export const ERROR_CREATE_RELATION = '500:Failed to create media relation';
export const ERROR_DELETE_RELATION = '500:Failed to delete media relation';
export const ERROR_UPDATE_RELATION_ORDER = '500:Failed to update relation order';

// Storage Provider Errors (500)
export const ERROR_STORAGE_PROVIDER_ERROR = '500:Storage provider operation failed';
export const ERROR_STORAGE_UPLOAD_FAILED = '500:Failed to upload file to storage';
export const ERROR_STORAGE_DELETE_FAILED = '500:Failed to delete file from storage';

// Image Processing Errors (500)
export const ERROR_IMAGE_PROCESSING_FAILED = '500:Image processing failed';
export const ERROR_IMAGE_CONVERSION_FAILED = '500:Failed to convert image to WebP';
export const ERROR_IMAGE_METADATA_FAILED = '500:Failed to extract image metadata';

// General Errors
export const ERROR_INTERNAL_SERVER = '500:Internal server error';
export const ERROR_UNAUTHORIZED = '401:Unauthorized access';
export const ERROR_FORBIDDEN = '403:Forbidden access';
