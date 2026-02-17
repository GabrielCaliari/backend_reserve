export class CollectionInactiveError extends Error {
  constructor(slug: string) {
    super(`Collection is inactive: ${slug}`);
    this.name = 'CollectionInactiveError';
  }
}
