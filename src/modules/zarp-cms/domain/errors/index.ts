/**
 * Domain Errors Index
 * 
 * Exports all domain errors for the CMS Generic Storage module.
 * These are pure TypeScript errors with business language - no HTTP status codes.
 * The application layer will convert these to ServiceResponse objects.
 */
export { AssetNotFoundError } from './asset-not-found.error';
export { CollectionNotFoundError } from './collection-not-found.error';
export { CollectionLimitExceededError } from './collection-limit-exceeded.error';
export { InvalidFileTypeError } from './invalid-file-type.error';
export { FileSizeExceededError } from './file-size-exceeded.error';
export { RelationAlreadyExistsError } from './relation-already-exists.error';
