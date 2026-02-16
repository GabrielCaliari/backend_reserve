export class ArticleSlugConflictError extends Error {
  constructor(message: string = 'Article slug already exists') {
    super(message);
    this.name = 'ArticleSlugConflictError';
  }
}
