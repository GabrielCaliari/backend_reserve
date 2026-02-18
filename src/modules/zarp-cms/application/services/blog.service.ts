import { Injectable, Inject } from '@nestjs/common';
import { BLOG_REPOSITORY, IBlogRepository } from '../../domain/interfaces/blog.repository.interface';
import { CreateBlogDTO } from '../dtos/create-blog.dto';
import { UpdateBlogDTO } from '../dtos/update-blog.dto';
import { generateSlug } from '../../domain/utils/slug.util';
import { BlogSlugConflictException } from '../../domain/errors/blog-slug-conflict.error';
import { BlogNotFoundError } from '../../domain/errors/blog-not-found.error';
import * as crypto from 'crypto';

@Injectable()
export class BlogService {
  constructor(
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: IBlogRepository,
  ) {}

  async create(tenantId: number, data: CreateBlogDTO) {
    const slug = generateSlug(data.name);

    // Check slug uniqueness within tenant
    const existing = await this.blogRepository.findBySlugAndTenantId(slug, tenantId);
    if (existing) {
      throw new BlogSlugConflictException(slug);
    }

    // Generate secret key
    const secretKey = crypto.randomBytes(32).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash secret key
    // NOTE: Based on previous analysis (T027), we decided to use a DETERMINISTIC HASH if we want to lookup by key.
    // However, the spec (data-model.md) says `findBySecretKey(secretKeyHash)`.
    // And `BlogSecretKeyGuard` needs to find the blog.
    // If we use scrypt with random salt, we CANNOT lookup by key.
    // To support lookup by ONLY key, we need a deterministic hash (e.g. SHA256 of key).
    // Or we store (DeterministicHash, Salt) where DeterministicHash is indexable.
    // Let's change this to use SHA-256 for the hash stored in DB for lookup.
    // The `secret_key_salt` field in DB might be redundant if we just use SHA-256, 
    // OR we use it for something else.
    // Given the requirement "validate x-blog-secret-key header against SHA-256 hash stored in Blog" (task T033 description),
    // I will use SHA-256(key). Salt is not strictly needed for this pattern unless we salt the input before SHA-256 with a GLOBAL salt.
    // Using random per-blog salt prevents lookup.
    // So I will IGNORE `secret_key_salt` for the lookup hash mechanism, or store a random string there just to fill the column.
    
    const sha256Hash = crypto.createHash('sha256').update(secretKey).digest('hex');

    const blog = await this.blogRepository.create({
      name: data.name,
      description: data.description,
      slug,
      tenant_id: tenantId,
      secret_key_hash: sha256Hash,
      secret_key_salt: salt, // Storing random salt, though not used for lookup
    });

    // Return the blog with the PLAIN secret key (only once)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { secret_key_hash: _h, secret_key_salt: _s, ...rest } = blog;
    return {
      ...rest,
      secret_key: secretKey,
    };
  }

  async findAll(tenantId: number) {
    const blogs = await this.blogRepository.findAllByTenantId(tenantId);
    // Strip sensitive data
    return blogs.map((b) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { secret_key_hash: _h, secret_key_salt: _s, ...rest } = b;
      return rest;
    });
  }

  async update(tenantId: number, blogId: number, data: UpdateBlogDTO) {
    const blog = await this.blogRepository.findById(blogId);

    if (!blog || !blog.active) {
      throw new BlogNotFoundError(`Blog with id ${blogId} not found`);
    }

    if (blog.tenant_id !== tenantId) {
      // Don't leak existence of other tenant's blog, or throw specific Forbidden?
      // Spec says "404 (blog not found)".
      throw new BlogNotFoundError(`Blog with id ${blogId} not found`);
    }

    // Update fields
    const updated = await this.blogRepository.update(blogId, {
      name: data.name,
      description: data.description,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { secret_key_hash: _h, secret_key_salt: _s, ...rest } = updated;
    return rest;
  }

  async delete(tenantId: number, blogId: number) {
    const blog = await this.blogRepository.findById(blogId);

    if (!blog || !blog.active) {
      throw new BlogNotFoundError(`Blog with id ${blogId} not found`);
    }

    if (blog.tenant_id !== tenantId) {
      throw new BlogNotFoundError(`Blog with id ${blogId} not found`);
    }

    await this.blogRepository.delete(blogId);
  }

  async regenerateSecretKey(tenantId: number, blogId: number) {
    const blog = await this.blogRepository.findById(blogId);

    if (!blog || !blog.active) {
      throw new BlogNotFoundError(`Blog with id ${blogId} not found`);
    }

    if (blog.tenant_id !== tenantId) {
       throw new BlogNotFoundError(`Blog with id ${blogId} not found`);
    }

    const secretKey = crypto.randomBytes(32).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const sha256Hash = crypto.createHash('sha256').update(secretKey).digest('hex');

    await this.blogRepository.update(blogId, {
      secret_key_hash: sha256Hash,
      secret_key_salt: salt,
    });

    return { secret_key: secretKey };
  }
}
