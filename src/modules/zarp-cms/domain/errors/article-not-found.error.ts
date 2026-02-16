export class ArticleNotFoundError extends Error {
  constructor(message: string = 'Article not found') {
    super(message);
    this.name = 'ArticleNotFoundError';
  }
}
