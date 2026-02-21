import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  ARTICLE_IMAGE_REPOSITORY,
  IArticleImageRepository,
} from '../../domain/interfaces/article-image.repository.interface';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../../domain/interfaces/article.repository.interface';
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

@Injectable()
export class ArticleImageService {
  private readonly MAX_IMAGES_PER_ARTICLE = 20;
  private readonly IMAGE_QUALITY = parseInt(process.env.CMS_IMAGE_QUALITY || '80', 10);

  constructor(
    @Inject(ARTICLE_IMAGE_REPOSITORY)
    private readonly imageRepository: IArticleImageRepository,
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepository: IArticleRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: IImageProcessor,
  ) {}

  async upload(
    articleId: number,
    buffer: Buffer,
    originalFormat: string,
    altText?: string,
  ): Promise<any> {
    // Verify article exists
    const article = await this.articleRepository.findById(String(articleId));
    if (!article) {
      throw new ArticleNotFoundError();
    }

    // Check image limit
    const currentCount = await this.imageRepository.countByArticleId(articleId);
    if (currentCount >= this.MAX_IMAGES_PER_ARTICLE) {
      throw new ImageLimitExceededError();
    }

    // Process image to webp
    const processed = await this.imageProcessor.processToWebp(buffer, this.IMAGE_QUALITY);

    // Generate storage key
    const timestamp = Date.now();
    const storageKey = `cms/articles/${articleId}/${timestamp}.webp`;

    // Upload to storage
    const uploadResult = await this.storageProvider.upload(
      storageKey,
      processed.data,
      'image/webp',
    );

    // Get next display order
    const displayOrder = currentCount + 1;

    // Save to database
    return this.imageRepository.create({
      url: uploadResult.url,
      storage_key: uploadResult.key,
      alt_text: altText,
      display_order: displayOrder,
      file_size: processed.size,
      original_format: originalFormat,
      article_id: articleId,
    });
  }

  async findAllByArticleId(articleId: number): Promise<any[]> {
    return this.imageRepository.findAllByArticleId(articleId);
  }

  async delete(id: string): Promise<void> {
    const image = await this.imageRepository.findById(Number(id));
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Delete from storage
    await this.storageProvider.delete(image.storage_key);

    // Delete from database
    await this.imageRepository.delete(Number(id));
  }

  async reorderImages(
    articleId: number,
    items: { id: string; display_order: number }[],
  ): Promise<void> {
    // TODO: Validate that all image IDs belong to the article
    await this.imageRepository.updateDisplayOrders(items.map(item => ({ id: Number(item.id), display_order: item.display_order })));
  }
}
