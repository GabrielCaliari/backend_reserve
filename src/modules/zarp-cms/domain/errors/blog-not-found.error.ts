export class BlogNotFoundError extends Error {
  constructor(message: string = 'Blog not found') {
    super(message);
    this.name = 'BlogNotFoundError';
  }
}
