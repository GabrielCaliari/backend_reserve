import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { InMemoryBlogRepository } from '@/shared/testing/in-memory-repos/in-memory-blog.repository';
import { BLOG_REPOSITORY } from '@/modules/zarp-cms/domain/interfaces/blog.repository.interface';
import { CreateBlogDTO } from '../dtos/create-blog.dto';
import { BlogNotFoundError } from '@/modules/zarp-cms/domain/errors/blog-not-found.error';
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
    it('should create a blog with generated slug and secret key', async () => {
      const dto: CreateBlogDTO = { name: 'My Tech Blog', description: 'Tech stuff' };
      const tenantId = 1;

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

      const result = await service.create(tenantId, dto);

      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(result.slug).toBe('my-tech-blog');
      expect(result.tenant_id).toBe(tenantId);
      // The service should return the PLAIN secret key for the client
      expect(result.secret_key).toBe(mockBuffer.toString('hex'));
      
      // Verify repository stored the HASH
      const stored = await repo.findById(result.id);
      expect(stored).toBeDefined();
      expect(stored!.secret_key_hash).toBe('hashed_key');
      // expect(stored!.secret_key_salt).toBeDefined(); // salt is stored but random

    });
  });

  describe('findAll', () => {
    it('should return only blogs for the given tenant', async () => {
      repo.seed({ name: 'T1 Blog', tenant_id: 1, slug: 't1' });
      repo.seed({ name: 'T2 Blog', tenant_id: 2, slug: 't2' });

      const results = await service.findAll(1);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('T1 Blog');
    });

    it('should not expose secret keys in list', async () => {
       repo.seed({ name: 'Safe Blog', tenant_id: 1 });
       const results = await service.findAll(1);
       expect(results[0]).not.toHaveProperty('secret_key');
       expect(results[0]).not.toHaveProperty('secret_key_hash');
       expect(results[0]).not.toHaveProperty('secret_key_salt');
    });
  });

  describe('update', () => {
    it('should update blog metadata', async () => {
      const blog = repo.seed({ name: 'Old Name', tenant_id: 1 });
      const dto = { name: 'New Name' };

      const updated = await service.update(1, blog.id, dto);
      expect(updated.name).toBe('New Name');
      
      const stored = await repo.findById(blog.id);
      expect(stored!.name).toBe('New Name');
    });

    it('should throw BlogNotFoundError if blog does not exist', async () => {
      await expect(service.update(1, 999, { name: 'Ghost' }))
        .rejects.toThrow(BlogNotFoundError);
    });

    it('should throw BlogNotFoundError if blog belongs to another tenant', async () => {
      const blog = repo.seed({ name: 'Other Tenant', tenant_id: 2 });
      await expect(service.update(1, blog.id, { name: 'Hacker' }))
        .rejects.toThrow(BlogNotFoundError);
    });
  });

  describe('delete', () => {
    it('should soft delete the blog', async () => {
      const blog = repo.seed({ name: 'To Delete', tenant_id: 1 });
      await service.delete(1, blog.id);

      const stored = await repo.findById(blog.id);
      expect(stored).toBeNull(); // findById checks active=true
    });

    it('should throw BlogNotFoundError if blog belongs to another tenant', async () => {
       const blog = repo.seed({ name: 'Other Tenant', tenant_id: 2 });
       await expect(service.delete(1, blog.id))
         .rejects.toThrow(BlogNotFoundError);
    });
  });

  describe('regenerateSecretKey', () => {
    it('should generate a new secret key and update the hash', async () => {
      const blog = repo.seed({ 
        name: 'Test Blog', 
        tenant_id: 1,
        secret_key_hash: 'old_hash',
        secret_key_salt: 'old_salt',
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

      const result = await service.regenerateSecretKey(1, blog.id);

      expect(result).toBeDefined();
      expect(result.secret_key).toBe(mockBuffer.toString('hex'));
      
      // Verify repository stored the NEW HASH
      const stored = await repo.findById(blog.id);
      expect(stored).toBeDefined();
      expect(stored!.secret_key_hash).toBe('new_hashed_key');
      expect(stored!.secret_key_hash).not.toBe('old_hash');
    });

    it('should throw BlogNotFoundError if blog does not exist', async () => {
      await expect(service.regenerateSecretKey(1, 999))
        .rejects.toThrow(BlogNotFoundError);
    });

    it('should throw BlogNotFoundError if blog belongs to another tenant', async () => {
      const blog = repo.seed({ name: 'Other Tenant', tenant_id: 2 });
      await expect(service.regenerateSecretKey(1, blog.id))
        .rejects.toThrow(BlogNotFoundError);
    });
  });
});
