import { Test, TestingModule } from '@nestjs/testing';
import { AuthorService } from './author.service';
import { AUTHOR_REPOSITORY } from '../../domain/interfaces/author.repository.interface';
import { MEDIA_ASSET_REPOSITORY } from '../../domain/interfaces/media-asset.repository.interface';
import { Author } from '../../domain/entities/author.entity';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { CreateAuthorDTO } from '../dtos/create-author.dto';
import { UpdateAuthorDTO } from '../dtos/update-author.dto';

const tenantId = 't123456789012345678901234';
const otherTenantId = 'z123456789012345678901234';
const authorId = 'a123456789012345678901234';
const avatarId = 'm123456789012345678901234';
const collectionId = 'l123456789012345678901234';
const creatorId = 'u123456789012345678901234';

function buildAuthor(overrides: Partial<ConstructorParameters<typeof Author>[0]> = {}) {
  return new Author({
    id: authorId,
    firstName: 'John',
    lastName: 'Doe',
    biography: 'Test bio',
    tenantId,
    active: true,
    ...overrides,
  });
}

function buildAvatar(overrides: Partial<ConstructorParameters<typeof MediaAsset>[0]> = {}) {
  const asset = new MediaAsset({
    url: 'https://example.com/avatar.jpg',
    storage_key: 'authors/avatar.jpg',
    filename: 'avatar.jpg',
    mime_type: 'image/jpeg',
    file_size: 1024,
    collection_id: collectionId,
    tenant_id: tenantId,
    created_by: creatorId,
    ...overrides,
  });

  Object.defineProperty(asset, 'id', {
    value: avatarId,
    configurable: true,
  });

  return asset;
}

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
        tenantId,
      };

      const createdAuthor = buildAuthor();

      mockAuthorRepo.create.mockResolvedValue(createdAuthor);

      const result = await service.createAuthor(dto);

      expect(result.status).toBe(201);
      expect(result.data).toEqual(createdAuthor);
      expect(mockAuthorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          biography: 'Test bio',
          tenantId,
        }),
      );
    });

    it('should fail with invalid tenant ID', async () => {
      const dto: CreateAuthorDTO = {
        firstName: 'John',
        lastName: 'Doe',
        tenantId: '0',
      };

      const result = await service.createAuthor(dto);

      expect(result.status).toBe(400);
      expect(result.data).toHaveProperty('code', '400:Invalid tenant ID');
    });

    it('should validate avatar when provided', async () => {
      const dto: CreateAuthorDTO = {
        firstName: 'John',
        lastName: 'Doe',
        tenantId,
        avatarId,
      };

      const avatar = buildAvatar();

      mockMediaAssetRepo.findById.mockResolvedValue(avatar);

      const createdAuthor = buildAuthor({ avatarId });

      mockAuthorRepo.create.mockResolvedValue(createdAuthor);

      const result = await service.createAuthor(dto);

      expect(result.status).toBe(201);
      expect(mockMediaAssetRepo.findById).toHaveBeenCalledWith(avatarId, tenantId);
    });

    it('should fail when avatar not found', async () => {
      const dto: CreateAuthorDTO = {
        firstName: 'John',
        lastName: 'Doe',
        tenantId,
        avatarId,
      };

      mockMediaAssetRepo.findById.mockResolvedValue(null);

      const result = await service.createAuthor(dto);

      expect(result.status).toBe(404);
      expect(result.data).toHaveProperty('code', '404:Avatar MediaAsset not found');
    });
  });

  describe('updateAuthor', () => {
    it('should update an author successfully', async () => {
      const existingAuthor = buildAuthor();

      const dto: UpdateAuthorDTO = {
        firstName: 'Jane',
        biography: 'Updated bio',
      };

      const updatedAuthor = buildAuthor({
        firstName: 'Jane',
        biography: 'Updated bio',
      });

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockAuthorRepo.update.mockResolvedValue(updatedAuthor);

      const result = await service.updateAuthor(authorId, dto);

      expect(result.status).toBe(200);
      expect(result.data).toEqual(updatedAuthor);
    });

    it('should fail when author not found', async () => {
      mockAuthorRepo.findById.mockResolvedValue(null);

      const result = await service.updateAuthor(authorId, { firstName: 'Jane' });

      expect(result.status).toBe(404);
      expect(result.data).toHaveProperty('code', '404:Author not found');
    });
  });

  describe('deleteAuthor', () => {
    it('should delete an author without published articles', async () => {
      const existingAuthor = buildAuthor();

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockAuthorRepo.hasPublishedArticles.mockResolvedValue(false);
      mockAuthorRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteAuthor(authorId);

      expect(result.status).toBe(204);
      expect(mockAuthorRepo.delete).toHaveBeenCalledWith(authorId);
    });

    it('should fail when author has published articles', async () => {
      const existingAuthor = buildAuthor();

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockAuthorRepo.hasPublishedArticles.mockResolvedValue(true);

      const result = await service.deleteAuthor(authorId);

      expect(result.status).toBe(400);
      expect(result.data).toHaveProperty(
        'code',
        '400:Cannot delete author with published articles',
      );
      expect(mockAuthorRepo.delete).not.toHaveBeenCalled();
    });

    it('should fail when author not found', async () => {
      mockAuthorRepo.findById.mockResolvedValue(null);

      const result = await service.deleteAuthor(authorId);

      expect(result.status).toBe(404);
      expect(result.data).toHaveProperty('code', '404:Author not found');
    });
  });

  describe('assignAvatar', () => {
    it('should assign avatar successfully', async () => {
      const existingAuthor = buildAuthor();
      const avatar = buildAvatar();
      const updatedAuthor = buildAuthor({ avatarId });

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockMediaAssetRepo.findById.mockResolvedValue(avatar);
      mockAuthorRepo.update.mockResolvedValue(updatedAuthor);

      const result = await service.assignAvatar(authorId, avatarId);

      expect(result.status).toBe(200);
      expect(result.data).toEqual(updatedAuthor);
      expect(mockAuthorRepo.update).toHaveBeenCalledWith(authorId, { avatarId });
    });

    it('should fail when avatar tenant mismatch', async () => {
      const existingAuthor = buildAuthor();
      const avatar = buildAvatar({ tenant_id: otherTenantId });

      mockAuthorRepo.findById.mockResolvedValue(existingAuthor);
      mockMediaAssetRepo.findById.mockResolvedValue(avatar);

      const result = await service.assignAvatar(authorId, avatarId);

      expect(result.status).toBe(400);
      expect(result.data).toHaveProperty(
        'code',
        '400:Avatar must belong to the same tenant as the author',
      );
    });

    it('should fail when author does not belong to the current tenant', async () => {
      mockAuthorRepo.findById.mockResolvedValue(buildAuthor({ tenantId: otherTenantId }));

      const result = await service.assignAvatar(authorId, avatarId, tenantId);

      expect(result.status).toBe(404);
      expect(result.data).toHaveProperty('code', '404:Author not found');
      expect(mockMediaAssetRepo.findById).not.toHaveBeenCalled();
    });
  });
});
