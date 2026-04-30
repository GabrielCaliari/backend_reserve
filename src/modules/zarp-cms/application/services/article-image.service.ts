import { Injectable, Inject, NotFoundException, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import {
  ARTICLE_IMAGE_REPOSITORY,
  IArticleImageRepository,
} from '../../domain/interfaces/article-image.repository.interface';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../../domain/interfaces/article.repository.interface';
import {
  BLOG_REPOSITORY,
  IBlogRepository,
} from '../../domain/interfaces/blog.repository.interface';
import {
  MEDIA_COLLECTION_REPOSITORY,
  IMediaCollectionRepository,
} from '../../domain/interfaces/media-collection.repository.interface';
import {
  STORAGE_PROVIDER,
  IStorageProvider,
} from '../../domain/interfaces/storage.interface';
import {
  IMAGE_PROCESSOR,
  IImageProcessor,
} from '../../domain/interfaces/image-processor.interface';
import { ArticleNotFoundError } from '../../domain/errors/article-not-found.error';
import { ImageLimitExceededError } from '../../domain/errors/image-limit-exceeded.error';

const ARTICLE_IMAGES_COLLECTION_SLUG = 'article-images';

@Injectable()
export class ArticleImageService {
  private readonly MAX_IMAGES_PER_ARTICLE = 20;
  private readonly IMAGE_QUALITY = parseInt(process.env.CMS_IMAGE_QUALITY || '80', 10);

  constructor(
    @Inject(ARTICLE_IMAGE_REPOSITORY)
    private readonly imageRepository: IArticleImageRepository,
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepository: IArticleRepository,
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: IBlogRepository,
    @Inject(MEDIA_COLLECTION_REPOSITORY)
    private readonly collectionRepository: IMediaCollectionRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: IImageProcessor,
  ) {}

  async upload(
    articleId: string,
    buffer: Buffer,
    mimeType: string,
    fileSize: number,
    tenantId: string,
    altText?: string,
  ): Promise<any> {
    // Verify article exists
    const article = await this.articleRepository.findById(articleId);
    if (!article) {
      throw new ArticleNotFoundError();
    }

    // Validate against the article-images collection rules (size + mime type)
    const collection = await this.collectionRepository.findBySlug(
      ARTICLE_IMAGES_COLLECTION_SLUG,
      tenantId,
    );
    if (collection) {
      if (!collection.validateFileSize(fileSize)) {
        throw new UnprocessableEntityException(
          `File size exceeds the maximum allowed (${collection.max_file_size} bytes)`,
        );
      }
      if (!collection.validateMimeType(mimeType)) {
        throw new BadRequestException(
          `File type "${mimeType}" is not allowed for article images`,
        );
      }
    }

    // Check image limit
    const currentCount = await this.imageRepository.countByArticleId(articleId);
    if (currentCount >= this.MAX_IMAGES_PER_ARTICLE) {
      throw new ImageLimitExceededError();
    }

    // Process image to webp
    let processed: Awaited<ReturnType<typeof this.imageProcessor.processToWebp>>;
    try {
      processed = await this.imageProcessor.processToWebp(buffer, this.IMAGE_QUALITY);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new UnprocessableEntityException(`Failed to process image: ${message}`);
    }

    // Generate storage key
    const timestamp = Date.now();
    const storageKey = `cms/articles/${articleId}/${timestamp}.webp`;

    const displayOrder = currentCount + 1;

    // Upload to storage
    let uploadResult: Awaited<ReturnType<typeof this.storageProvider.upload>>;
    try {
      uploadResult = await this.storageProvider.upload(
        storageKey,
        processed.data,
        'image/webp',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Storage upload failed: ${message}`);
    }

    // Save to database
    return this.imageRepository.create({
      url: uploadResult.url,
      storage_key: uploadResult.key,
      alt_text: altText,
      display_order: displayOrder,
      file_size: processed.size,
      original_format: mimeType.split('/')[1],
      article_id: articleId,
    });
  }

  async findAllByArticleId(articleId: string, tenantId?: string): Promise<any[]> {
    // Validate article exists and belongs to tenant
    if (tenantId) {
      const article = await this.articleRepository.findById(articleId);
      if (!article) {
        throw new NotFoundException('Article not found');
      }
      const blog = await this.blogRepository.findById(article.blogId);
      if (!blog || blog.tenantId !== tenantId) {
        throw new NotFoundException('Article not found');
      }
    }

    return this.imageRepository.findAllByArticleId(articleId);
  }

  async delete(id: string): Promise<void> {
    const image = await this.imageRepository.findById(id);
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Delete from storage
    await this.storageProvider.delete(image.url);

    // Delete from database
    await this.imageRepository.delete(id);
  }

  async reorderImages(
    articleId: string,
    items: { id: string; display_order: number }[],
  ): Promise<void> {
    // Validate that all image IDs belong to the article
    const existingImages = await this.imageRepository.findAllByArticleId(articleId);
    const validIds = new Set(existingImages.map((img: any) => img.id));
    for (const item of items) {
      if (!validIds.has(item.id)) {
        throw new NotFoundException(`Image ${item.id} not found in article ${articleId}`);
      }
    }

    await this.imageRepository.updateDisplayOrders(items.map(item => ({ id: item.id, display_order: item.display_order })));
  }
}
