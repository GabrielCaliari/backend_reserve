import { Article } from './article.entity';
import { EArticleStatus } from '../enums/article-status.enum';

const makeArticle = (overrides: Partial<ConstructorParameters<typeof Article>[0]> = {}): Article =>
  new Article({
    displayTitle: 'Test Article',
    metaTitle: 'Test Meta',
    content: 'Some content here',
    slug: 'test-article',
    authorId: 'author123456789012345',
    blogId: 'blog1234567890123456',
    createdBy: 'admin123456789012345',
    coverImageId: 'cover123456789012345',
    ...overrides,
  });

describe('Article.schedule()', () => {
  it('sets status to scheduled and stores scheduledAt when date is in the future', () => {
    const article = makeArticle();
    const future = new Date(Date.now() + 60_000);
    article.schedule(future);
    expect(article.status).toBe(EArticleStatus.scheduled);
    expect(article.scheduledAt).toEqual(future);
    expect(article.publishedAt).toBeNull();
  });

  it('throws when scheduledAt is in the past', () => {
    const article = makeArticle();
    const past = new Date(Date.now() - 60_000);
    expect(() => article.schedule(past)).toThrow('scheduledAt must be in the future');
  });

  it('throws when required fields are missing (no coverImageId)', () => {
    const article = makeArticle({ coverImageId: null });
    const future = new Date(Date.now() + 60_000);
    expect(() => article.schedule(future)).toThrow();
  });
});

describe('Article.updatePublishedAt()', () => {
  it('keeps status published and updates publishedAt when date is in the past', () => {
    const article = makeArticle({ status: EArticleStatus.published, publishedAt: new Date() });
    const past = new Date(Date.now() - 60_000);
    article.updatePublishedAt(past);
    expect(article.status).toBe(EArticleStatus.published);
    expect(article.publishedAt).toEqual(past);
    expect(article.scheduledAt).toBeNull();
  });

  it('changes status to scheduled and sets scheduledAt when date is in the future', () => {
    const article = makeArticle({ status: EArticleStatus.published, publishedAt: new Date() });
    const future = new Date(Date.now() + 60_000);
    article.updatePublishedAt(future);
    expect(article.status).toBe(EArticleStatus.scheduled);
    expect(article.scheduledAt).toEqual(future);
    expect(article.publishedAt).toBeNull();
  });

  it('throws when article is in draft status', () => {
    const article = makeArticle({ status: EArticleStatus.draft });
    expect(() => article.updatePublishedAt(new Date())).toThrow(
      'updatePublishedAt is only valid for published or scheduled articles',
    );
  });

  it('works when article is in scheduled status', () => {
    const article = makeArticle({
      status: EArticleStatus.scheduled,
      scheduledAt: new Date(Date.now() + 3600_000),
    });
    const past = new Date(Date.now() - 60_000);
    article.updatePublishedAt(past);
    expect(article.status).toBe(EArticleStatus.published);
    expect(article.publishedAt).toEqual(past);
  });
});
