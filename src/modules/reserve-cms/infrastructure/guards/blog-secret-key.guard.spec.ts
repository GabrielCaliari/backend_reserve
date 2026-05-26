import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogSecretKeyGuard } from './blog-secret-key.guard';
import { BLOG_REPOSITORY } from '../../domain/interfaces/blog.repository.interface';
import { InMemoryBlogRepository } from '../../../../shared/testing/in-memory-repos/in-memory-blog.repository';
import { InvalidBlogSecretKeyException } from '../../domain/errors/invalid-blog-secret-key.error';
import * as crypto from 'crypto';

describe('BlogSecretKeyGuard', () => {
  let guard: BlogSecretKeyGuard;
  let repo: InMemoryBlogRepository;
  let configService: ConfigService;

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
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPT_PRIVATE_KEY') return 'test-private-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<BlogSecretKeyGuard>(BlogSecretKeyGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should throw UnauthorizedException if header is missing', async () => {
    const ctx = createMockContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw InvalidBlogSecretKeyException if hash does not match any blog', async () => {
    // Setup repo with a blog that has SHA-256 hash
    repo.seed({ 
      secretKeyHash: 'correct-hash',
      secretKeySalt: 'some-salt',
      active: true,
    });

    const ctx = createMockContext({ 'x-blog-secret-key': 'invalid-key' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(InvalidBlogSecretKeyException);
  });

  it('should return true and attach blog to request if key is valid (SHA-256)', async () => {
    const secretKey = 'valid_key';
    const hash = crypto.createHash('sha256').update(secretKey).digest('hex');
    
    const blog = repo.seed({ 
      secretKeyHash: hash,
      secretKeySalt: '',
      name: 'My Blog',
      active: true,
    });

    const ctx = createMockContext({ 'x-blog-secret-key': secretKey });
    const request = ctx.switchToHttp().getRequest();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.blog).toBeDefined();
    expect(request.blog.id).toBe(blog.id);
  });

  it('should return true and attach blog to request if key is valid (PBKDF2)', async () => {
    const secretKey = 'valid_pbkdf2_key';
    const salt = 'test-salt';
    const privateKey = 'test-private-key';
    const hash = crypto.pbkdf2Sync(secretKey, salt + privateKey, 856, 64, 'sha512').toString('hex');
    
    const blog = repo.seed({ 
      secretKeyHash: hash,
      secretKeySalt: salt,
      name: 'My PBKDF2 Blog',
      active: true,
    });

    const ctx = createMockContext({ 'x-blog-secret-key': secretKey });
    const request = ctx.switchToHttp().getRequest();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.blog).toBeDefined();
    expect(request.blog.id).toBe(blog.id);
  });
});
