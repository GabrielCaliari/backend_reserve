import { Test, TestingModule } from '@nestjs/testing';
import { AuthorService } from './author.service';
import { AUTHOR_REPOSITORY } from '../../domain/interfaces/author.repository.interface';
import { MEDIA_ASSET_REPOSITORY } from '../../domain/interfaces/media-asset.repository.interface';
import { Author } from '../../domain/entities/author.entity';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { CreateAuthorDTO } from '../dtos/create-author.dto';
import { UpdateAuthorDTO } from '../dtos/update-author.dto';

describe('AuthorService', () => {
  let service: AuthorService;
  let mockAuthorRepo: any;
  let mockMediaAssetRepo: any;

  beforeEach(async () => {
    mockAuthorRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasPublishedArticles: jest.fn(),
    };

    mockMediaAssetRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorService,
        {
          provide: AUTHOR_REPOSITORY,
          useValue: mockAuthorRepo,
        },
        {
          provide: MEDIA_ASSET_REPOSITORY,
          useValue: mockMediaAssetRepo,
        },
      ],
    }).compile();

    service = module.get<AuthorService>(AuthorService);
  });

  describe('createAuthor', () => {
    it('should create an author successfully', async () => {
      const dto: CreateAuthorDTO = {
        firstName: 'John',
        lastName: 'Doe',
        biography: 'Test bio',
        tenantId: 1,
      };

      const createdAuthor = new Author({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        biography: 'Test bio',
        tenantId: 1,
        active: true,
      });

      mockAuthorRepo.create.mockResolvedValue(createdAuthor);

      const result = await service.createAuthor(dto);

      expect(result.status).toBe(201);
      expect(result.data).toEqual(createdAuthor);
      expect(mockAuthorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          biography: 'Test bio',
          tenantId: 1,
        }),
      );
    });

    it('should fail with invalid tenant ID', async () => {
      const dto: CreateAuthorDTO = {
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 0,
      };

      const result = await service.createAuthor(dto);

      expect(result.status).toBe(400);
      expect(result.data).toHaveProperty('code', '400:Invalid tenant ID');
    });

    it('should validate avatar when provided', async () => {
      const dto: CreateAuthorDTO = {
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        avatarId: 100,
      };

      const avatar = new MediaAsset({
        url: 'https://example.com/avatar.jpg',
        storage_key: 'avatars/avatar.jpg',
        filename: 'avatar.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
        collection_id: 1,
        tenant_id: 1,
        created_by: 1,
      });
      // Manually set id after construction (simulating DB return)
      (avatar as any).id = 100;

      mockMediaAssetRepo.findById.mockResolvedValue(avatar);

      const createdAuthor = new Author({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        avatarId: 100,
        active: true,
      });

      mockAuthorRepo.create.mockResolvedValue(createdAuthor);

      const result = await service.createAuthor(dto);

      expect(result.status).toBe(201);
      expect(mockMediaAssetRepo.findById).toHaveBeenCalledWith(100, 1);
    });

    it('should fail when avatar not found', async () => {
      const dto: CreateAuthorDTO = {
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        avatarId: 999,
      };

      mockMediaAssetRepo.findById.mockResolvedValue(null);

      const result = await service.createAuthor(dto);

      expect(result.status).toBe(404);
      expect(result.data).toHaveProperty('code', '404:Avatar MediaAsset not found');
    });
  });

  describe('updateAuthor', () => {
    it('should update an author successfully', async () => {
      const existingAuthor = new Author({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        active: true,
      });

      const dto: UpdateAuthorDTO = {
        firstName: 'Jane',
        biography: 'Updated bio',
      };

      const updatedAuthor = new Author({
        id: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        biography: 'Updated bio',
        tenantId: 1,
        active: true,
      });

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockAuthorRepo.update.mockResolvedValue(updatedAuthor);

      const result = await service.updateAuthor(1, dto);

      expect(result.status).toBe(200);
      expect(result.data).toEqual(updatedAuthor);
    });

    it('should fail when author not found', async () => {
      mockAuthorRepo.findById.mockResolvedValue(null);

      const result = await service.updateAuthor(999, { firstName: 'Jane' });

      expect(result.status).toBe(404);
      expect(result.data).toHaveProperty('code', '404:Author not found');
    });
  });

  describe('deleteAuthor', () => {
    it('should delete an author without published articles', async () => {
      const existingAuthor = new Author({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        active: true,
      });

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockAuthorRepo.hasPublishedArticles.mockResolvedValue(false);
      mockAuthorRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteAuthor(1);

      expect(result.status).toBe(204);
      expect(mockAuthorRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should fail when author has published articles', async () => {
      const existingAuthor = new Author({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        active: true,
      });

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockAuthorRepo.hasPublishedArticles.mockResolvedValue(true);

      const result = await service.deleteAuthor(1);

      expect(result.status).toBe(400);
      expect(result.data).toHaveProperty(
        'code',
        '400:Cannot delete author with published articles',
      );
      expect(mockAuthorRepo.delete).not.toHaveBeenCalled();
    });

    it('should fail when author not found', async () => {
      mockAuthorRepo.findById.mockResolvedValue(null);

      const result = await service.deleteAuthor(999);

      expect(result.status).toBe(404);
      expect(result.data).toHaveProperty('code', '404:Author not found');
    });
  });

  describe('assignAvatar', () => {
    it('should assign avatar successfully', async () => {
      const existingAuthor = new Author({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        active: true,
      });

      const avatar = new MediaAsset({
        url: 'https://example.com/avatar.jpg',
        storage_key: 'avatars/avatar.jpg',
        filename: 'avatar.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
        collection_id: 1,
        tenant_id: 1,
        created_by: 1,
      });
      // Manually set id after construction (simulating DB return)
      (avatar as any).id = 100;

      const updatedAuthor = new Author({
        ...existingAuthor,
        avatarId: 100,
      });

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockMediaAssetRepo.findById.mockResolvedValue(avatar);
      mockAuthorRepo.update.mockResolvedValue(updatedAuthor);

      const result = await service.assignAvatar(1, 100);

      expect(result.status).toBe(200);
      expect(result.data).toEqual(updatedAuthor);
      expect(mockAuthorRepo.update).toHaveBeenCalledWith(1, { avatarId: 100 });
    });

    it('should fail when avatar tenant mismatch', async () => {
      const existingAuthor = new Author({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 1,
        active: true,
      });

      const avatar = new MediaAsset({
        url: 'https://example.com/avatar.jpg',
        storage_key: 'avatars/avatar.jpg',
        filename: 'avatar.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
        collection_id: 1,
        tenant_id: 2, // Different tenant
        created_by: 1,
      });
      // Manually set id after construction (simulating DB return)
      (avatar as any).id = 100;

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockMediaAssetRepo.findById.mockResolvedValue(avatar);

      const result = await service.assignAvatar(1, 100);

      expect(result.status).toBe(400);
      expect(result.data).toHaveProperty(
        'code',
        '400:Avatar must belong to the same tenant as the author',
      );
    });
  });
});
