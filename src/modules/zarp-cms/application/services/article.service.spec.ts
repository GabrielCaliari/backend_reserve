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
});
