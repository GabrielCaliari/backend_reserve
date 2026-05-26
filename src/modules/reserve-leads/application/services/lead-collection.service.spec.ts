import { Test, TestingModule } from '@nestjs/testing';
import { LeadCollectionService } from './lead-collection.service';
import { LEAD_COLLECTION_REPOSITORY } from '../../domain/interfaces/lead-collection.repository.interface';
import { LeadCollection } from '../../domain/entities/lead-collection.entity';
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
    const tenantId = '1';
    const dto: CreateCollectionDto = {
      name: 'Test Collection',
      source: 'landing-page',
    };

    it('should create a collection successfully', async () => {
      const slug = 'test-collection';
      mockRepository.findBySlugAndTenantId.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(
        new LeadCollection({
          id: '1',
          name: dto.name,
          slug,
          source: dto.source,
          secretKeyHash: 'hash',
          secretKeySalt: 'salt',
          tenantId,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      const result = await service.createCollection(dto, tenantId);

      expect(mockRepository.findBySlugAndTenantId).toHaveBeenCalledWith(slug, tenantId);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(result.name).toBe(dto.name);
      expect(result.secretKey).toBeDefined();
    });

    it('should handle slug conflict by throwing error', async () => {
      const slug = 'test-collection';
      mockRepository.findBySlugAndTenantId.mockResolvedValue(
        new LeadCollection({
          id: '2',
          name: 'Existing',
          slug,
          source: 'test',
          secretKeyHash: 'hash',
          secretKeySalt: 'salt',
          tenantId,
        })
      );
      
      await expect(service.createCollection(dto, tenantId)).rejects.toThrow(CollectionSlugConflictError);
    });
  });

  describe('findCollections', () => {
    it('should return paginated collections for tenant', async () => {
      const tenantId = '1';
      const collections = [
        new LeadCollection({
          id: '1',
          name: 'C1',
          slug: 'c1',
          source: 'test',
          secretKeyHash: 'hash',
          secretKeySalt: 'salt',
          tenantId,
        })
      ];
      mockRepository.findAllByTenantId.mockResolvedValue({ collections, total: 1 });

      const result = await service.findCollections({ page: 1, limit: 10 }, tenantId);
      
      expect(mockRepository.findAllByTenantId).toHaveBeenCalledWith(tenantId, expect.anything());
      expect(result.data).toEqual(collections);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateCollection', () => {
    it('should update collection if found', async () => {
      const id = '1';
      const tenantId = '1';
      const existing = new LeadCollection({
        id,
        name: 'Old',
        slug: 'old',
        source: 'test',
        secretKeyHash: 'hash',
        secretKeySalt: 'salt',
        tenantId,
      });
      const updated = new LeadCollection({
        ...existing,
        name: 'New',
      });
      
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.updateCollection(id, { name: 'New' }, tenantId);
      
      expect(result.name).toBe('New');
    });

    it('should throw if collection not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.updateCollection('999', {}, '1')).rejects.toThrow(CollectionNotFoundError);
    });
  });
});
