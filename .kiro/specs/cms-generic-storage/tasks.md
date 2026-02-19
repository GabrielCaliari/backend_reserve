# Implementation Plan: CMS Generic Storage

## Overview

This implementation plan transforms the article-specific storage system into a reusable Media Asset Management system using a phased migration approach. The system enables any module (articles, brands, companies, users, leads, email campaigns) to manage media assets through a flexible, collection-based architecture with polymorphic relations.

The implementation follows Domain-Driven Design principles with pure domain layer, dependency inversion, and comprehensive testing strategy including both unit tests and property-based tests.

## Tasks

- [ ] 1. Phase 1: Create Domain Layer (Pure TypeScript)
  - [x] 1.1 Create domain enums
    - Create `domain/enums/collection-type.enum.ts` with ECollectionType (image, document, video, audio, mixed)
    - Create `domain/enums/asset-status.enum.ts` with EAssetStatus (processing, ready, failed, archived)
    - _Requirements: 1.3, 2.2_

  - [x] 1.2 Create domain errors (business-language exceptions)
    - Create `domain/errors/asset-not-found.error.ts`
    - Create `domain/errors/collection-not-found.error.ts`
    - Create `domain/errors/collection-limit-exceeded.error.ts`
    - Create `domain/errors/invalid-file-type.error.ts`
    - Create `domain/errors/file-size-exceeded.error.ts`
    - Create `domain/errors/relation-already-exists.error.ts`
    - _Requirements: 8.5, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 1.3 Create MediaAsset entity with business rules
    - Create `domain/entities/media-asset.entity.ts` with constructor validation
    - Implement methods: `markAsReady()`, `markAsFailed()`, `archive()`, `updateMetadata()`
    - Ensure NO NestJS decorators, NO Prisma types, NO HTTP imports
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 8.1, 8.2, 8.3, 8.4_

  - [x] 1.4 Create MediaCollection entity with validation rules
    - Create `domain/entities/media-collection.entity.ts` with constructor validation
    - Implement methods: `validateFileSize()`, `validateMimeType()`, `canAddMoreItems()`
    - Support wildcard patterns in mime type validation (e.g., 'image/*')
    - Ensure pure TypeScript with no framework dependencies
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.1, 8.2, 8.3, 8.4_

  - [ ] 1.5 Create MediaAssetRelation entity
    - Create `domain/entities/media-asset-relation.entity.ts`
    - Implement constructor with lowercase conversion for entity_type and relation_type
    - Implement method: `updateOrder()`
    - Ensure pure TypeScript with no framework dependencies
    - _Requirements: 3.1, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4_

  - [ ] 1.6 Create repository interfaces with Symbol tokens
    - Create `domain/interfaces/media-asset.repository.interface.ts` with MEDIA_ASSET_REPOSITORY token
    - Create `domain/interfaces/media-collection.repository.interface.ts` with MEDIA_COLLECTION_REPOSITORY token
    - Create `domain/interfaces/media-relation.repository.interface.ts` with MEDIA_RELATION_REPOSITORY token
    - Define all CRUD methods with proper TypeScript interfaces
    - _Requirements: 8.6, 9.1, 9.2, 9.3_

  - [ ]* 1.7 Write unit tests for domain entities
    - Test MediaAsset business rules (markAsReady, markAsFailed, archive, updateMetadata)
    - Test MediaCollection validation rules (validateFileSize, validateMimeType, canAddMoreItems)
    - Test MediaAssetRelation lowercase conversion and updateOrder
    - Test wildcard mime type matching (image/*, *)
    - _Requirements: 11.2_

- [ ] 2. Phase 1: Create Application Layer
  - [ ] 2.1 Create DTOs with validation decorators
    - Create `application/dtos/upload-media.dto.ts` with @ApiProperty and class-validator decorators
    - Create `application/dtos/create-collection.dto.ts`
    - Create `application/dtos/update-collection.dto.ts`
    - Create `application/dtos/attach-media.dto.ts`
    - Create `application/dtos/detach-media.dto.ts`
    - Create `application/dtos/reorder-media.dto.ts`
    - Create `application/dtos/find-assets-params.dto.ts`
    - Create `application/dtos/find-collections-params.dto.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15_

  - [ ] 2.2 Create presenters for response formatting
    - Create `application/presenters/media-asset.presenter.ts` with present() and presentList() methods
    - Create `application/presenters/media-collection.presenter.ts`
    - Create `application/presenters/media-relation.presenter.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15_

  - [ ] 2.3 Implement MediaAssetService
    - Create `application/services/media-asset.service.ts` with @Injectable decorator
    - Inject repositories via interface tokens using @Inject()
    - Inject existing StorageProvider and ImageProcessor (reuse from zarp-cms)
    - Implement uploadAsset() with collection validation, file validation, image processing, storage upload
    - Implement findAll(), findById(), updateAsset(), deleteAsset(), countByCollection()
    - Return ServiceResponse objects, convert domain errors to error constants
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 8.7, 9.8_

  - [ ]* 2.4 Write property test for MediaAssetService.uploadAsset()
    - **Property 1: Asset Creation Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
    - Use fast-check to generate random valid uploads
    - Verify all required fields populated (url, storage_key, filename, mime_type, file_size, status, collection_id, tenant_id, created_by)
    - Run 100 iterations minimum

  - [ ]* 2.5 Write property test for collection validation enforcement
    - **Property 6: Collection Validation Rules Enforcement**
    - **Validates: Requirements 2.3, 2.4, 2.5, 4.2, 4.3, 4.4**
    - Generate random collections with rules and random file uploads
    - Verify uploads rejected when violating rules, accepted when satisfying all rules
    - Run 100 iterations minimum

  - [ ] 2.6 Implement MediaCollectionService
    - Create `application/services/media-collection.service.ts` with @Injectable decorator
    - Inject MEDIA_COLLECTION_REPOSITORY via @Inject()
    - Implement createCollection(), findAll(), findById(), findBySlug(), updateCollection(), deleteCollection()
    - Implement getCollectionAssets() using MediaAssetRepository
    - Check for duplicate slug before creation
    - Return ServiceResponse objects
    - _Requirements: 2.1, 2.7, 2.8, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 8.7, 9.8_

  - [ ]* 2.7 Write unit tests for MediaCollectionService
    - Test createCollection with duplicate slug (should reject)
    - Test deleteCollection with assets (should reject)
    - Test findBySlug with valid and invalid slugs
    - Mock repository using jest.Mocked
    - _Requirements: 11.3_

  - [ ] 2.8 Implement MediaRelationService
    - Create `application/services/media-relation.service.ts` with @Injectable decorator
    - Inject MEDIA_RELATION_REPOSITORY and MEDIA_ASSET_REPOSITORY via @Inject()
    - Implement attachAsset() with uniqueness check, auto-increment display_order
    - Implement detachAsset(), getEntityAssets(), getEntityFeaturedImage(), reorderAssets()
    - Return ServiceResponse objects
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 7.12, 7.13, 7.14, 7.15, 8.7, 9.8, 16.1, 16.2, 16.4, 16.5, 16.8, 16.9_

  - [ ]* 2.9 Write property test for relation uniqueness
    - **Property 10: Relation Uniqueness Constraint**
    - **Validates: Requirements 3.2**
    - Generate random relations and attempt duplicates
    - Verify only one relation exists per (asset_id, entity_type, entity_id, relation_type)
    - Run 100 iterations minimum

  - [ ]* 2.10 Write property test for polymorphic extensibility
    - **Property 14: Polymorphic Extensibility**
    - **Validates: Requirements 3.9, 3.10**
    - Generate random entity_type and relation_type strings
    - Verify system accepts and stores them without code changes
    - Run 100 iterations minimum

- [ ] 3. Phase 1: Create Infrastructure Layer
  - [ ] 3.1 Implement PrismaMediaAssetRepository
    - Create `infrastructure/repositories/prisma-media-asset.repository.ts` implementing IMediaAssetRepository
    - Inject PrismaService from shared/database module
    - Implement all interface methods: create(), findById(), findAll(), update(), delete(), countByCollection()
    - Map Prisma results to domain entities using toDomain() method
    - Support optional tx parameter for transactions
    - Throw RepositoryException on database failures
    - _Requirements: 9.4, 9.9, 9.10_

  - [ ] 3.2 Implement PrismaMediaCollectionRepository
    - Create `infrastructure/repositories/prisma-media-collection.repository.ts` implementing IMediaCollectionRepository
    - Inject PrismaService
    - Implement all interface methods: create(), findById(), findBySlug(), findAll(), update(), delete()
    - Map Prisma results to domain entities using toDomain() method
    - Throw RepositoryException on database failures
    - _Requirements: 9.5, 9.9, 9.10_

  - [ ] 3.3 Implement PrismaMediaRelationRepository
    - Create `infrastructure/repositories/prisma-media-relation.repository.ts` implementing IMediaRelationRepository
    - Inject PrismaService
    - Implement all interface methods: create(), findByEntity(), findByAsset(), delete(), deleteByAsset(), updateOrder(), exists()
    - Map Prisma results to domain entities using toDomain() method
    - Throw RepositoryException on database failures
    - _Requirements: 9.6, 9.9, 9.10_

  - [ ]* 3.4 Write integration tests for repositories
    - Test PrismaMediaAssetRepository CRUD operations with test database
    - Test PrismaMediaCollectionRepository CRUD operations with test database
    - Test PrismaMediaRelationRepository CRUD operations with test database
    - Test cascade deletion behavior (asset deletion removes relations)
    - Test transaction support
    - _Requirements: 11.4_

  - [ ] 3.5 Create MediaAssetController
    - Create `infrastructure/controllers/media-asset.controller.ts` with @Controller('media') decorator
    - Add @ApiTags('CMS - Media Assets'), @ApiBearerAuth() decorators
    - Implement POST / (upload), GET / (list), GET /:id (details), PATCH /:id (update), DELETE /:id (delete)
    - Use @UseGuards(AdminJwtGuard) or @UseGuards(UserJwtGuard) appropriately
    - Extract tenant_id from JWT using @CurrentUser() decorator
    - Use presenters for response formatting
    - Return via res.status().json() pattern
    - Add @ApiOperation, @ApiResponse, @ApiConsumes decorators for Swagger
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 15.1_

  - [ ] 3.6 Create MediaCollectionController
    - Create `infrastructure/controllers/media-collection.controller.ts` with @Controller('collections') decorator
    - Add @ApiTags('CMS - Media Collections'), @ApiBearerAuth() decorators
    - Implement POST / (create), GET / (list), GET /:id (details), GET /:id/assets (collection assets), PUT /:id (update), DELETE /:id (delete)
    - Use @UseGuards(AdminJwtGuard) for create/update/delete, @UseGuards(UserJwtGuard) for read operations
    - Extract tenant_id from JWT using @CurrentUser() decorator
    - Use presenters for response formatting
    - Add complete Swagger documentation
    - _Requirements: 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 15.1_

  - [ ] 3.7 Create MediaRelationController
    - Create `infrastructure/controllers/media-relation.controller.ts` with @Controller('relations') decorator
    - Add @ApiTags('CMS - Media Relations'), @ApiBearerAuth() decorators
    - Implement POST /attach, POST /detach, GET /:entityType/:entityId, PUT /reorder
    - Use @UseGuards(AdminJwtGuard) or @UseGuards(UserJwtGuard) appropriately
    - Extract tenant_id from JWT using @CurrentUser() decorator
    - Use presenters for response formatting
    - Add complete Swagger documentation
    - _Requirements: 7.12, 7.13, 7.14, 7.15, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 15.1_

- [ ] 4. Phase 1: Wire Up Module and Test
  - [ ] 4.1 Create ZarpCmsModule with dependency injection
    - Create `zarp-cms.module.ts` with @Module decorator
    - Register repository implementations using provide/useClass pattern:
      - { provide: MEDIA_ASSET_REPOSITORY, useClass: PrismaMediaAssetRepository }
      - { provide: MEDIA_COLLECTION_REPOSITORY, useClass: PrismaMediaCollectionRepository }
      - { provide: MEDIA_RELATION_REPOSITORY, useClass: PrismaMediaRelationRepository }
    - Register services: MediaAssetService, MediaCollectionService, MediaRelationService
    - Register controllers: MediaAssetController, MediaCollectionController, MediaRelationController
    - Import DatabaseModule (provides PrismaService)
    - Reuse existing providers: S3StorageProvider, VercelBlobStorageProvider, SharpImageProcessor
    - Export MediaRelationService for use by other modules
    - Mark as @Global() to make services available everywhere
    - _Requirements: 9.7, 9.8, 16.10_

  - [ ] 4.2 Register ZarpCmsModule in app.module.ts
    - Import ZarpCmsModule in app.module.ts
    - Configure RouterModule with prefix '/api/cms'
    - Verify module loads without errors
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15_

  - [ ] 4.3 Create error constants file
    - Create `application/constants/error-constants.ts`
    - Define all error constants with format 'STATUS:MESSAGE'
    - ERROR_ASSET_NOT_FOUND, ERROR_COLLECTION_NOT_FOUND, ERROR_COLLECTION_SLUG_EXISTS, etc.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ]* 4.4 Write E2E test for upload and attach flow
    - Upload image → Verify WebP conversion → Attach to article → Verify relation
    - Use Supertest for HTTP requests
    - Verify storage file created and database records exist
    - _Requirements: 11.5_

  - [ ]* 4.5 Write E2E test for collection validation flow
    - Create collection with rules → Attempt invalid upload → Verify rejection
    - Test file size exceeded, invalid mime type, item limit exceeded
    - _Requirements: 11.5, 11.6_

  - [ ]* 4.6 Write E2E test for deletion cascade flow
    - Create asset with relations → Delete asset → Verify relations removed
    - Verify storage file deleted
    - _Requirements: 11.5, 11.7_

  - [ ]* 4.7 Write property test for tenant isolation
    - **Property 15: Tenant Isolation**
    - **Validates: Requirements 4.1, 15.1, 15.2, 15.7**
    - Generate random assets for different tenants
    - Verify users can only access their tenant's resources
    - Run 100 iterations minimum

- [ ] 5. Checkpoint - Ensure Phase 1 Complete
  - Ensure all tests pass (unit, property, integration, E2E)
  - Verify new endpoints work independently via Swagger UI at /api/docs
  - Verify old ArticleImage system still works (no breaking changes)
  - Ask the user if questions arise

- [ ] 6. Phase 2: Data Migration
  - [ ] 6.1 Create system collections seed script
    - Create `prisma/seed/seed-media-collections.ts`
    - Create collections: article-images, article-featured, brand-logos, company-documents, user-avatars, email-attachments
    - Use specifications from Requirements 5.1-5.6
    - Make script idempotent (skip existing collections)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.2 Write property test for seed idempotence
    - **Property 18: Seed Idempotence**
    - **Validates: Requirements 5.7**
    - Run seed script multiple times
    - Verify same collections exist with no duplicates or errors
    - Run 100 iterations minimum

  - [ ] 6.3 Create ArticleImage migration script
    - Create `prisma/seed/migrate-article-images.ts`
    - Ensure article-images and article-featured collections exist
    - For each ArticleImage record:
      - Create MediaAsset with preserved metadata (url, storage_key, alt_text, file_size)
      - Create MediaAssetRelation with entity_type='article', entity_id=article_id
      - Use relation_type='featured' for featured images, 'gallery' for others
      - Preserve display_order
    - Log migration progress and errors
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8_

  - [ ] 6.4 Create migration validation script
    - Create `prisma/seed/validate-article-image-migration.ts`
    - Count ArticleImage records
    - Count corresponding MediaAsset records
    - Count corresponding MediaAssetRelation records
    - Verify counts match
    - Verify all metadata preserved (url, storage_key, alt_text, display_order)
    - Report any discrepancies
    - _Requirements: 6.7_

  - [ ] 6.5 Run migration in staging environment
    - Execute seed-media-collections.ts
    - Execute migrate-article-images.ts
    - Execute validate-article-image-migration.ts
    - Review logs and validation results
    - Fix any issues before proceeding
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 7. Checkpoint - Ensure Phase 2 Complete
  - Verify all ArticleImage data migrated successfully
  - Verify validation script reports 100% success
  - Verify both old and new systems functional
  - Ask the user if questions arise

- [ ] 8. Phase 3: Update Article Module
  - [ ] 8.1 Update ArticleService to use MediaRelationService
    - Inject MediaRelationService into ArticleService
    - Add method: getArticleImages(articleId) calling mediaRelationService.getEntityAssets('article', articleId, 'gallery')
    - Add method: getArticleFeaturedImage(articleId) calling mediaRelationService.getEntityFeaturedImage('article', articleId, 'featured')
    - Add method: attachImageToArticle(articleId, assetId) calling mediaRelationService.attachAsset()
    - Add method: removeImageFromArticle(articleId, assetId) calling mediaRelationService.detachAsset()
    - Add method: reorderArticleImages(articleId, orderedIds) calling mediaRelationService.reorderAssets()
    - _Requirements: 10.4, 16.1, 16.2, 16.8_

  - [ ] 8.2 Mark ArticleImageController as deprecated
    - Add @deprecated JSDoc comment to ArticleImageController class
    - Add deprecation notice to Swagger documentation using @ApiDeprecated()
    - Keep all endpoints functional (backward compatibility)
    - _Requirements: 10.3_

  - [ ] 8.3 Update ArticleController to use new media endpoints
    - Update article creation/update endpoints to use MediaRelationService
    - Add endpoints for attaching/detaching images using new system
    - Document migration path in API documentation
    - _Requirements: 10.4_

  - [ ]* 8.4 Write integration tests for Article + Media integration
    - Test creating article and attaching images
    - Test retrieving article with images
    - Test reordering article images
    - Test removing images from article
    - _Requirements: 11.5_

  - [ ] 8.5 Create migration guide documentation
    - Document old vs new endpoint mappings
    - Provide code examples for frontend integration
    - Document breaking changes coming in Phase 4
    - _Requirements: 10.3, 10.4_

- [ ] 9. Checkpoint - Ensure Phase 3 Complete
  - Verify Article module works with new MediaRelationService
  - Verify old ArticleImage endpoints still functional
  - Verify integration tests pass
  - Ask the user if questions arise

- [ ] 10. Phase 4: Cleanup (Breaking Change)
  - [ ] 10.1 Create Prisma migration to drop ArticleImage table
    - Create migration: `npx prisma migrate dev --name drop_article_image_table`
    - Drop article_images table
    - Verify migration runs successfully in staging
    - _Requirements: 10.5_

  - [ ] 10.2 Remove ArticleImage-related code
    - Delete ArticleImageController
    - Delete ArticleImageService
    - Delete PrismaArticleImageRepository
    - Delete ArticleImage entity and interface
    - Remove ArticleImage imports from ArticleModule
    - _Requirements: 10.6_

  - [ ] 10.3 Update API documentation
    - Remove deprecated endpoints from Swagger
    - Update README with new endpoint documentation
    - Announce breaking changes to API consumers
    - _Requirements: 10.6_

  - [ ]* 10.4 Write E2E tests for complete system
    - Test full upload → attach → reorder → delete flow
    - Test multi-module integration (articles, brands, leads)
    - Test tenant isolation across all operations
    - _Requirements: 11.5_

- [ ] 11. Final Checkpoint - Ensure Phase 4 Complete
  - Verify old ArticleImage system completely removed
  - Verify all tests pass with new system only
  - Verify Swagger documentation updated
  - Verify no breaking changes for modules using new system
  - Ask the user if questions arise

- [ ] 12. Create In-Memory Repository Fakes for TDD
  - [ ] 12.1 Create InMemoryMediaAssetRepo
    - Create `shared/testing/in-memory-repos/in-memory-media-asset.repo.ts`
    - Implement IMediaAssetRepository interface
    - Use in-memory array for storage
    - Support all CRUD operations
    - _Requirements: 11.1_

  - [ ] 12.2 Create InMemoryMediaCollectionRepo
    - Create `shared/testing/in-memory-repos/in-memory-media-collection.repo.ts`
    - Implement IMediaCollectionRepository interface
    - Use in-memory array for storage
    - Support all CRUD operations
    - _Requirements: 11.1_

  - [ ] 12.3 Create InMemoryMediaRelationRepo
    - Create `shared/testing/in-memory-repos/in-memory-media-relation.repo.ts`
    - Implement IMediaRelationRepository interface
    - Use in-memory array for storage
    - Support all CRUD operations
    - _Requirements: 11.1_

- [ ] 13. Create Integration Example Documentation
  - [ ] 13.1 Document Brand Logo integration example
    - Create example code for BrandService using MediaRelationService
    - Show uploadBrandLogo() and getBrandLogo() methods
    - _Requirements: 16.3, 16.6_

  - [ ] 13.2 Document Lead Avatar integration example
    - Create example code for LeadService using MediaRelationService
    - Show attachAvatar() and getLeadAvatar() methods
    - _Requirements: 16.3, 16.6_

  - [ ] 13.3 Document Email Campaign Attachments integration example
    - Create example code for EmailCampaignService using MediaRelationService
    - Show attachDocument() and getCampaignAttachments() methods
    - _Requirements: 16.3, 16.6_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation follows a phased migration strategy to maintain backward compatibility
- Phase 1 creates the complete new system without breaking existing functionality
- Phase 2 migrates existing data to the new system
- Phase 3 updates the Article module to use the new system while keeping old endpoints functional
- Phase 4 removes the old system (breaking change)
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Integration tests validate repository operations with test database
- E2E tests validate critical user flows through HTTP endpoints
- The domain layer is pure TypeScript with no framework dependencies
- All repositories implement domain interfaces using dependency inversion principle
- The system supports polymorphic relations enabling any module to attach media without code changes
