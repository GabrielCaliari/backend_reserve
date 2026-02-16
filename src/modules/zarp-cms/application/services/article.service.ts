import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../../domain/interfaces/article.repository.interface';
import {
  BLOG_REPOSITORY,
  IBlogRepository,
} from '../../domain/interfaces/blog.repository.interface';
import { CreateArticleDTO } from '../dtos/create-article.dto';
import { UpdateArticleDTO } from '../dtos/update-article.dto';
import { ArticleNotFoundError } from '../../domain/errors/article-not-found.error';
import { BlogNotFoundError } from '../../domain/errors/blog-not-found.error';
import { generateSlug } from '../../domain/utils/slug.util';

@Injectable()
export class ArticleService {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepository: IArticleRepository,
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: IBlogRepository,
  ) {}

  async create(blogId: number, dto: CreateArticleDTO): Promise<any> {
    // Verify blog exists
    const blog = await this.blogRepository.findById(blogId);
    if (!blog) {
      throw new BlogNotFoundError();
    }

    // Generate unique slug
    const baseSlug = generateSlug(dto.title);
    let slug = baseSlug;
    let counter = 2;

    while (await this.articleRepository.existsBySlugAndBlogId(slug, blogId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.articleRepository.create({
      title: dto.title,
      content: dto.content,
      slug,
      blog_id: blogId,
    });
  }

  async findAllByBlogId(blogId: number, status?: string): Promise<any[]> {
    const articles = await this.articleRepository.findAllByBlogId(blogId);

    if (status) {
      return articles.filter((a) => a.status === status);
    }

    return articles;
  }

  async findById(id: number): Promise<any> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new ArticleNotFoundError();
    }
    return article;
  }

  async update(id: number, dto: UpdateArticleDTO): Promise<any> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new ArticleNotFoundError();
    }

    return this.articleRepository.update(id, dto);
  }

  async publish(id: number): Promise<any> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new ArticleNotFoundError();
    }

    if (article.status !== 'draft') {
      throw new BadRequestException('Article is not in draft status');
    }

    return this.articleRepository.update(id, {
      status: 'published',
      published_at: new Date(),
    });
  }

  async archive(id: number): Promise<any> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new ArticleNotFoundError();
    }

    if (article.status !== 'published') {
      throw new BadRequestException('Article is not in published status');
    }

    return this.articleRepository.update(id, {
      status: 'archived',
    });
  }

  async unarchive(id: number): Promise<any> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new ArticleNotFoundError();
    }

    if (article.status !== 'archived') {
      throw new BadRequestException('Article is not in archived status');
    }

    return this.articleRepository.update(id, {
      status: 'draft',
      published_at: null,
    });
  }

  async delete(id: number): Promise<void> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      throw new ArticleNotFoundError();
    }

    await this.articleRepository.delete(id);
  }

  async reorderArticles(
    blogId: number,
    items: { id: number; display_order: number }[],
  ): Promise<void> {
    // TODO: Validate that all article IDs belong to the blog
    await this.articleRepository.updateDisplayOrders(items);
  }

  // Public API methods
  async findPublishedByBlogId(blogId: number): Promise<any[]> {
    return this.articleRepository.findPublishedByBlogId(blogId);
  }

  async findPublishedBySlug(slug: string, blogId: number): Promise<any> {
    const article = await this.articleRepository.findPublishedBySlugAndBlogId(slug, blogId);
    if (!article) {
      throw new ArticleNotFoundError();
    }
    return article;
  }
}
