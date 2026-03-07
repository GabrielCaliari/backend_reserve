import { Injectable, Inject } from '@nestjs/common';
import {
  AUTHOR_REPOSITORY,
  IAuthorRepository,
} from '../../domain/interfaces/author.repository.interface';
import {
  MEDIA_ASSET_REPOSITORY,
  IMediaAssetRepository,
} from '../../domain/interfaces/media-asset.repository.interface';
import { Author } from '../../domain/entities/author.entity';
import { CreateAuthorDTO } from '../dtos/create-author.dto';
import { UpdateAuthorDTO } from '../dtos/update-author.dto';
import {
  ServiceResponse,
  successResponse,
  errorResponse,
} from '../utils/service-response.util';
import { AuthorNotFoundError } from '../../domain/errors/author-not-found.error';
import { isValidUUID } from '../../domain/utils/uuid.util';

// Error constants
const ERROR_AUTHOR_NOT_FOUND = '404:Author not found';
const ERROR_AUTHOR_HAS_PUBLISHED_ARTICLES =
  '400:Cannot delete author with published articles';
const ERROR_AUTHOR_CREATE_FAILED = '500:Failed to create author';
const ERROR_AUTHOR_UPDATE_FAILED = '500:Failed to update author';
const ERROR_AUTHOR_DELETE_FAILED = '500:Failed to delete author';
const ERROR_AVATAR_NOT_FOUND = '404:Avatar MediaAsset not found';
const ERROR_AVATAR_TENANT_MISMATCH =
  '400:Avatar must belong to the same tenant as the author';
const ERROR_AVATAR_ASSIGN_FAILED = '500:Failed to assign avatar';
const ERROR_INVALID_TENANT = '400:Invalid tenant ID';
const ERROR_INVALID_UUID = '400:Invalid UUID format';

/**
 * AuthorService
 *
 * Application service for managing authors.
 * Handles author CRUD operations with business rule validation.
 * All author IDs are UUID strings (12-character cuid format).
 *
 * **Validates: Requirements 5.1, 5.7, 14.7**
 */
@Injectable()
export class AuthorService {
  constructor(
    @Inject(AUTHOR_REPOSITORY)
    private readonly authorRepository: IAuthorRepository,
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly mediaAssetRepository: IMediaAssetRepository,
  ) {}

  /**
   * Creates a new author with tenant validation
   *
   * @param dto - Author creation data
   * @returns ServiceResponse with created author or error
   *
   * **Validates: Requirement 5.1, 14.7**
   */
  async createAuthor(dto: CreateAuthorDTO): Promise<ServiceResponse<Author>> {
    try {
// Validate tenant_id is present
        if (!dto.tenantId) {
        return errorResponse(ERROR_INVALID_TENANT, 400);
      }

      // Validate avatar UUID format if provided
      if (dto.avatarId) {
        if (!isValidUUID(dto.avatarId)) {
          return errorResponse(`${ERROR_INVALID_UUID}: avatarId`, 400);
        }

        const avatarValidation = await this.validateAvatar(
          dto.avatarId,
          dto.tenantId,
        );
        if (!avatarValidation.valid) {
          return errorResponse(
            avatarValidation.error || ERROR_AVATAR_NOT_FOUND,
            avatarValidation.status || 404,
          );
        }
      }

      // Create author entity
      const author = new Author({
        firstName: dto.firstName,
        lastName: dto.lastName,
        biography: dto.biography || null,
        avatarId: dto.avatarId || null,
        tenantId: dto.tenantId,
        active: true,
      });

      // Validate names
      if (!author.validateNames()) {
        return errorResponse(
          '400:First name and last name cannot be empty',
          400,
        );
      }

      // Persist to database
      const created = await this.authorRepository.create(author);

      return successResponse(created, 201);
    } catch (error) {
      return errorResponse(ERROR_AUTHOR_CREATE_FAILED, 500, error);
    }
  }

  /**
   * Updates an existing author
   *
   * @param id - Author ID (UUID string)
   * @param dto - Author update data
   * @returns ServiceResponse with updated author or error
   *
   * **Validates: Requirement 5.1, 14.7**
   */
  async updateAuthor(
    id: string,
    dto: UpdateAuthorDTO,
  ): Promise<ServiceResponse<Author>> {
    try {
      // Validate author ID UUID format
      if (!isValidUUID(id)) {
        return errorResponse(`${ERROR_INVALID_UUID}: authorId`, 400);
      }

      // Check if author exists
      const existing = await this.authorRepository.findById(id);
      if (!existing) {
        return errorResponse(ERROR_AUTHOR_NOT_FOUND, 404);
      }

      // Validate avatar UUID format if being updated
      if (dto.avatarId !== undefined && dto.avatarId !== null) {
        if (!isValidUUID(dto.avatarId)) {
          return errorResponse(`${ERROR_INVALID_UUID}: avatarId`, 400);
        }

        const avatarValidation = await this.validateAvatar(
          dto.avatarId,
          existing.tenantId,
        );
        if (!avatarValidation.valid) {
          return errorResponse(
            avatarValidation.error || ERROR_AVATAR_NOT_FOUND,
            avatarValidation.status || 404,
          );
        }
      }

      // Build update data
      const updateData: Partial<Author> = {};
      if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
      if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
      if (dto.biography !== undefined) updateData.biography = dto.biography;
      if (dto.avatarId !== undefined) updateData.avatarId = dto.avatarId;
      if (dto.active !== undefined) updateData.active = dto.active;

      // Validate names if being updated
      if (dto.firstName !== undefined || dto.lastName !== undefined) {
        const firstName = dto.firstName ?? existing.firstName;
        const lastName = dto.lastName ?? existing.lastName;
        if (firstName.length === 0 || lastName.length === 0) {
          return errorResponse(
            '400:First name and last name cannot be empty',
            400,
          );
        }
      }

      // Persist update
      const updated = await this.authorRepository.update(id, updateData);

      return successResponse(updated, 200);
    } catch (error) {
      return errorResponse(ERROR_AUTHOR_UPDATE_FAILED, 500, error);
    }
  }

  /**
   * Deletes an author with published articles check
   *
   * Prevents deletion if the author has published articles to maintain
   * referential integrity and content attribution.
   *
   * @param id - Author ID (UUID string)
   * @returns ServiceResponse with success or error
   *
   * **Validates: Requirement 5.7, 14.7**
   */
  async deleteAuthor(id: string): Promise<ServiceResponse<void>> {
    try {
      // Validate author ID UUID format
      if (!isValidUUID(id)) {
        return errorResponse(`${ERROR_INVALID_UUID}: authorId`, 400);
      }

      // Check if author exists
      const existing = await this.authorRepository.findById(id);
      if (!existing) {
        return errorResponse(ERROR_AUTHOR_NOT_FOUND, 404);
      }

      // Check for published articles
      const hasPublished =
        await this.authorRepository.hasPublishedArticles(id);
      if (hasPublished) {
        return errorResponse(ERROR_AUTHOR_HAS_PUBLISHED_ARTICLES, 400);
      }

      // Delete author
      await this.authorRepository.delete(id);

      return successResponse(undefined, 204);
    } catch (error) {
      return errorResponse(ERROR_AUTHOR_DELETE_FAILED, 500, error);
    }
  }

  /**
   * Assigns an avatar to an author with MediaAsset validation
   *
   * Validates that the MediaAsset exists and belongs to the same tenant
   * as the author before assignment.
   *
   * @param authorId - Author ID (UUID string)
   * @param avatarId - MediaAsset ID (UUID string) for the avatar
   * @returns ServiceResponse with updated author or error
   *
   * **Validates: Requirement 5.3, 14.7**
   */
  async assignAvatar(
    authorId: string,
    avatarId: string,
  ): Promise<ServiceResponse<Author>> {
    try {
      // Validate author ID UUID format
      if (!isValidUUID(authorId)) {
        return errorResponse(`${ERROR_INVALID_UUID}: authorId`, 400);
      }

      // Validate avatar ID UUID format
      if (!isValidUUID(avatarId)) {
        return errorResponse(`${ERROR_INVALID_UUID}: avatarId`, 400);
      }

      // Check if author exists
      const author = await this.authorRepository.findById(authorId);
      if (!author) {
        return errorResponse(ERROR_AUTHOR_NOT_FOUND, 404);
      }

      // Validate avatar MediaAsset
      const avatarValidation = await this.validateAvatar(
        avatarId,
        author.tenantId,
      );
      if (!avatarValidation.valid) {
        return errorResponse(
          avatarValidation.error || ERROR_AVATAR_NOT_FOUND,
          avatarValidation.status || 404,
        );
      }

      // Update author with new avatar
      const updated = await this.authorRepository.update(authorId, {
        avatarId,
      });

      return successResponse(updated, 200);
    } catch (error) {
      return errorResponse(ERROR_AVATAR_ASSIGN_FAILED, 500, error);
    }
  }

  /**
   * Finds an author by ID
   *
   * @param id - Author ID (UUID string)
   * @returns ServiceResponse with author or error
   *
   * **Validates: Requirement 5.1, 14.7**
   */
  async findById(id: string): Promise<ServiceResponse<Author>> {
    try {
      // Validate author ID UUID format
      if (!isValidUUID(id)) {
        return errorResponse(`${ERROR_INVALID_UUID}: authorId`, 400);
      }

      const author = await this.authorRepository.findById(id);
      if (!author) {
        return errorResponse(ERROR_AUTHOR_NOT_FOUND, 404);
      }
      return successResponse(author, 200);
    } catch (error) {
      return errorResponse('500:Failed to retrieve author', 500, error);
    }
  }

  /**
   * Lists authors by tenant with optional filters
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters (active, page, limit)
   * @returns ServiceResponse with paginated authors or error
   *
   * **Validates: Requirement 5.1**
   */
  async findByTenantId(
    tenantId: string,
    filters?: { active?: boolean; page?: number; limit?: number },
  ): Promise<ServiceResponse<any>> {
    try {
      const result = await this.authorRepository.findByTenantId(
        tenantId,
        filters,
      );
      return successResponse(result, 200);
    } catch (error) {
      return errorResponse('500:Failed to retrieve authors', 500, error);
    }
  }

  /**
   * Validates that a MediaAsset exists and belongs to the specified tenant
   *
   * @param avatarId - MediaAsset ID (UUID string)
   * @param tenantId - Expected tenant ID
   * @returns Validation result with error details if invalid
   */
  private async validateAvatar(
    avatarId: string,
    tenantId: string,
  ): Promise<{ valid: boolean; error?: string; status?: number }> {
    try {
      // Validate avatar ID UUID format
      if (!isValidUUID(avatarId)) {
        return {
          valid: false,
          error: `${ERROR_INVALID_UUID}: avatarId`,
          status: 400,
        };
      }

      const avatar = await this.mediaAssetRepository.findById(
        avatarId,
        tenantId,
      );

      if (!avatar) {
        return {
          valid: false,
          error: ERROR_AVATAR_NOT_FOUND,
          status: 404,
        };
      }

      if (avatar.tenant_id !== tenantId) {
        return {
          valid: false,
          error: ERROR_AVATAR_TENANT_MISMATCH,
          status: 400,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: '500:Failed to validate avatar',
        status: 500,
      };
    }
  }
}
