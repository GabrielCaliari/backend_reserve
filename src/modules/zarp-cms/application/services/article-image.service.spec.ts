import { Test, TestingModule } from '@nestjs/testing';
import { ArticleImageService } from './article-image.service';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../../domain/interfaces/article.repository.interface';
import {
  ARTICLE_IMAGE_REPOSITORY,
  IArticleImageRepository,
} from '../../domain/interfaces/article-image.repository.interface';
import {
  STORAGE_PROVIDER,
  IStorageProvider,
} from '../../domain/interfaces/storage.interface';
import {
  IMAGE_PROCESSOR,
  IImageProcessor,
} from '../../domain/interfaces/image-processor.interface';

describe('ArticleImageService', () => {
  let service: ArticleImageService;
  let articleRepository: jest.Mocked<IArticleRepository>;

  beforeEach(async () => {
    const mockArticleRepository: Partial<IArticleRepository> = {
      findById: jest.fn(),
    };

    const mockArticleImageRepository: Partial<IArticleImageRepository> = {
      countByArticleId: jest.fn(),
      create: jest.fn(),
    };

    const mockStorageProvider: Partial<IStorageProvider> = {
      upload: jest.fn(),
    };

    const mockImageProcessor: Partial<IImageProcessor> = {
      processToWebp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleImageService,
        {
          provide: ARTICLE_REPOSITORY,
          useValue: mockArticleRepository,
        },
        {
          provide: ARTICLE_IMAGE_REPOSITORY,
          useValue: mockArticleImageRepository,
        },
        {
          provide: STORAGE_PROVIDER,
          useValue: mockStorageProvider,
        },
        {
          provide: IMAGE_PROCESSOR,
          useValue: mockImageProcessor,
        },
      ],
    }).compile();

    service = module.get<ArticleImageService>(ArticleImageService);
    articleRepository = module.get(ARTICLE_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // DEPRECATED: ArticleImage service is being replaced by MediaAsset system
  // Tests removed as this service will be phased out in favor of the new media management system
});
