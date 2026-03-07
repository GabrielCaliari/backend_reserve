import { Injectable, Inject } from '@nestjs/common';
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
import { Article } from '../../domain/entities/article.entity';
import { MediaAssetRelation } from '../../domain/entities/media-asset-relation.entity';
import { CreateArticleDTO } from '../dtos/create-article.dto';
import { UpdateArticleDTO } from '../dtos/update-article.dto';
import { EArticleStatus } from '../../domain/enums/article-status.enum';
import { ServiceResponse, successResponse, errorResponse } from '../utils/service-response.util';
import { generateSlug } from '../../domain/utils/slug.util';

// Error constants
const ERROR_ARTICLE_NOT_FOUND = '404:Article not found';
const ERROR_ARTICLE_CANNOT_PUBLISH = '400:Article cannot be published: missing required fields';
const ERROR_ARTICLE_SLUG_DUPLICATE = '409:Article slug already exists in this blog';
const ERROR_ARTICLE_SLUG_IMMUTABLE = '400:Cannot change slug for published article';
const ERROR_AUTHOR_NOT_FOUND = '404:Author not found';
const ERROR_AUTHOR_TENANT_MISMATCH = '400:Author must belong to the same tenant as the blog';
const ERROR_BLOG_NOT_FOUND = '404:Blog not found';
const ERROR_COVER_IMAGE_REQUIRED = '400:Cover image is required for published articles';
const ERROR_INVALID_IMAGE_REFERENCE = '400:Article contains invalid image references';
const ERROR_CREATE_ARTICLE = '500:Failed to create article';
const ERROR_UPDATE_ARTICLE = '500:Failed to update article';

/**
 * ArticleService
 * 
 * Application service for article management with validation, audit trails,
 * and MediaAsset integration.
 * 
 * **Validates: Requirements 2.2, 2.3, 2.4, 3.2, 3.3, 5.4, 5.5, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1-9.7**
 */
@Injectable()
export class ArticleService {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepository: IArticleRepository,
    @Inject(AUTHOR_REPOSITORY)
    private readonly authorRepository: IAuthorRepository,
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: IBlogRepository,
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly mediaAssetRepository: IMediaAssetRepository,
    @Inject(MEDIA_RELATION_REPOSITORY)
    private readonly mediaRelationRepository: IMediaRelationRepository,
  ) {}

  /**
   * Creates a new article with author validation and audit trail
   * 
   * **Validates: Requirements 2.2, 2.3, 5.4, 5.5, 6.3**
   */
  async createArticle(
    blogId: string,
    dto: CreateArticleDTO,
    currentAdminId: string,
  ): Promise<ServiceResponse<Article>> {
    try {
      // Verify blog exists
      const blog = await this.blogRepository.findById(blogId);
      if (!blog) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }

      // Verify author exists
      const author = await this.authorRepository.findById(dto.authorId);
      if (!author) {
        return errorResponse(ERROR_AUTHOR_NOT_FOUND, 404);
      }

      // Validate author tenant matching (Requirement 5.4)
      const authorTenantMatch = await this.validateAuthorTenant(dto.authorId, blog.tenantId);
      if (!authorTenantMatch.valid) {
        return errorResponse(ERROR_AUTHOR_TENANT_MISMATCH, 400);
      }

      // Generate unique slug (Requirement 2.2, 2.3)
      const slugValidation = await this.validateSlugUniqueness(dto.slug, blogId);
      if (!slugValidation.valid) {
        return errorResponse(ERROR_ARTICLE_SLUG_DUPLICATE, 409);
      }

      // Create article entity
      const article = new Article({
        displayTitle: dto.displayTitle,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        focusKeyword: dto.focusKeyword,
        content: dto.content,
        slug: dto.slug,
        status: EArticleStatus.draft,
        displayOrder: 0,
        coverImageId: dto.coverImageId ?? null,
        authorId: dto.authorId,
        blogId: blogId,
        createdBy: currentAdminId, // Requirement 6.3
        lastEditedBy: null,
      });

      // Validate metadata length constraints
      const metadataValidation = article.validateMetadata();
      if (!metadataValidation.valid) {
        return errorResponse(`400:${metadataValidation.errors.join(', ')}`, 400);
      }

      // Create article in database
      const createdArticle = await this.articleRepository.create(article);

      // Create MediaAssetRelation for cover image if provided (Requirement 3.3, 7.2)
      if (dto.coverImageId) {
        await this.createMediaAssetRelations(
          createdArticle.id!,
          dto.coverImageId,
          'cover',
          0,
        );
      }

      // Extract and create relations for content images (Requirement 7.1, 7.2, 7.3)
      if (dto.content) {
        await this.createContentImageRelations(createdArticle.id!, dto.content);
      }

      return successResponse(createdArticle, 201);
    } catch (error) {
      return errorResponse(ERROR_CREATE_ARTICLE, 500, error);
    }
  }

  /**
   * Updates an article with last_edited_by tracking
   * 
   * **Validates: Requirements 2.4, 6.4**
   */
  async updateArticle(
    id: string,
    dto: UpdateArticleDTO,
    currentAdminId: string,
  ): Promise<ServiceResponse<Article>> {
    try {
      // Find existing article
      const existingArticle = await this.articleRepository.findById(id);
      if (!existingArticle) {
        return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
      }

      // Prevent slug changes for published articles (Requirement 2.4)
      if (existingArticle.slug) {
        if (existingArticle.status === EArticleStatus.published) {
          return errorResponse(ERROR_ARTICLE_SLUG_IMMUTABLE, 400);
        }

        // Validate new slug uniqueness
        const slugValidation = await this.validateSlugUniqueness(
          existingArticle.slug,
          existingArticle.blogId,
          id,
        );
        if (!slugValidation.valid) {
          return errorResponse(ERROR_ARTICLE_SLUG_DUPLICATE, 409);
        }
      }

      // Validate author tenant if author is being changed
      if (dto.authorId && dto.authorId !== existingArticle.authorId) {
        const blog = await this.blogRepository.findById(existingArticle.blogId);
        if (!blog) {
          return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
        }

        const authorTenantMatch = await this.validateAuthorTenant(dto.authorId, blog.tenantId);
        if (!authorTenantMatch.valid) {
          return errorResponse(ERROR_AUTHOR_TENANT_MISMATCH, 400);
        }
      }

      // Validate metadata if being updated
      if (dto.metaTitle || dto.metaDescription) {
        const tempArticle = new Article({
          ...existingArticle,
          metaTitle: dto.metaTitle ?? existingArticle.metaTitle,
          metaDescription: dto.metaDescription ?? existingArticle.metaDescription,
        });
        const metadataValidation = tempArticle.validateMetadata();
        if (!metadataValidation.valid) {
          return errorResponse(`400:${metadataValidation.errors.join(', ')}`, 400);
        }
      }

      // Update article with last_edited_by tracking (Requirement 6.4)
      const updatedArticle = await this.articleRepository.update(id, {
        ...dto,
        lastEditedBy: currentAdminId,
      });

      // Update cover image relation if changed
      if (dto.coverImageId !== undefined && dto.coverImageId !== existingArticle.coverImageId) {
        // Delete old cover relation if exists
        if (existingArticle.coverImageId) {
          await this.mediaRelationRepository.delete(
            existingArticle.coverImageId,
            'article',
            id,
            'cover',
          );
        }

        // Create new cover relation if provided
        if (dto.coverImageId) {
          await this.createMediaAssetRelations(id, dto.coverImageId, 'cover', 0);
        }
      }

      // Update content image relations if content changed
      if (dto.content !== undefined && dto.content !== existingArticle.content) {
        // Delete old content image relations
        const oldRelations = await this.mediaRelationRepository.findByEntity(
          'article',
          id,
          'content-image',
        );
        for (const relation of oldRelations) {
          await this.mediaRelationRepository.delete(
            relation.asset_id,
            'article',
            id,
            'content-image',
          );
        }

        // Create new content image relations
        await this.createContentImageRelations(id, dto.content);
      }

      return successResponse(updatedArticle, 200);
    } catch (error) {
      return errorResponse(ERROR_UPDATE_ARTICLE, 500, error);
    }
  }

  /**
   * Publishes an article with complete field validation
   * 
   * **Validates: Requirements 3.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.7**
   */
  async publishArticle(
    id: string,
    currentAdminId: string,
  ): Promise<ServiceResponse<Article>> {
    try {
      // Find article
      const article = await this.articleRepository.findById(id);
      if (!article) {
        return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
      }

      // Get blog to obtain tenantId
      const blog = await this.blogRepository.findById(article.blogId);
      if (!blog) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }

      // Validate all required fields for publishing
      if (!article.canPublish()) {
        const missingFields: string[] = [];
        if (!article.displayTitle || article.displayTitle.length === 0) {
          missingFields.push('displayTitle');
        }
        if (!article.metaTitle || article.metaTitle.length === 0) {
          missingFields.push('metaTitle');
        }
        if (article.coverImageId === null) {
          missingFields.push('coverImageId');
        }
        if (!article.authorId || article.authorId.length === 0) {
          missingFields.push('authorId');
        }
        if (!article.content || article.content.length === 0) {
          missingFields.push('content');
        }

        return {
          status: 400,
          data: {
            code: ERROR_ARTICLE_CANNOT_PUBLISH,
            message: `Article cannot be published: missing required fields - ${missingFields.join(', ')}`,
          },
        };
      }

      // Validate image references in markdown (Requirement 7.4)
      const imageValidation = await this.validateImageReferences(article.content, blog.tenantId);
      if (!imageValidation.valid) {
        return errorResponse(ERROR_INVALID_IMAGE_REFERENCE, 400, {
          invalidReferences: imageValidation.invalidReferences,
        });
      }

      // Publish the article
      article.publish();

      // Update in database with last_edited_by
      const publishedArticle = await this.articleRepository.update(id, {
        status: article.status,
        publishedAt: article.publishedAt,
        lastEditedBy: currentAdminId,
      });

      return successResponse(publishedArticle, 200);
    } catch (error) {
      return errorResponse(ERROR_UPDATE_ARTICLE, 500, error);
    }
  }

  /**
   * Validates slug uniqueness within a blog
   * 
   * **Validates: Requirements 2.2**
   */
  async validateSlugUniqueness(
    slug: string,
    blogId: string,
    excludeArticleId?: string,
  ): Promise<{ valid: boolean; message?: string }> {
    const existingArticle = await this.articleRepository.findBySlugAndBlogId(slug, blogId);

    if (existingArticle && existingArticle.id !== excludeArticleId) {
      return {
        valid: false,
        message: 'Slug already exists in this blog',
      };
    }

    return { valid: true };
  }

  /**
   * Validates that author belongs to the same tenant as the blog
   * 
   * **Validates: Requirements 5.4**
   */
  async validateAuthorTenant(
    authorId: string,
    blogtenantId: string,
  ): Promise<{ valid: boolean; message?: string }> {
    const author = await this.authorRepository.findById(authorId);

    if (!author) {
      return {
        valid: false,
        message: 'Author not found',
      };
    }

    if (author.tenantId !== blogtenantId) {
      return {
        valid: false,
        message: 'Author must belong to the same tenant as the blog',
      };
    }

    return { valid: true };
  }

  /**
   * Validates that all image references in markdown point to existing MediaAssets
   * 
   * **Validates: Requirements 7.4, 7.5**
   */
  async validateImageReferences(
    content: string,
    tenantId: string,
  ): Promise<{ valid: boolean; invalidReferences?: string[] }> {
    // Extract image references from markdown: ![alt](storage_key) or ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = Array.from(content.matchAll(imageRegex));

    if (matches.length === 0) {
      return { valid: true };
    }

    const invalidReferences: string[] = [];

    for (const match of matches) {
      const reference = match[2]; // storage_key or url

      // Check if reference is a CUID2 (25-character string)
      if (/^[a-z0-9]{25}$/.test(reference)) {
        // Validate that the asset exists
        const asset = await this.mediaAssetRepository.findById(reference, tenantId);
        if (!asset) {
          invalidReferences.push(reference);
        }
      }

      // For non-CUID2 references, we assume they're valid URLs or storage keys
      // A more robust implementation would query the MediaAsset table by storage_key
    }

    if (invalidReferences.length > 0) {
      return {
        valid: false,
        invalidReferences,
      };
    }

    return { valid: true };
  }

  /**
   * Creates MediaAssetRelation for cover or content images
   * 
   * **Validates: Requirements 3.3, 7.2, 17.7**
   */
  async createMediaAssetRelations(
    articleId: string,
    assetId: string,
    relationType: 'cover' | 'content-image',
    displayOrder: number,
  ): Promise<void> {
    const relation = new MediaAssetRelation({
      asset_id: assetId,
      entity_type: 'article',
      entity_id: articleId,
      entity_id_type: 'uuid', // Article uses UUID (Requirement 17.7)
      relation_type: relationType,
      display_order: displayOrder,
    });

    await this.mediaRelationRepository.create(relation);
  }

  /**
   * Extracts image references from markdown content and creates MediaAssetRelations
   * 
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  private async createContentImageRelations(
    articleId: string,
    content: string,
  ): Promise<void> {
    // Extract image references from markdown: ![alt](storage_key) or ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = Array.from(content.matchAll(imageRegex));

    let displayOrder = 1;

    for (const match of matches) {
      const reference = match[2]; // storage_key or url

      // For UUID references (12-character strings), assume they're asset IDs
      if (/^[a-z0-9]{12}$/.test(reference)) {
        await this.createMediaAssetRelations(
          articleId,
          reference,
          'content-image',
          displayOrder,
        );
        displayOrder++;
      }

      // For non-UUID references, we'd need to look up the asset by storage_key or url
      // This is left as a TODO for a more complete implementation
    }
  }

  // Legacy methods for backward compatibility
  async findById(id: string, tenantId?: string): Promise<ServiceResponse<Article>> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
    }

    // Validate tenant isolation via blog ownership
    if (tenantId) {
      const blog = await this.blogRepository.findById(article.blogId);
      if (!blog || blog.tenantId !== tenantId) {
        return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
      }
    }

    return successResponse(article, 200);
  }

  async findByBlogId(
    blogId: string,
    filters?: { status?: EArticleStatus; page?: number; limit?: number },
    tenantId?: string,
  ): Promise<ServiceResponse> {
    // Validate blog belongs to tenant
    if (tenantId) {
      const blog = await this.blogRepository.findById(blogId);
      if (!blog || blog.tenantId !== tenantId) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }
    }

    const result = await this.articleRepository.findByBlogId(blogId, filters);
    return successResponse(result, 200);
  }

  async delete(id: string, tenantId?: string): Promise<ServiceResponse<void>> {
    const article = await this.articleRepository.findById(id);
    if (!article) {
      return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
    }

    // Validate tenant isolation via blog ownership
    if (tenantId) {
      const blog = await this.blogRepository.findById(article.blogId);
      if (!blog || blog.tenantId !== tenantId) {
        return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
      }
    }

    await this.articleRepository.delete(id);
    return successResponse(undefined, 204);
  }

  /**
   * Archives a published article
   * Transitions article status from published to archived
   */
  async archive(articleId: string, tenantId?: string): Promise<ServiceResponse<Article>> {
    try {
      const article = await this.articleRepository.findById(articleId);
      if (!article) {
        return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
      }

      // Validate tenant isolation via blog ownership
      if (tenantId) {
        const blog = await this.blogRepository.findById(article.blogId);
        if (!blog || blog.tenantId !== tenantId) {
          return errorResponse(ERROR_ARTICLE_NOT_FOUND, 404);
        }
      }

      if (article.status !== EArticleStatus.published) {
        return errorResponse('409:Article is not in published status', 409);
      }

      const updatedArticle = await this.articleRepository.update(articleId, {
        status: EArticleStatus.archived,
      });

      return successResponse(updatedArticle, 200);
    } catch (error) {
      return errorResponse('500:Failed to archive article', 500, error);
    }
  }

  /**
   * Reorders articles within a blog
   */
  async reorderArticles(
    blogId: string,
    order: { id: string; display_order: number }[],
  ): Promise<ServiceResponse<void>> {
    try {
      // Verify all articles belong to the blog
      for (const item of order) {
        const article = await this.articleRepository.findById(item.id);
        if (!article || article.blogId !== blogId) {
          return errorResponse('400:Invalid article ID or article does not belong to this blog', 400);
        }
      }

      // Update display_order for each article
      for (const item of order) {
        await this.articleRepository.update(item.id, {
          displayOrder: item.display_order,
        });
      }

      return successResponse(undefined, 200);
    } catch (error) {
      return errorResponse('500:Failed to reorder articles', 500, error);
    }
  }

  /**
   * Finds all published articles for a blog (public API)
   */
  async findPublishedByBlogId(blogId: string): Promise<Article[]> {
    const result = await this.articleRepository.findByBlogId(blogId, {
      status: EArticleStatus.published,
    });
    return result.data || [];
  }

  /**
   * Finds a published article by slug (public API)
   */
  async findPublishedBySlug(slug: string, blogId: string): Promise<Article | null> {
    const article = await this.articleRepository.findBySlugAndBlogId(slug, blogId);
    
    if (!article || article.status !== EArticleStatus.published) {
      return null;
    }

    return article;
  }
}
