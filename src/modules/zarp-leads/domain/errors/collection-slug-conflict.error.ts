export class CollectionSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Collection slug already exists: ${slug}`);
    this.name = 'CollectionSlugConflictError';
  }
}
