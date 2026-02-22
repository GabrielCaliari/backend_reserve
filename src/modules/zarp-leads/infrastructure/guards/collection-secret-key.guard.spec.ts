import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CollectionSecretKeyGuard } from './collection-secret-key.guard';
import { LEAD_COLLECTION_REPOSITORY } from '../../domain/interfaces/lead-collection.repository.interface';
import { LeadCollection } from '../../domain/entities/lead-collection.entity';
import { InvalidCollectionSecretKeyException } from '../../domain/errors/invalid-collection-secret-key.error';
import * as crypto from 'crypto';

describe('CollectionSecretKeyGuard', () => {
  let guard: CollectionSecretKeyGuard;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findBySecretKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionSecretKeyGuard,
        {
          provide: LEAD_COLLECTION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    guard = module.get<CollectionSecretKeyGuard>(CollectionSecretKeyGuard);
  });

  const createMockExecutionContext = (headers: any): ExecutionContext => {
    const request = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if x-collection-secret-key header is missing', async () => {
    const context = createMockExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow('Missing x-collection-secret-key header');
  });

  it('should throw InvalidCollectionSecretKeyException if collection not found', async () => {
    const secretKey = 'test123';
    const context = createMockExecutionContext({ 'x-collection-secret-key': secretKey });

    mockRepository.findBySecretKey.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(InvalidCollectionSecretKeyException);
  });

  it('should throw InvalidCollectionSecretKeyException if collection is inactive', async () => {
    const secretKey = 'test123';
    const context = createMockExecutionContext({ 'x-collection-secret-key': secretKey });

    const inactiveCollection = new LeadCollection({
      id: 1,
      name: 'Test',
      slug: 'test',
      source: 'test',
      secretKeyHash: 'hash',
      secretKeySalt: 'salt',
      active: false,
      tenantId: 1,
    });

    mockRepository.findBySecretKey.mockResolvedValue(inactiveCollection);

    await expect(guard.canActivate(context)).rejects.toThrow(InvalidCollectionSecretKeyException);
  });

  it('should return true and attach collection to request if valid key', async () => {
    const secretKey = 'test123';
    const hash = crypto.createHash('sha256').update(secretKey).digest('hex');
    const request = { headers: { 'x-collection-secret-key': secretKey } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    const activeCollection = new LeadCollection({
      id: 1,
      name: 'Test',
      slug: 'test',
      source: 'test',
      secretKeyHash: hash,
      secretKeySalt: 'salt',
      active: true,
      tenantId: 1,
    });

    mockRepository.findBySecretKey.mockResolvedValue(activeCollection);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRepository.findBySecretKey).toHaveBeenCalledWith(hash);
    expect(request['collection']).toBeDefined();
    expect(request['collection'].id).toBe(1);
  });
});
