export class ImageLimitExceededError extends Error {
  constructor(message: string = 'Article has reached the maximum number of images') {
    super(message);
    this.name = 'ImageLimitExceededError';
  }
}
