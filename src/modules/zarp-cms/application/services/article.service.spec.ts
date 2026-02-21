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
import { EArticleStatus } from '../../domain/enums/article-status.enum';

describe('ArticleService', () => {
  let service: ArticleService;
  let articleRepository: jest.Mocked<IArticleRepository>;
  let authorRepository: jest.Mocked<IAuthorRepository>;
  let blogRepository: jest.Mocked<IBlogRepository>;

  beforeEach(async () => {
    const mockArticleRepository: Partial<IArticleRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlugAndBlogId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockAuthorRepository: Partial<IAuthorRepository> = {
      findById: jest.fn(),
    };

    const mockBlogRepository: Partial<IBlogRepository> = {
      findById: jest.fn(),
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
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    articleRepository = module.get(ARTICLE_REPOSITORY);
    authorRepository = module.get(AUTHOR_REPOSITORY);
    blogRepository = module.get(BLOG_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createArticle', () => {
    it('should create an article successfully', async () => {
      const mockBlog = {
        id: 'blog123',
        name: 'Tech Blog',
        tenantId: 1,
        active: true,
      };

      const mockAuthor = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        active: true,
      };

      const mockArticle = {
        id: 1,
        displayTitle: 'Test Article',
        metaTitle: 'Test Meta',
        content: 'Test content',
        slug: 'test-article',
        status: EArticleStatus.draft,
        blogId: 'blog123',
        authorId: 1,
        createdBy: 1,
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
          authorId: 1,
        },
        1, // currentAdminId
      );

      expect(result.status).toBe(201);
      expect(articleRepository.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return an article by id', async () => {
      const mockArticle = {
        id: 1,
        displayTitle: 'Test Article',
        metaTitle: 'Test Meta',
        content: 'Test content',
        slug: 'test-article',
        status: EArticleStatus.draft,
      };

      articleRepository.findById.mockResolvedValue(mockArticle as any);

      const result = await service.findById(1);

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockArticle);
    });

    it('should return 404 if article not found', async () => {
      articleRepository.findById.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result.status).toBe(404);
    });
  });
});
