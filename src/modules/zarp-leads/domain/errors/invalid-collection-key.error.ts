export class InvalidCollectionKeyError extends Error {
  constructor() {
    super('Invalid or missing collection secret key');
    this.name = 'InvalidCollectionKeyError';
  }
}
