import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicBlogController } from './public-blog.controller';
import { ArticleService } from '../../application/services/article.service';
import { EArticleStatus } from '../../domain/enums/article-status.enum';

describe('PublicBlogController', () => {
  let controller: PublicBlogController;
  let articleService: jest.Mocked<ArticleService>;

  beforeEach(() => {
    articleService = {
      findPublishedByBlogId: jest.fn(),
      findPublishedBySlug: jest.fn(),
    } as unknown as jest.Mocked<ArticleService>;

    controller = new PublicBlogController(articleService);
  });

  describe('listArticles', () => {
    it('should use repository-backed pagination and map the public payload', async () => {
      const publishedAt = new Date('2026-03-08T12:00:00.000Z');

      articleService.findPublishedByBlogId.mockResolvedValue({
        data: [
          {
            id: 'article-1',
            title: 'Article title',
            language: 'pt_br',
            slug: 'article-title',
            content: 'article content',
            published_at: publishedAt,
            display_order: 7,
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
        ],
        total: 17,
        page: 2,
        limit: 5,
        totalPages: 4,
      } as any);

      const result = await controller.listArticles({ blog: { id: 'blog-1' } } as any, 2, 5);

      expect(articleService.findPublishedByBlogId).toHaveBeenCalledWith('blog-1', 2, 5);
      expect(result).toEqual({
        data: [
          {
            id: 'article-1',
            title: 'Article title',
            language: 'pt_br',
            slug: 'article-title',
            content: 'article content',
            published_at: publishedAt,
            display_order: 7,
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
        ],
        meta: {
          page: 2,
          limit: 5,
          total: 17,
          total_pages: 4,
        },
      });
    });

    it('should cap limit at 50', async () => {
      articleService.findPublishedByBlogId.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      } as any);

      await controller.listArticles({ blog: { id: 'blog-1' } } as any, 1, 200);

      expect(articleService.findPublishedByBlogId).toHaveBeenCalledWith('blog-1', 1, 50);
    });

    it('should reject page values lower than 1', async () => {
      await expect(
        controller.listArticles({ blog: { id: 'blog-1' } } as any, 0, 10),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject limit values lower than 1', async () => {
      await expect(
        controller.listArticles({ blog: { id: 'blog-1' } } as any, 1, 0),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getArticleBySlug', () => {
    it('should map the public article payload', async () => {
      const publishedAt = new Date('2026-03-08T12:00:00.000Z');
      const createdAt = new Date('2026-03-01T12:00:00.000Z');
      const updatedAt = new Date('2026-03-07T12:00:00.000Z');

      articleService.findPublishedBySlug.mockResolvedValue({
        id: 'article-1',
        title: 'Article title',
        language: 'pt_br',
        slug: 'article-title',
        content: 'article content',
        status: EArticleStatus.published,
        published_at: publishedAt,
        created_at: createdAt,
        updated_at: updatedAt,
        author: {
          id: 'author-1',
          first_name: 'Jane',
          last_name: 'Doe',
          full_name: 'Jane Doe',
          biography: 'Author bio',
          avatar: null,
        },
      } as any);

      const result = await controller.getArticleBySlug(
        { blog: { id: 'blog-1' } } as any,
        'article-title',
      );

      expect(articleService.findPublishedBySlug).toHaveBeenCalledWith('article-title', 'blog-1');
      expect(result).toEqual({
        id: 'article-1',
        title: 'Article title',
        language: 'pt_br',
        slug: 'article-title',
        content: 'article content',
        status: EArticleStatus.published,
        published_at: publishedAt,
        created_at: createdAt,
        updated_at: updatedAt,
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

    it('should throw NotFoundException when article is missing', async () => {
      articleService.findPublishedBySlug.mockResolvedValue(null);

      await expect(
        controller.getArticleBySlug({ blog: { id: 'blog-1' } } as any, 'missing-article'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});