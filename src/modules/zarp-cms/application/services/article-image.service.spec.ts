import { Test, TestingModule } from '@nestjs/testing';
import { ArticleImageService } from './article-image.service';
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
import { ImageLimitExceededError } from '../../domain/errors/image-limit-exceeded.error';
import { ArticleNotFoundError } from '../../domain/errors/article-not-found.error';

describe('ArticleImageService', () => {
  let service: ArticleImageService;
  let imageRepository: IArticleImageRepository;
  let articleRepository: IArticleRepository;
  let storageProvider: IStorageProvider;
  let imageProcessor: IImageProcessor;

  const mockArticle = {
    id: 1,
    title: 'Test Article',
    slug: 'test-article',
    blog_id: 1,
  };

  const mockImage = {
    id: 1,
    url: 'https://cdn.example.com/image.webp',
    storage_key: 'tenant/blog/article/image.webp',
    alt_text: 'Test image',
    display_order: 1,
    file_size: 50000,
    original_format: 'jpeg',
    article_id: 1,
  };

  beforeEach(async () => {
    const mockImageRepository: Partial<IArticleImageRepository> = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByArticleId: jest.fn(),
      countByArticleId: jest.fn(),
      updateDisplayOrders: jest.fn(),
      delete: jest.fn(),
    };

    const mockArticleRepository: Partial<IArticleRepository> = {
      findById: jest.fn(),
    };

    const mockStorageProvider: Partial<IStorageProvider> = {
      upload: jest.fn(),
      delete: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    const mockImageProcessor: Partial<IImageProcessor> = {
      processToWebp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleImageService,
        {
          provide: ARTICLE_IMAGE_REPOSITORY,
          useValue: mockImageRepository,
        },
        {
          provide: ARTICLE_REPOSITORY,
          useValue: mockArticleRepository,
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
    imageRepository = module.get<IArticleImageRepository>(ARTICLE_IMAGE_REPOSITORY);
    articleRepository = module.get<IArticleRepository>(ARTICLE_REPOSITORY);
    storageProvider = module.get<IStorageProvider>(STORAGE_PROVIDER);
    imageProcessor = module.get<IImageProcessor>(IMAGE_PROCESSOR);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload and process an image', async () => {
      const buffer = Buffer.from('test');
      const processedBuffer = Buffer.from('processed');

      jest.spyOn(articleRepository, 'findById').mockResolvedValue(mockArticle);
      jest.spyOn(imageRepository, 'countByArticleId').mockResolvedValue(5);
      jest.spyOn(imageProcessor, 'processToWebp').mockResolvedValue({
        data: processedBuffer,
        size: 50000,
        format: 'webp',
      });
      jest.spyOn(storageProvider, 'upload').mockResolvedValue({
        url: 'https://cdn.example.com/image.webp',
        key: 'tenant/blog/article/image.webp',
      });
      jest.spyOn(imageRepository, 'create').mockResolvedValue(mockImage);

      const result = await service.upload(1, buffer, 'jpeg', 'Test image');

      expect(result).toEqual(mockImage);
      expect(imageProcessor.processToWebp).toHaveBeenCalledWith(buffer, 80);
      expect(storageProvider.upload).toHaveBeenCalled();
      expect(imageRepository.create).toHaveBeenCalled();
    });

    it('should throw error if article not found', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(null);

      await expect(service.upload(999, Buffer.from('test'), 'jpeg')).rejects.toThrow(
        ArticleNotFoundError,
      );
    });

    it('should throw error if image limit exceeded', async () => {
      jest.spyOn(articleRepository, 'findById').mockResolvedValue(mockArticle);
      jest.spyOn(imageRepository, 'countByArticleId').mockResolvedValue(20);

      await expect(service.upload(1, Buffer.from('test'), 'jpeg')).rejects.toThrow(
        ImageLimitExceededError,
      );
    });
  });

  describe('delete', () => {
    it('should delete an image from storage and database', async () => {
      jest.spyOn(imageRepository, 'findById').mockResolvedValue(mockImage);
      jest.spyOn(storageProvider, 'delete').mockResolvedValue(undefined);
      jest.spyOn(imageRepository, 'delete').mockResolvedValue(undefined);

      await service.delete(1);

      expect(storageProvider.delete).toHaveBeenCalledWith(mockImage.storage_key);
      expect(imageRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error if image not found', async () => {
      jest.spyOn(imageRepository, 'findById').mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow('Image not found');
    });
  });

  describe('reorderImages', () => {
    it('should reorder images within an article', async () => {
      jest.spyOn(imageRepository, 'updateDisplayOrders').mockResolvedValue(undefined);

      await service.reorderImages(1, [
        { id: 1, display_order: 2 },
        { id: 2, display_order: 1 },
      ]);

      expect(imageRepository.updateDisplayOrders).toHaveBeenCalledWith([
        { id: 1, display_order: 2 },
        { id: 2, display_order: 1 },
      ]);
    });
  });
});
