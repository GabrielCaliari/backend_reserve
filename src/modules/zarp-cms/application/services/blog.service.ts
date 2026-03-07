import { Injectable, Inject } from '@nestjs/common';
import { BLOG_REPOSITORY, IBlogRepository } from '../../domain/interfaces/blog.repository.interface';
import { CreateBlogDTO } from '../dtos/create-blog.dto';
import { UpdateBlogDTO } from '../dtos/update-blog.dto';
import { ServiceResponse, successResponse, errorResponse } from '../utils/service-response.util';
import { Blog } from '../../domain/entities/blog.entity';
import * as crypto from 'crypto';

// Error constants
const ERROR_BLOG_NOT_FOUND = '404:Blog not found';
const ERROR_BLOG_NAME_DUPLICATE = '409:Blog name already exists for this tenant';
const ERROR_CREATE_BLOG = '500:Failed to create blog';
const ERROR_UPDATE_BLOG = '500:Failed to update blog';
const ERROR_DELETE_BLOG = '500:Failed to delete blog';
const ERROR_REGENERATE_KEY = '500:Failed to regenerate secret key';

/**
 * BlogService
 * 
 * Handles blog management operations including creation, updates, and secret key management.
 * Validates blog name uniqueness per tenant (Requirement 1.2).
 */
@Injectable()
export class BlogService {
  constructor(
    @Inject(BLOG_REPOSITORY)
    private readonly blogRepository: IBlogRepository,
  ) {}

  /**
   * Validates that a blog name is unique within a tenant
   * Requirement 1.2: Blog name uniqueness per tenant
   */
  async validateNameUniqueness(name: string, tenantId: string): Promise<boolean> {
    const existing = await this.blogRepository.findByNameAndTenantId(name, tenantId);
    return existing === null;
  }

  /**
   * Creates a new blog with a generated secret key
   * Validates name uniqueness per tenant before creation
   */
  async create(tenantId: string, data: CreateBlogDTO): Promise<ServiceResponse> {
    try {
      // Validate name uniqueness within tenant (Requirement 1.2)
      const isUnique = await this.validateNameUniqueness(data.name, tenantId);
      if (!isUnique) {
        return errorResponse(ERROR_BLOG_NAME_DUPLICATE, 409);
      }

      // Generate secret key
      const secretKey = crypto.randomBytes(32).toString('hex');
      const salt = crypto.randomBytes(16).toString('hex');

      // Use SHA-256 for deterministic hash to support lookup by key
      const sha256Hash = crypto.createHash('sha256').update(secretKey).digest('hex');

      const blog = new Blog({
        name: data.name,
        description: data.description,
        tenantId,
        secretKeyHash: sha256Hash,
        secretKeySalt: salt,
      });

      const created = await this.blogRepository.create(blog);

      // Return the blog with the PLAIN secret key (only once)
      return successResponse({
        id: created.id,
        name: created.name,
        description: created.description,
        tenantId: created.tenantId,
        active: created.active,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        secret_key: secretKey, // Only returned on creation
      }, 201);
    } catch (error) {
      return errorResponse(ERROR_CREATE_BLOG, 500, error);
    }
  }

  /**
   * Retrieves all blogs for a tenant
   * Strips sensitive data (secret key hash and salt)
   */
  async findAll(tenantId: string): Promise<ServiceResponse> {
    try {
      const blogs = await this.blogRepository.findByTenantId(tenantId);
      
      // Strip sensitive data
      const sanitized = blogs.map((blog) => ({
        id: blog.id,
        name: blog.name,
        description: blog.description,
        tenantId: blog.tenantId,
        active: blog.active,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
      }));

      return successResponse(sanitized, 200);
    } catch (error) {
      return errorResponse(ERROR_CREATE_BLOG, 500, error);
    }
  }

  /**
   * Updates a blog's information
   * Validates name uniqueness if name is being changed
   */
  async update(tenantId: string, blogId: string, data: UpdateBlogDTO): Promise<ServiceResponse> {
    try {
      const blog = await this.blogRepository.findById(blogId);

      if (!blog || !blog.active) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }

      if (blog.tenantId !== tenantId) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }

      // If name is being changed, validate uniqueness
      if (data.name && data.name !== blog.name) {
        const isUnique = await this.validateNameUniqueness(data.name, tenantId);
        if (!isUnique) {
          return errorResponse(ERROR_BLOG_NAME_DUPLICATE, 409);
        }
      }

      // Update fields
      const updated = await this.blogRepository.update(blogId, {
        name: data.name,
        description: data.description,
      });

      // Strip sensitive data
      return successResponse({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        tenantId: updated.tenantId,
        active: updated.active,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      }, 200);
    } catch (error) {
      return errorResponse(ERROR_UPDATE_BLOG, 500, error);
    }
  }

  /**
   * Soft deletes a blog
   */
  async delete(tenantId: string, blogId: string): Promise<ServiceResponse> {
    try {
      const blog = await this.blogRepository.findById(blogId);

      if (!blog || !blog.active) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }

      if (blog.tenantId !== tenantId) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }

      await this.blogRepository.delete(blogId);
      
      return successResponse({ message: 'Blog deleted successfully' }, 200);
    } catch (error) {
      return errorResponse(ERROR_DELETE_BLOG, 500, error);
    }
  }

  /**
   * Regenerates the secret key for a blog
   * Returns the new plain secret key (only time it's visible)
   */
  async regenerateSecretKey(tenantId: string, blogId: string): Promise<ServiceResponse> {
    try {
      const blog = await this.blogRepository.findById(blogId);

      if (!blog || !blog.active) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }

      if (blog.tenantId !== tenantId) {
        return errorResponse(ERROR_BLOG_NOT_FOUND, 404);
      }

      const secretKey = crypto.randomBytes(32).toString('hex');
      const salt = crypto.randomBytes(16).toString('hex');
      const sha256Hash = crypto.createHash('sha256').update(secretKey).digest('hex');

      await this.blogRepository.update(blogId, {
        secretKeyHash: sha256Hash,
        secretKeySalt: salt,
      });

      return successResponse({ secret_key: secretKey }, 200);
    } catch (error) {
      return errorResponse(ERROR_REGENERATE_KEY, 500, error);
    }
  }
}
