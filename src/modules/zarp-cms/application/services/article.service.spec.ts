import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../../domain/interfaces/article.repository.interface';
import {
  BLOG_REPOSITORY,
  IBlogRepository,
} from '../../domain/interfaces/blog.repository.interface';
import { ArticleNotFoundError } from '../../domain/errors/article-not-found.error';
import { ArticleSlugConflictError } from '../../domain/errors/article-slug-conflict.error';
import { BlogNotFoundError } from '../../domain/errors/blog-not-found.error';

describe('ArticleService', () => {
  let service: ArticleService;
  let articleRepository: IArticleRepository;
  let blogRepository: IBlogRepository;

  const mockBlog = {
    id: 1,
    name: 'Tech Blog',
    slug: 'tech-blog',
    tenant_id: 1,
    active: true,
  };

  const mockArticle = {
    id: 1,
    title: 'Test Article',
    content: 'Test content',
    slug: 'test-article',
    status: 'draft',
    display_order: 0,
    published_at: null,
    blog_id: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockArticleRepository: Partial<IArticleRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlugAndBlogId: jest.fn(),
      existsBySlugAndBlogId: jest.fn(),
      findAllByBlogId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
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
          provide: BLOG_REPOSITORY,
          useValue: mockBlogRepository,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    articleRepository = module.get<IArticleRepository>(ARTICLE_REPOSITORY);
    blogRepository = module.get<IBlogRepository>(BLOG_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an article with auto-generated slug', async () => {
      jest.spyOn(blogRepository, 'findById').mockResolvedValue(mockBlog);
      jest.spyOn(articleRepository, 'existsBySlugAndBlogId').mockResolvedValue(false);
      jest.spyOn(articleRepository, 'create').mockResolvedValue(mockArticle);

      const result = await service.create(1, {
        title: 'Test Article',
        content: 'Test content',
      });

      expect(result).toEqual(mockArticle);
      expect(articleRepository.create).toHaveBeenCalledWith({
        title: 'Test Article',
        content: 'Test content',
        slug: 'test-article',
        blog_id: 1,
      });
    });

    it('should handle slug collision by appending suffix', async () => {
      jest.spyOn(blogRepository, 'findById').mockResolvedValue(mockBlog);
      jest
        .spyOn(articleRepository, 'existsBySlugAndBlogId')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      jest.spyOn(articleRepository, 'create').mockResolvedValue({
        ...mockArticle,
        slug: 'test-article-3',
      });

      const result = await service.create(1, {
        title: 'Test Article',
        content: 'Test content',
      });

      expect(result.slug).toBe('test-article-3');
    });

    it('should throw BlogNotFoundError if blog does not exist', async () => {
      jest.spyOn(blogRepository, 'findById').mockResolvedValue(null);

      await expect(
        service.create(999, {
          title: 'Test Article',
          content: 'Test content',
        }),
      ).rejects.toThrow(BlogNotFoundError);
    });
  });

  describe('update', () => {
    it('should update article content and metadata', async () => {
      const updatedArticle = {
        ...mockArticle,
        title: 'Updated Title',
        content: 'Updated content',
      };
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(mockArticle);
      jest.spyOn(articleRepository, 'update').mockResolvedValue(updatedArticle);

      const result = await service.update(1, {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(result).toEqual(updatedArticle);
      expect(articleRepository.update).toHaveBeenCalledWith(1, {
        title: 'Updated Title',
        content: 'Updated content',
      });
    });

    it('should throw ArticleNotFoundError if article does not exist', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(null);

      await expect(
        service.update(999, {
          title: 'Updated Title',
        }),
      ).rejects.toThrow(ArticleNotFoundError);
    });
  });

  describe('publish', () => {
    it('should transition article from draft to published', async () => {
      const publishedArticle = {
        ...mockArticle,
        status: 'published',
        published_at: new Date(),
      };
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(mockArticle);
      jest.spyOn(articleRepository, 'update').mockResolvedValue(publishedArticle);

      const result = await service.publish(1);

      expect(result.status).toBe('published');
      expect(result.published_at).toBeDefined();
      expect(articleRepository.update).toHaveBeenCalledWith(1, {
        status: 'published',
        published_at: expect.any(Date),
      });
    });

    it('should throw error if article is not in draft status', async () => {
      const publishedArticle = { ...mockArticle, status: 'published' };
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(publishedArticle);

      await expect(service.publish(1)).rejects.toThrow('Article is not in draft status');
    });

    it('should throw ArticleNotFoundError if article does not exist', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(null);

      await expect(service.publish(999)).rejects.toThrow(ArticleNotFoundError);
    });
  });

  describe('archive', () => {
    it('should transition article from published to archived', async () => {
      const publishedArticle = {
        ...mockArticle,
        status: 'published',
        published_at: new Date(),
      };
      const archivedArticle = {
        ...publishedArticle,
        status: 'archived',
      };
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(publishedArticle);
      jest.spyOn(articleRepository, 'update').mockResolvedValue(archivedArticle);

      const result = await service.archive(1);

      expect(result.status).toBe('archived');
      expect(articleRepository.update).toHaveBeenCalledWith(1, {
        status: 'archived',
      });
    });

    it('should throw error if article is not in published status', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(mockArticle);

      await expect(service.archive(1)).rejects.toThrow('Article is not in published status');
    });
  });

  describe('unarchive', () => {
    it('should transition article from archived to draft', async () => {
      const archivedArticle = {
        ...mockArticle,
        status: 'archived',
        published_at: new Date(),
      };
      const draftArticle = {
        ...archivedArticle,
        status: 'draft',
        published_at: null,
      };
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(archivedArticle);
      jest.spyOn(articleRepository, 'update').mockResolvedValue(draftArticle);

      const result = await service.unarchive(1);

      expect(result.status).toBe('draft');
      expect(result.published_at).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an article', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(mockArticle);
      jest.spyOn(articleRepository, 'delete').mockResolvedValue(undefined);

      await service.delete(1);

      expect(articleRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw ArticleNotFoundError if article does not exist', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(ArticleNotFoundError);
    });
  });

  describe('reorderArticles', () => {
    it('should reorder articles within a blog', async () => {
      jest.spyOn(articleRepository, 'updateDisplayOrders').mockResolvedValue(undefined);

      await service.reorderArticles(1, [
        { id: 1, display_order: 2 },
        { id: 2, display_order: 1 },
      ]);

      expect(articleRepository.updateDisplayOrders).toHaveBeenCalledWith([
        { id: 1, display_order: 2 },
        { id: 2, display_order: 1 },
      ]);
    });
  });
});
