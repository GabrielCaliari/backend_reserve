import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { BlogSecretKeyGuard } from './blog-secret-key.guard';
import { BLOG_REPOSITORY } from '../../domain/interfaces/blog.repository.interface';
import { InMemoryBlogRepository } from '../../../../shared/testing/in-memory-repos/in-memory-blog.repository';
import { InvalidBlogSecretKeyException } from '../../domain/errors/invalid-blog-secret-key.error';
import * as crypto from 'crypto';

describe('BlogSecretKeyGuard', () => {
  let guard: BlogSecretKeyGuard;
  let repo: InMemoryBlogRepository;

  function createMockContext(headers: Record<string, string>): ExecutionContext {
    const request = {
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    repo = new InMemoryBlogRepository();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogSecretKeyGuard,
        {
          provide: BLOG_REPOSITORY,
          useValue: repo,
        },
      ],
    }).compile();

    guard = module.get<BlogSecretKeyGuard>(BlogSecretKeyGuard);
  });

  it('should throw UnauthorizedException if header is missing', async () => {
    const ctx = createMockContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw InvalidBlogSecretKeyException if hash does not match any blog', async () => {
    // We assume the guard hashes the incoming key and looks up by hash
    // Or iterates. For simplicity and security, lookup by hash is better if we store hash of (key + fixed_salt)??
    // Actually, stored is (hash, salt). We can't lookup by hash unless we use a searchable hash (which is less secure) or fixed salt.
    // However, specs say "Store SHA-256 hash".
    // If we use a random salt per blog, we can't lookup by hash easily without iterating all blogs (slow) or
    // storing a "lookup key" which is different from the actual secret.
    //
    // The spec data-model.md says: `secret_key_hash`, `secret_key_salt`.
    // And repository has `findBySecretKey(secretKeyHash: string)`.
    // Wait, if salt is unique per blog, `findBySecretKey` is impossible unless client sends ID + Key.
    // The API Contract says `x-blog-secret-key` header ONLY.
    //
    // IMPLICATION: To look up by secret key, the hash must be deterministic (no random salt OR fixed global salt) OR we must iterate.
    // Iterating is bad.
    // Deterministic hash (e.g. SHA256(key)) allows lookup.
    // Then we can verify with Scrypt(key, salt) if we want? No, that's double hashing.
    //
    // Let's assume for this implementation:
    // The lookup is done via `findBySecretKey` using a deterministic hash (e.g. SHA256(key)).
    // The `secret_key_hash` in DB is this deterministic hash.
    // The `secret_key_salt` might be used if we were doing password-style storage (client sends ID).
    // But here client sends ONLY key.
    // So we will hash the incoming key with SHA256 and look it up.
    //
    // Let's Mock crypto.createHash('sha256')
    
    // Setup repo
    repo.seed({ secret_key_hash: 'correct-hash' }); // assuming 'correct-hash' is the SHA256 of 'valid-key'

    // Mock Hash
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('wrong-hash'),
    };
    jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

    const ctx = createMockContext({ 'x-blog-secret-key': 'invalid-key' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(InvalidBlogSecretKeyException);
  });

  it('should return true and attach blog to request if key is valid', async () => {
    const blog = repo.seed({ secret_key_hash: 'valid-hash', name: 'My Blog' });

    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('valid-hash'),
    };
    jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

    const ctx = createMockContext({ 'x-blog-secret-key': 'valid_key' });
    const request = ctx.switchToHttp().getRequest();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.blog).toBeDefined();
    expect(request.blog.id).toBe(blog.id);
  });
});
