import { Test, TestingModule } from '@nestjs/testing';
import { LeadCollectionService } from './lead-collection.service';
import { LEAD_COLLECTION_REPOSITORY } from '../../domain/interfaces/lead-collection.repository.interface';
import { LeadCollection } from '../../domain/entities/lead-collection.entity';
import { EAccessMode } from '../../domain/enums/access-mode.enum';
import { CreateCollectionDto } from '../dtos/create-collection.dto';
import { CollectionSlugConflictError } from '../../domain/errors/collection-slug-conflict.error';
import { CollectionNotFoundError } from '../../domain/errors/collection-not-found.error';

const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findBySlugAndTenantId: jest.fn(),
  findAllByTenantId: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
};

describe('LeadCollectionService', () => {
  let service: LeadCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadCollectionService,
        {
          provide: LEAD_COLLECTION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LeadCollectionService>(LeadCollectionService);
    jest.clearAllMocks();
  });

  describe('createCollection', () => {
    const tenantId = 1;
    const dto: CreateCollectionDto = {
      name: 'Test Collection',
      source: 'landing-page',
      access_mode: EAccessMode.public,
    };

    it('should create a collection successfully', async () => {
      const slug = 'test-collection';
      mockRepository.findBySlugAndTenantId.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: 1,
        ...dto,
        slug,
        tenantId,
        active: true,
        allowedDomains: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: () => true,
      } as LeadCollection);

      const result = await service.createCollection(dto, tenantId);

      expect(mockRepository.findBySlugAndTenantId).toHaveBeenCalledWith(slug, tenantId);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(result.name).toBe(dto.name);
    });

    it('should handle slug conflict by throwing error', async () => {
      const slug = 'test-collection';
      mockRepository.findBySlugAndTenantId.mockResolvedValue({ id: 2 } as LeadCollection);
      
      await expect(service.createCollection(dto, tenantId)).rejects.toThrow(CollectionSlugConflictError);
    });
  });

  describe('findCollections', () => {
    it('should return paginated collections for tenant', async () => {
      const tenantId = 1;
      const collections = [{ id: 1, name: 'C1' }];
      mockRepository.findAllByTenantId.mockResolvedValue({ collections, total: 1 });

      const result = await service.findCollections({ page: 1, limit: 10 }, tenantId);
      
      expect(mockRepository.findAllByTenantId).toHaveBeenCalledWith(tenantId, expect.anything());
      expect(result.data).toEqual(collections);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateCollection', () => {
    it('should update collection if found', async () => {
      const id = 1;
      const tenantId = 1;
      const existing = new LeadCollection({ id, tenantId, name: 'Old' });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue({ ...existing, name: 'New' });

      const result = await service.updateCollection(id, { name: 'New' }, tenantId);
      
      expect(result.name).toBe('New');
    });

    it('should throw if collection not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.updateCollection(999, {}, 1)).rejects.toThrow(CollectionNotFoundError);
    });
  });
});
