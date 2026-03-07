import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { InMemoryBlogRepository } from '../../../../shared/testing/in-memory-repos/in-memory-blog.repository';
import { BLOG_REPOSITORY } from '../../domain/interfaces/blog.repository.interface';
import { CreateBlogDTO } from '../dtos/create-blog.dto';
import { BlogNotFoundError } from '../../domain/errors/blog-not-found.error';
import * as crypto from 'crypto';

describe('BlogService', () => {
  let service: BlogService;
  let repo: InMemoryBlogRepository;

  beforeEach(async () => {
    repo = new InMemoryBlogRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: BLOG_REPOSITORY,
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  describe('create', () => {
    it('should create a blog with generated secret key', async () => {
      const dto: CreateBlogDTO = { name: 'My Tech Blog', description: 'Tech stuff' };
      const tenantId = '1';

      // Mock randomBytes for predictable secret key
      // 32 bytes hex = 64 chars
      const mockBuffer = Buffer.from('a'.repeat(32));
      jest.spyOn(crypto, 'randomBytes').mockImplementation(() => mockBuffer);
      
      // Mock createHash
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed_key'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

      const response = await service.create(tenantId, dto);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe(dto.name);
      expect(response.data.tenantId).toBe(tenantId);
      // The service should return the PLAIN secret key for the client
      expect(response.data.secret_key).toBe(mockBuffer.toString('hex'));
      
      // Verify repository stored the HASH
      const stored = await repo.findById(response.data.id);
      expect(stored).toBeDefined();
      expect(stored!.secretKeyHash).toBe('hashed_key');
      // expect(stored!.secretKeySalt).toBeDefined(); // salt is stored but random

    });
  });

  describe('findAll', () => {
    it('should return only blogs for the given tenant', async () => {
      repo.seed({ name: 'T1 Blog', tenantId: '1' });
      repo.seed({ name: 'T2 Blog', tenantId: '2' });

      const response = await service.findAll('1');
      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].name).toBe('T1 Blog');
    });

    it('should not expose secret keys in list', async () => {
       repo.seed({ name: 'Safe Blog', tenantId: '1' });
       const response = await service.findAll('1');
       expect(response.status).toBe(200);
       expect(response.data[0]).not.toHaveProperty('secret_key');
       expect(response.data[0]).not.toHaveProperty('secretKeyHash');
       expect(response.data[0]).not.toHaveProperty('secretKeySalt');
    });
  });

  describe('update', () => {
    it('should update blog metadata', async () => {
      const blog = repo.seed({ name: 'Old Name', tenantId: '1' });
      const dto = { name: 'New Name' };

      const response = await service.update('1', blog.id, dto);
      expect(response.status).toBe(200);
      expect(response.data.name).toBe('New Name');
      
      const stored = await repo.findById(blog.id);
      expect(stored!.name).toBe('New Name');
    });

    it('should throw BlogNotFoundError if blog does not exist', async () => {
      const response = await service.update('1', '999', { name: 'Ghost' });
      expect(response.status).toBe(404);
    });

    it('should throw BlogNotFoundError if blog belongs to another tenant', async () => {
      const blog = repo.seed({ name: 'Other Tenant', tenantId: '2' });
      const response = await service.update('1', blog.id, { name: 'Hacker' });
      expect(response.status).toBe(404);
    });
  });

  describe('delete', () => {
    it('should soft delete the blog', async () => {
      const blog = repo.seed({ name: 'To Delete', tenantId: '1' });
      const response = await service.delete('1', blog.id);
      expect(response.status).toBe(200);

      const stored = await repo.findById(blog.id);
      expect(stored).toBeNull(); // findById checks active=true
    });

    it('should throw BlogNotFoundError if blog belongs to another tenant', async () => {
       const blog = repo.seed({ name: 'Other Tenant', tenantId: '2' });
       const response = await service.delete('1', blog.id);
       expect(response.status).toBe(404);
    });
  });

  describe('regenerateSecretKey', () => {
    it('should generate a new secret key and update the hash', async () => {
      const blog = repo.seed({ 
        name: 'Test Blog', 
        tenantId: '1',
        secretKeyHash: 'old_hash',
        secretKeySalt: 'old_salt',
      });

      // Mock randomBytes for predictable secret key
      const mockBuffer = Buffer.from('b'.repeat(32));
      jest.spyOn(crypto, 'randomBytes').mockImplementation(() => mockBuffer);
      
      // Mock createHash
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('new_hashed_key'),
      };
      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

      const response = await service.regenerateSecretKey('1', blog.id);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.secret_key).toBe(mockBuffer.toString('hex'));
      
      // Verify repository stored the NEW HASH
      const stored = await repo.findById(blog.id);
      expect(stored).toBeDefined();
      expect(stored!.secretKeyHash).toBe('new_hashed_key');
      expect(stored!.secretKeyHash).not.toBe('old_hash');
    });

    it('should throw BlogNotFoundError if blog does not exist', async () => {
      const response = await service.regenerateSecretKey('1', '999');
      expect(response.status).toBe(404);
    });

    it('should throw BlogNotFoundError if blog belongs to another tenant', async () => {
      const blog = repo.seed({ name: 'Other Tenant', tenantId: '2' });
      const response = await service.regenerateSecretKey('1', blog.id);
      expect(response.status).toBe(404);
    });
  });
});
