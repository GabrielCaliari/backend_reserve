import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../../domain/interfaces/article.repository.interface';
import {
  AUTHOR_REPOSITORY,
  IAuthorRepository,
} from '../../domain/interfaces/author.repository.interface';
import {
  BLOG_REPOSITORY,
  IBlogRepository,
} from '../../domain/interfaces/blog.repository.interface';
import {
  MEDIA_ASSET_REPOSITORY,
  IMediaAssetRepository,
} from '../../domain/interfaces/media-asset.repository.interface';
import {
  MEDIA_RELATION_REPOSITORY,
  IMediaRelationRepository,
} from '../../domain/interfaces/media-relation.repository.interface';
import { EArticleStatus } from '../../domain/enums/article-status.enum';
import { Article } from '../../domain/entities/article.entity';

describe('ArticleService', () => {
  let service: ArticleService;
  let articleRepository: jest.Mocked<IArticleRepository>;
  let authorRepository: jest.Mocked<IAuthorRepository>;
  let blogRepository: jest.Mocked<IBlogRepository>;
  let mediaAssetRepository: jest.Mocked<IMediaAssetRepository>;
  let mediaRelationRepository: jest.Mocked<IMediaRelationRepository>;

  beforeEach(async () => {
    const mockArticleRepository: Partial<IArticleRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlugAndBlogId: jest.fn(),
      findByBlogId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findScheduledDue: jest.fn(),
      findByTenantId: jest.fn(),
      countByAuthorId: jest.fn(),
    };

    const mockAuthorRepository: Partial<IAuthorRepository> = {
      findById: jest.fn(),
    };

    const mockBlogRepository: Partial<IBlogRepository> = {
      findById: jest.fn(),
    };

    const mockMediaAssetRepository: Partial<IMediaAssetRepository> = {
      findById: jest.fn(),
    };

    const mockMediaRelationRepository: Partial<IMediaRelationRepository> = {
      create: jest.fn(),
      findByEntity: jest.fn(),
      findByAsset: jest.fn(),
      delete: jest.fn(),
      deleteByAsset: jest.fn(),
      updateOrder: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: ARTICLE_REPOSITORY,
          useValue: mockArticleRepository,
        },
        {
          provide: AUTHOR_REPOSITORY,
          useValue: mockAuthorRepository,
        },
        {
          provide: BLOG_REPOSITORY,
          useValue: mockBlogRepository,
        },
        {
          provide: MEDIA_ASSET_REPOSITORY,
          useValue: mockMediaAssetRepository,
        },
        {
          provide: MEDIA_RELATION_REPOSITORY,
          useValue: mockMediaRelationRepository,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    articleRepository = module.get(ARTICLE_REPOSITORY);
    authorRepository = module.get(AUTHOR_REPOSITORY);
    blogRepository = module.get(BLOG_REPOSITORY);
    mediaAssetRepository = module.get(MEDIA_ASSET_REPOSITORY);
    mediaRelationRepository = module.get(MEDIA_RELATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createArticle', () => {
    it('should create an article successfully', async () => {
      const mockBlog = {
        id: 'blog123',
        name: 'Tech Blog',
        tenantId: 'tenant-1',
        mediaCollectionId: 'collection-1',
        active: true,
      };

      const mockAuthor = {
        id: 'author-1',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-1',
        active: true,
      };

      const mockArticle = {
        id: 'article-1',
        displayTitle: 'Test Article',
        language: 'en_us',
        metaTitle: 'Test Meta',
        content: 'Test content',
        slug: 'test-article',
        status: EArticleStatus.draft,
        blogId: 'blog123',
        authorId: 'author-1',
        createdBy: '1',
      };

      blogRepository.findById.mockResolvedValue(mockBlog as any);
      authorRepository.findById.mockResolvedValue(mockAuthor as any);
      articleRepository.findBySlugAndBlogId.mockResolvedValue(null);
      articleRepository.create.mockResolvedValue(mockArticle as any);

      const result = await service.createArticle(
        'blog123',
        {
          displayTitle: 'Test Article',
          metaTitle: 'Test Meta',
          content: 'Test content',
          slug: 'test-article',
          blogId: 'blog123',
          authorId: 'author-1',
        },
        String(1), // currentAdminId
      );

      expect(result.status).toBe(201);
      expect(articleRepository.create).toHaveBeenCalled();
      expect(articleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en_us',
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return an article by id', async () => {
      const mockArticle = {
        id: '',
        displayTitle: 'Test Article',
        language: 'pt_br',
        metaTitle: 'Test Meta',
        content: 'Test content',
        slug: 'test-article',
        status: EArticleStatus.draft,
      };

      articleRepository.findById.mockResolvedValue(mockArticle as any);

      const result = await service.findById('');

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockArticle);
    });

    it('should return 404 if article not found', async () => {
      articleRepository.findById.mockResolvedValue(null);

      const result = await service.findById('');

      expect(result.status).toBe(404);
    });
  });

  describe('findPublishedByBlogId', () => {
    it('should delegate pagination, filter published articles, and include author data', async () => {
      const publishedArticle = {
        id: 'article-1',
        displayTitle: 'Published Article',
        language: 'pt_br',
        metaTitle: 'Meta title',
        metaDescription: 'Meta description',
        focusKeyword: 'keyword',
        slug: 'published-article',
        content: 'content',
        status: EArticleStatus.published,
        publishedAt: new Date('2026-03-08T12:00:00.000Z'),
        coverImageId: 'cover-1',
        authorId: 'author-1',
      };

      blogRepository.findById.mockResolvedValue({
        id: 'blog-1',
        tenantId: 'tenant-1',
      } as any);

      authorRepository.findById.mockResolvedValue({
        id: 'author-1',
        firstName: 'Jane',
        lastName: 'Doe',
        biography: 'Author bio',
        avatarId: 'asset-1',
        tenantId: 'tenant-1',
        getFullName: () => 'Jane Doe',
      } as any);
      mediaAssetRepository.findById.mockImplementation(async id => {
        if (id === 'asset-1') {
          return {
            id: 'asset-1',
            url: 'https://cdn.example.com/avatar.jpg',
            alt_text: 'Jane Doe',
          } as any;
        }

        if (id === 'cover-1') {
          return {
            id: 'cover-1',
            url: 'https://cdn.example.com/cover.jpg',
            alt_text: 'Published Article',
          } as any;
        }

        return null;
      });

      articleRepository.findByBlogId.mockResolvedValue({
        data: [publishedArticle as any],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      });

      const result = await service.findPublishedByBlogId('blog-1', 2, 5);

      expect(articleRepository.findByBlogId).toHaveBeenCalledWith('blog-1', {
        status: EArticleStatus.published,
        page: 2,
        limit: 5,
      });
      expect(result.total).toBe(1);
      expect(result.data).toEqual([
        {
          id: 'article-1',
          title: 'Published Article',
          language: 'pt_br',
          meta_title: 'Meta title',
          meta_description: 'Meta description',
          focus_keyword: 'keyword',
          slug: 'published-article',
          content: 'content',
          published_at: publishedArticle.publishedAt,
          cover_image: {
            id: 'cover-1',
            url: 'https://cdn.example.com/cover.jpg',
            alt_text: 'Published Article',
          },
          author: {
            id: 'author-1',
            first_name: 'Jane',
            last_name: 'Doe',
            full_name: 'Jane Doe',
            biography: 'Author bio',
            avatar: {
              id: 'asset-1',
              url: 'https://cdn.example.com/avatar.jpg',
              alt_text: 'Jane Doe',
            },
          },
        },
      ]);
    });
  });

  describe('findPublishedBySlug', () => {
    it('should return the public article detail with author data', async () => {
      const publishedAt = new Date('2026-03-08T12:00:00.000Z');
      const createdAt = new Date('2026-03-01T12:00:00.000Z');
      const updatedAt = new Date('2026-03-07T12:00:00.000Z');

      articleRepository.findBySlugAndBlogId.mockResolvedValue({
        id: 'article-1',
        displayTitle: 'Published Article',
        language: 'pt_br',
        metaTitle: 'Meta title',
        metaDescription: 'Meta description',
        focusKeyword: 'keyword',
        slug: 'published-article',
        content: 'content',
        status: EArticleStatus.published,
        publishedAt,
        createdAt,
        updatedAt,
        coverImageId: 'cover-1',
        authorId: 'author-1',
      } as any);
      blogRepository.findById.mockResolvedValue({
        id: 'blog-1',
        tenantId: 'tenant-1',
      } as any);
      authorRepository.findById.mockResolvedValue({
        id: 'author-1',
        firstName: 'Jane',
        lastName: 'Doe',
        biography: 'Author bio',
        avatarId: null,
        tenantId: 'tenant-1',
        getFullName: () => 'Jane Doe',
      } as any);
      mediaAssetRepository.findById.mockResolvedValue({
        id: 'cover-1',
        url: 'https://cdn.example.com/cover.jpg',
        alt_text: 'Published Article',
      } as any);

      const result = await service.findPublishedBySlug('published-article', 'blog-1');

      expect(result).toEqual({
        id: 'article-1',
        title: 'Published Article',
        language: 'pt_br',
        meta_title: 'Meta title',
        meta_description: 'Meta description',
        focus_keyword: 'keyword',
        slug: 'published-article',
        content: 'content',
        status: EArticleStatus.published,
        published_at: publishedAt,
        created_at: createdAt,
        updated_at: updatedAt,
        cover_image: {
          id: 'cover-1',
          url: 'https://cdn.example.com/cover.jpg',
          alt_text: 'Published Article',
        },
        author: {
          id: 'author-1',
          first_name: 'Jane',
          last_name: 'Doe',
          full_name: 'Jane Doe',
          biography: 'Author bio',
          avatar: null,
        },
      });
    });
  });

  describe('publishArticle with scheduledAt', () => {
    const articleId = 'article12345678901234';
    const adminId = 'admin1234567890123456';

    const makeFullArticle = () =>
      new Article({
        id: articleId,
        displayTitle: 'Title',
        metaTitle: 'Meta',
        content: 'Content body here',
        slug: 'my-slug',
        authorId: 'author123456789012345',
        blogId: 'blog1234567890123456',
        createdBy: adminId,
        coverImageId: 'cover123456789012345',
        status: EArticleStatus.draft,
      });

    const makeBlog = () => ({
      id: 'blog1234567890123456',
      tenantId: 'tenant12345678901234',
      mediaCollectionId: 'coll1234567890123456',
    });

    it('publishes immediately when no scheduledAt is provided', async () => {
      const article = makeFullArticle();
      const blog = makeBlog();

      articleRepository.findById.mockResolvedValue(article);
      blogRepository.findById.mockResolvedValue(blog as any);
      mediaRelationRepository.findByEntity.mockResolvedValue([]);
      mediaAssetRepository.findById.mockResolvedValue({
        id: 'cover123456789012345',
        url: 'https://cdn.example.com/cover.jpg',
        collection_id: 'coll1234567890123456',
      } as any);
      articleRepository.update.mockResolvedValue({
        ...article,
        status: EArticleStatus.published,
        publishedAt: new Date(),
        scheduledAt: null,
      } as any);

      const result = await service.publishArticle(articleId, adminId, {});

      expect(result.status).toBe(200);
      const updated = articleRepository.update.mock.calls[0][1];
      expect(updated.status).toBe(EArticleStatus.published);
    });

    it('schedules when scheduledAt is in the future', async () => {
      const article = makeFullArticle();
      const blog = makeBlog();
      const future = new Date(Date.now() + 3600_000).toISOString();

      articleRepository.findById.mockResolvedValue(article);
      blogRepository.findById.mockResolvedValue(blog as any);
      articleRepository.update.mockResolvedValue({
        ...article,
        status: EArticleStatus.scheduled,
        scheduledAt: new Date(future),
        publishedAt: null,
      } as any);

      const result = await service.publishArticle(articleId, adminId, { scheduledAt: future });

      expect(result.status).toBe(200);
      const updated = articleRepository.update.mock.calls[0][1];
      expect(updated.status).toBe(EArticleStatus.scheduled);
      expect(updated.scheduledAt).toEqual(new Date(future));
    });

    it('returns 400 when scheduledAt is in the past', async () => {
      const article = makeFullArticle();
      const blog = makeBlog();
      const past = new Date(Date.now() - 3600_000).toISOString();

      articleRepository.findById.mockResolvedValue(article);
      blogRepository.findById.mockResolvedValue(blog as any);

      const result = await service.publishArticle(articleId, adminId, { scheduledAt: past });

      expect(result.status).toBe(400);
    });
  });

  describe('updatePublishedAt', () => {
    const articleId = 'article12345678901234';
    const adminId = 'admin1234567890123456';

    const makePublishedArticle = () =>
      new Article({
        id: articleId,
        displayTitle: 'Title',
        metaTitle: 'Meta',
        content: 'Content body here',
        slug: 'my-slug',
        authorId: 'author123456789012345',
        blogId: 'blog1234567890123456',
        createdBy: adminId,
        coverImageId: 'cover123456789012345',
        status: EArticleStatus.published,
        publishedAt: new Date(),
      });

    it('returns 404 when article not found', async () => {
      articleRepository.findById.mockResolvedValue(null);
      const result = await service.updatePublishedAt(articleId, new Date(), adminId);
      expect(result.status).toBe(404);
    });

    it('returns 409 when article is in draft status', async () => {
      const article = new Article({
        id: articleId,
        displayTitle: 'Title',
        metaTitle: 'Meta',
        content: 'Content',
        slug: 'slug',
        authorId: 'author123456789012345',
        blogId: 'blog1234567890123456',
        createdBy: adminId,
        status: EArticleStatus.draft,
      });
      articleRepository.findById.mockResolvedValue(article);
      const result = await service.updatePublishedAt(articleId, new Date(), adminId);
      expect(result.status).toBe(409);
    });

    it('updates publishedAt to a past date keeping published status', async () => {
      const article = makePublishedArticle();
      const past = new Date(Date.now() - 3600_000);
      articleRepository.findById.mockResolvedValue(article);
      articleRepository.update.mockResolvedValue({ ...article, publishedAt: past } as any);

      const result = await service.updatePublishedAt(articleId, past, adminId);

      expect(result.status).toBe(200);
      const updated = articleRepository.update.mock.calls[0][1];
      expect(updated.status).toBe(EArticleStatus.published);
      expect(updated.publishedAt).toEqual(past);
      expect(updated.scheduledAt).toBeNull();
      expect(updated.lastEditedBy).toBeUndefined();
    });

    it('sets status to scheduled when new date is in the future', async () => {
      const article = makePublishedArticle();
      const future = new Date(Date.now() + 3600_000);
      articleRepository.findById.mockResolvedValue(article);
      articleRepository.update.mockResolvedValue({ ...article, status: EArticleStatus.scheduled, scheduledAt: future } as any);

      const result = await service.updatePublishedAt(articleId, future, adminId);

      expect(result.status).toBe(200);
      const updated = articleRepository.update.mock.calls[0][1];
      expect(updated.status).toBe(EArticleStatus.scheduled);
      expect(updated.scheduledAt).toEqual(future);
      expect(updated.publishedAt).toBeNull();
    });
  });

  describe('publishScheduledArticles', () => {
    it('publishes all due articles and does not set lastEditedBy', async () => {
      const due = new Article({
        id: 'article12345678901234',
        displayTitle: 'Title',
        metaTitle: 'Meta',
        content: 'Content body here',
        slug: 'my-slug',
        authorId: 'author123456789012345',
        blogId: 'blog1234567890123456',
        createdBy: 'admin1234567890123456',
        coverImageId: 'cover123456789012345',
        status: EArticleStatus.scheduled,
        scheduledAt: new Date(Date.now() - 1000),
      });

      articleRepository.findScheduledDue.mockResolvedValue([due]);
      articleRepository.update.mockResolvedValue({ ...due, status: EArticleStatus.published } as any);

      await service.publishScheduledArticles();

      expect(articleRepository.update).toHaveBeenCalledWith(due.id, {
        status: EArticleStatus.published,
        publishedAt: due.scheduledAt,
        scheduledAt: null,
      });
      const updateCall = articleRepository.update.mock.calls[0][1];
      expect(updateCall.lastEditedBy).toBeUndefined();
    });

    it('does not call update when no articles are due', async () => {
      articleRepository.findScheduledDue.mockResolvedValue([]);
      await service.publishScheduledArticles();
      expect(articleRepository.update).not.toHaveBeenCalled();
    });
  });
});
