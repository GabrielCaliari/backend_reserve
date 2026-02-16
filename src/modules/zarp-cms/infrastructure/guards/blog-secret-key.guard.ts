import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { BLOG_REPOSITORY, IBlogRepository } from '@/modules/zarp-cms/domain/interfaces/blog.repository.interface';
import { InvalidBlogSecretKeyException } from '@/modules/zarp-cms/domain/errors/invalid-blog-secret-key.error';
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

    if (!secretKey) {
      throw new UnauthorizedException('Missing x-blog-secret-key header');
    }

    const hash = crypto.createHash('sha256').update(secretKey as string).digest('hex');

    const blog = await this.blogRepository.findBySecretKey(hash);

    if (!blog || !blog.active) {
      throw new InvalidBlogSecretKeyException();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { secret_key_hash: _h, secret_key_salt: _s, ...rest } = blog;
    request.blog = rest;

    return true;
  }
}
