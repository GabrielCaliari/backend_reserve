import { Module, Global } from '@nestjs/common';
import { BlogController } from './infrastructure/controllers/blog.controller';
import { ArticleController } from './infrastructure/controllers/article.controller';
import { ArticleImageController } from './infrastructure/controllers/article-image.controller';
import { AuthorController } from './infrastructure/controllers/author.controller';
import { PublicBlogController } from './infrastructure/controllers/public-blog.controller';
import { MediaAssetController } from './infrastructure/controllers/media-asset.controller';
import { MediaCollectionController } from './infrastructure/controllers/media-collection.controller';
import { MediaRelationController } from './infrastructure/controllers/media-relation.controller';
import { BlogService } from './application/services/blog.service';
import { ArticleService } from './application/services/article.service';
import { ArticleImageService } from './application/services/article-image.service';
import { MediaAssetService } from './application/services/media-asset.service';
import { MediaCollectionService } from './application/services/media-collection.service';
import { MediaRelationService } from './application/services/media-relation.service';
import { AuthorService } from './application/services/author.service';
import { PrismaBlogRepository } from './infrastructure/repositories/prisma-blog.repository';
import { PrismaArticleRepository } from './infrastructure/repositories/prisma-article.repository';
import { PrismaArticleImageRepository } from './infrastructure/repositories/prisma-article-image.repository';
import { PrismaAuthorRepository } from './infrastructure/repositories/prisma-author.repository';
import { PrismaMediaAssetRepository } from './infrastructure/repositories/prisma-media-asset.repository';
import { PrismaMediaCollectionRepository } from './infrastructure/repositories/prisma-media-collection.repository';
import { PrismaMediaRelationRepository } from './infrastructure/repositories/prisma-media-relation.repository';
import { S3StorageProvider } from './infrastructure/providers/s3-storage.provider';
import { VercelBlobStorageProvider } from './infrastructure/providers/vercel-blob-storage.provider';
import { SharpImageProcessorProvider } from './infrastructure/providers/sharp-image-processor.provider';
import { BLOG_REPOSITORY } from './domain/interfaces/blog.repository.interface';
import { ARTICLE_REPOSITORY } from './domain/interfaces/article.repository.interface';
import { ARTICLE_IMAGE_REPOSITORY } from './domain/interfaces/article-image.repository.interface';
import { AUTHOR_REPOSITORY } from './domain/interfaces/author.repository.interface';
import { MEDIA_ASSET_REPOSITORY } from './domain/interfaces/media-asset.repository.interface';
import { MEDIA_COLLECTION_REPOSITORY } from './domain/interfaces/media-collection.repository.interface';
import { MEDIA_RELATION_REPOSITORY } from './domain/interfaces/media-relation.repository.interface';
import { STORAGE_PROVIDER } from './domain/interfaces/storage.interface';
import { IMAGE_PROCESSOR } from './domain/interfaces/image-processor.interface';
import { BlogSecretKeyGuard } from './infrastructure/guards/blog-secret-key.guard';
import { ZarpAuthModule } from '../zarp-auth/zarp-auth.module';

/**
 * Zarp CMS Module
 * Bounded context: Blog management, article lifecycle, image handling, public API, generic media storage
 * Route prefix: /api/cms
 *
 * Storage Provider Configuration:
 * - Default: VercelBlobStorageProvider (uses Vercel Blob Storage)
 * - Alternative: S3StorageProvider (for AWS S3 or S3-compatible services)
 * 
 * To switch storage providers, change the useClass in STORAGE_PROVIDER below.
 * 
 * Generic Media Storage:
 * - MediaAssetService: Upload, manage, and delete media assets
 * - MediaCollectionService: Manage collections with validation rules
 * - MediaRelationService: Attach assets to any entity (polymorphic relations)
 * 
 * @Global decorator makes MediaRelationService available to all modules
 * for easy integration without explicit imports.
 */
@Global()
@Module({
  imports: [
    ZarpAuthModule, // Required for AdminJwtGuard, TenantGuard, RolesGuard
  ],
  controllers: [
    BlogController,
    ArticleController,
    ArticleImageController,
    AuthorController,
    PublicBlogController,
    MediaAssetController,
    MediaCollectionController,
    MediaRelationController,
  ],
  providers: [
    BlogService,
    ArticleService,
    ArticleImageService,
    AuthorService,
    MediaAssetService,
    MediaCollectionService,
    MediaRelationService,
    BlogSecretKeyGuard,
    {
      provide: BLOG_REPOSITORY,
      useClass: PrismaBlogRepository,
    },
    {
      provide: ARTICLE_REPOSITORY,
      useClass: PrismaArticleRepository,
    },
    {
      provide: ARTICLE_IMAGE_REPOSITORY,
      useClass: PrismaArticleImageRepository,
    },
    {
      provide: AUTHOR_REPOSITORY,
      useClass: PrismaAuthorRepository,
    },
    {
      provide: MEDIA_ASSET_REPOSITORY,
      useClass: PrismaMediaAssetRepository,
    },
    {
      provide: MEDIA_COLLECTION_REPOSITORY,
      useClass: PrismaMediaCollectionRepository,
    },
    {
      provide: MEDIA_RELATION_REPOSITORY,
      useClass: PrismaMediaRelationRepository,
    },
    {
      provide: STORAGE_PROVIDER,
      useClass: VercelBlobStorageProvider, // Change to S3StorageProvider if needed
    },
    {
      provide: IMAGE_PROCESSOR,
      useClass: SharpImageProcessorProvider,
    },
  ],
  exports: [
    BlogService,
    ArticleService,
    ArticleImageService,
    AuthorService,
    MediaAssetService,
    MediaCollectionService,
    MediaRelationService,
    BLOG_REPOSITORY,
    ARTICLE_REPOSITORY,
    ARTICLE_IMAGE_REPOSITORY,
    AUTHOR_REPOSITORY,
    MEDIA_ASSET_REPOSITORY,
    MEDIA_COLLECTION_REPOSITORY,
    MEDIA_RELATION_REPOSITORY,
    STORAGE_PROVIDER,
    IMAGE_PROCESSOR,
    BlogSecretKeyGuard,
  ],
})
export class ZarpCmsModule {}
