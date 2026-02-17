export class CollectionNotFoundError extends Error {
  constructor(identifier: string | number) {
    super(`Collection not found: ${identifier}`);
    this.name = 'CollectionNotFoundError';
  }
}
