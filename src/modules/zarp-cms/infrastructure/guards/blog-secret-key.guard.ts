import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { BLOG_REPOSITORY, IBlogRepository } from '../../domain/interfaces/blog.repository.interface';
import { InvalidBlogSecretKeyException } from '../../domain/errors/invalid-blog-secret-key.error';
import * as crypto from 'crypto';

@Injectable()
export class BlogSecretKeyGuard implements CanActivate {
  constructor(
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: IBlogRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const secretKey = request.headers['x-blog-secret-key'];

    if (typeof secretKey !== 'string' || secretKey.trim().length === 0) {
      throw new UnauthorizedException('Missing x-blog-secret-key header');
    }

    const hash = crypto.createHash('sha256').update(secretKey).digest('hex');

    const blog = await this.blogRepository.findBySecretKey(hash);

    if (!blog || !blog.active) {
      throw new InvalidBlogSecretKeyException();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { secretKeyHash: _h, secretKeySalt: _s, ...rest } = blog;
    request.blog = rest;

    return true;
  }
}
