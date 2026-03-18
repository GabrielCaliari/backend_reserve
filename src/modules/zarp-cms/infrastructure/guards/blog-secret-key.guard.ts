import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BLOG_REPOSITORY, IBlogRepository } from '../../domain/interfaces/blog.repository.interface';
import { InvalidBlogSecretKeyException } from '../../domain/errors/invalid-blog-secret-key.error';
import * as crypto from 'crypto';

@Injectable()
export class BlogSecretKeyGuard implements CanActivate {
  constructor(
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: IBlogRepository,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const secretKey = request.headers['x-blog-secret-key'];

    if (typeof secretKey !== 'string' || secretKey.trim().length === 0) {
      throw new UnauthorizedException('Missing x-blog-secret-key header');
    }

    // Get all active blogs to check against
    const blogs = await this.blogRepository.findAllActive();
    
    const privateKey = this.configService.get<string>('ENCRYPT_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('ENCRYPT_PRIVATE_KEY not configured');
    }

    let matchedBlog = null;

    for (const blog of blogs) {
      if (!blog.secretKeyHash || !blog.active) {
        continue;
      }

      let isMatch = false;

      // Try PBKDF2-SHA512 (new format with salt) - used by seeds
      if (blog.secretKeySalt) {
        const hashPBKDF2 = crypto
          .pbkdf2Sync(secretKey, blog.secretKeySalt + privateKey, 856, 64, 'sha512')
          .toString('hex');
        
        if (hashPBKDF2 === blog.secretKeyHash) {
          isMatch = true;
        }
      }

      // Fallback to SHA-256 (legacy format without salt) - used by BlogService
      if (!isMatch) {
        const hashSHA256 = crypto
          .createHash('sha256')
          .update(secretKey)
          .digest('hex');
        
        if (hashSHA256 === blog.secretKeyHash) {
          isMatch = true;
        }
      }

      if (isMatch) {
        matchedBlog = blog;
        break;
      }
    }

    if (!matchedBlog) {
      throw new InvalidBlogSecretKeyException();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { secretKeyHash: _h, secretKeySalt: _s, ...rest } = matchedBlog;
    request.blog = rest;

    return true;
  }
}
