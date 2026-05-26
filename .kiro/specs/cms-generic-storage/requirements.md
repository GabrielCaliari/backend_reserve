# Requirements Document

## Introduction

The CMS Generic Storage system transforms the current article-specific storage implementation into a reusable Media Asset Management system. This system enables any module (articles, brands, companies, users, etc.) to manage media assets through a flexible, collection-based architecture with polymorphic relations.

## Glossary

- **MediaAsset**: A stored file (image, document, video, audio) with metadata, independent of any specific entity
- **MediaCollection**: A categorized container that organizes assets by context and enforces validation rules
- **MediaAssetRelation**: A polymorphic link connecting a MediaAsset to any entity type with a specific relation type
- **Tenant**: An isolated workspace identified by tenant_id for multi-tenancy support
- **Entity**: Any domain object (article, brand, company, user) that can have attached media assets
- **RelationType**: The semantic purpose of an asset-entity connection (featured, gallery, attachment, avatar, logo)
- **StorageProvider**: External service adapter for file storage (S3, Vercel Blob)
- **ImageProcessor**: Service for image transformation and optimization (Sharp)
- **System_Collection**: Pre-defined collections created during database seeding
- **Custom_Collection**: User-created collections for specific use cases

## Requirements

### Requirement 1: Media Asset Management

**User Story:** As a system administrator, I want to store and manage media files independently of specific entities, so that assets can be reused across different modules and contexts.

#### Acceptance Criteria

1. WHEN a file is uploaded, THE System SHALL create a MediaAsset record with file metadata (filename, mime_type, size, storage_key, storage_url)
2. WHEN an image is uploaded, THE System SHALL process it using ImageProcessor and store dimensions (width, height)
3. WHEN a MediaAsset is created, THE System SHALL assign it a status (processing, ready, failed, archived)
4. WHEN a MediaAsset is created, THE System SHALL associate it with a tenant_id for isolation
5. THE System SHALL store optional metadata as JSON for extensibility
6. WHEN a MediaAsset is deleted, THE System SHALL remove the file from StorageProvider and delete the database record
7. WHEN listing MediaAssets, THE System SHALL support filtering by collection_id, status, and mime_type
8. WHEN updating a MediaAsset, THE System SHALL allow modification of alt_text and metadata fields only

### Requirement 2: Collection-Based Organization

**User Story:** As a system administrator, I want to organize assets into collections with validation rules, so that files are properly categorized and validated according to their purpose.

#### Acceptance Criteria

1. WHEN a MediaCollection is created, THE System SHALL require a unique slug per tenant
2. WHEN a MediaCollection is created, THE System SHALL require a type (image, document, video, audio, mixed)
3. WHERE a MediaCollection defines max_file_size, THE System SHALL reject uploads exceeding this limit
4. WHERE a MediaCollection defines allowed_mime_types, THE System SHALL reject files with non-matching types
5. WHERE a MediaCollection defines max_items, THE System SHALL reject uploads when the limit is reached
6. THE System SHALL support wildcard patterns in allowed_mime_types (e.g., 'image/*')
7. WHEN listing MediaCollections, THE System SHALL support filtering by type
8. WHEN a MediaCollection is deleted, THE System SHALL prevent deletion if it contains assets

### Requirement 3: Polymorphic Asset Relations

**User Story:** As a developer, I want to attach media assets to any entity type with semantic relation types, so that the system is flexible and reusable across all modules (leads, blogs, brands, companies, users).

#### Acceptance Criteria

1. WHEN attaching an asset to an entity, THE System SHALL create a MediaAssetRelation with (asset_id, entity_type, entity_id, relation_type)
2. THE System SHALL enforce uniqueness on the combination (asset_id, entity_type, entity_id, relation_type)
3. WHEN creating a MediaAssetRelation, THE System SHALL convert entity_type and relation_type to lowercase
4. WHEN an asset is attached, THE System SHALL assign a display_order for sorting
5. WHEN detaching an asset, THE System SHALL delete the MediaAssetRelation record
6. WHEN a MediaAsset is deleted, THE System SHALL cascade delete all related MediaAssetRelations
7. WHEN listing entity assets, THE System SHALL support filtering by relation_type
8. WHEN reordering entity assets, THE System SHALL update display_order values atomically
9. THE System SHALL support any string value for entity_type without requiring code changes (e.g., 'article', 'lead', 'brand', 'company', 'user', 'email_campaign')
10. THE System SHALL support any string value for relation_type without requiring code changes (e.g., 'featured', 'gallery', 'avatar', 'logo', 'attachment', 'thumbnail')

### Requirement 4: Upload Validation and Processing

**User Story:** As a system user, I want uploaded files to be validated and processed automatically, so that only valid files are stored and images are optimized.

#### Acceptance Criteria

1. WHEN uploading a file, THE System SHALL validate that the target collection exists and belongs to the tenant
2. WHEN uploading a file, THE System SHALL validate file size against collection max_file_size
3. WHEN uploading a file, THE System SHALL validate mime_type against collection allowed_mime_types
4. WHEN uploading a file, THE System SHALL validate that collection max_items is not exceeded
5. WHEN uploading an image, THE System SHALL convert it to WebP format using ImageProcessor
6. WHEN uploading an image, THE System SHALL apply quality setting from CMS_IMAGE_QUALITY environment variable (default: 80)
7. IF validation fails, THEN THE System SHALL return a descriptive error without creating database records
8. WHEN image processing fails, THE System SHALL set asset status to 'failed' and store error details

### Requirement 5: System Collections Seeding

**User Story:** As a system administrator, I want pre-defined collections created automatically, so that common use cases are ready without manual configuration.

#### Acceptance Criteria

1. WHEN the database is seeded, THE System SHALL create the 'article-images' collection (type: image, max_size: 10MB, allowed_types: image/*, max_items: 20)
2. WHEN the database is seeded, THE System SHALL create the 'article-featured' collection (type: image, max_size: 5MB, allowed_types: image/jpeg|image/png|image/webp, max_items: 1)
3. WHEN the database is seeded, THE System SHALL create the 'brand-logos' collection (type: image, max_size: 2MB, allowed_types: image/svg+xml|image/png|image/webp, max_items: 1)
4. WHEN the database is seeded, THE System SHALL create the 'company-documents' collection (type: document, max_size: 50MB, allowed_types: application/pdf|application/msword, max_items: 100)
5. WHEN the database is seeded, THE System SHALL create the 'user-avatars' collection (type: image, max_size: 1MB, allowed_types: image/jpeg|image/png, max_items: 1)
6. WHEN the database is seeded, THE System SHALL create the 'email-attachments' collection (type: mixed, max_size: 25MB, allowed_types: *, max_items: 10)
7. THE System SHALL skip creating collections that already exist (idempotent seeding)

### Requirement 6: Data Migration from ArticleImage

**User Story:** As a system administrator, I want existing ArticleImage data migrated to the new system, so that no data is lost during the refactoring.

#### Acceptance Criteria

1. WHEN the migration script runs, THE System SHALL create MediaAsset records for all ArticleImage records
2. WHEN the migration script runs, THE System SHALL create MediaAssetRelation records linking assets to articles
3. WHEN migrating featured images, THE System SHALL use relation_type 'featured'
4. WHEN migrating gallery images, THE System SHALL use relation_type 'gallery'
5. WHEN migrating, THE System SHALL preserve display_order from ArticleImage
6. WHEN migrating, THE System SHALL preserve all metadata (alt_text, storage_key, storage_url, dimensions)
7. WHEN migration completes, THE System SHALL validate that all ArticleImage records have corresponding MediaAsset records
8. IF migration fails for any record, THEN THE System SHALL log the error and continue with remaining records

### Requirement 7: API Endpoint Implementation

**User Story:** As a frontend developer, I want RESTful API endpoints for media management, so that I can integrate the system into the application UI.

#### Acceptance Criteria

1. THE System SHALL provide POST /api/cms/media for uploading assets to a collection
2. THE System SHALL provide GET /api/cms/media for listing assets with filters (collection_id, status, mime_type, pagination)
3. THE System SHALL provide GET /api/cms/media/:id for retrieving asset details
4. THE System SHALL provide PATCH /api/cms/media/:id for updating asset metadata
5. THE System SHALL provide DELETE /api/cms/media/:id for deleting assets
6. THE System SHALL provide POST /api/cms/collections for creating custom collections
7. THE System SHALL provide GET /api/cms/collections for listing collections with type filter
8. THE System SHALL provide GET /api/cms/collections/:id for retrieving collection details
9. THE System SHALL provide GET /api/cms/collections/:id/assets for listing collection assets
10. THE System SHALL provide PUT /api/cms/collections/:id for updating collections
11. THE System SHALL provide DELETE /api/cms/collections/:id for deleting collections
12. THE System SHALL provide POST /api/cms/relations/attach for attaching assets to entities
13. THE System SHALL provide POST /api/cms/relations/detach for detaching assets from entities
14. THE System SHALL provide GET /api/cms/relations/:entityType/:entityId for listing entity assets with relation_type filter
15. THE System SHALL provide PUT /api/cms/relations/reorder for reordering entity assets

### Requirement 8: Domain Layer Purity

**User Story:** As a software architect, I want the domain layer to be pure TypeScript without framework dependencies, so that business logic is portable and testable.

#### Acceptance Criteria

1. THE Domain layer SHALL NOT import any NestJS decorators
2. THE Domain layer SHALL NOT import Prisma types
3. THE Domain layer SHALL NOT import HTTP-related classes (HttpException, Response, Request)
4. THE Domain entities SHALL encapsulate business rules as methods
5. THE Domain errors SHALL use business language without HTTP status codes
6. THE Domain interfaces SHALL define repository contracts using Symbol tokens
7. THE Application layer SHALL convert domain errors to ServiceResponse objects
8. THE Infrastructure layer SHALL translate ServiceResponse to HTTP status codes

### Requirement 9: Repository Pattern with Dependency Inversion

**User Story:** As a developer, I want repositories to implement domain interfaces, so that the system is testable and storage implementations are swappable.

#### Acceptance Criteria

1. THE Domain layer SHALL define IMediaAssetRepository interface with Symbol token MEDIA_ASSET_REPOSITORY
2. THE Domain layer SHALL define IMediaCollectionRepository interface with Symbol token MEDIA_COLLECTION_REPOSITORY
3. THE Domain layer SHALL define IMediaRelationRepository interface with Symbol token MEDIA_RELATION_REPOSITORY
4. THE Infrastructure layer SHALL implement PrismaMediaAssetRepository
5. THE Infrastructure layer SHALL implement PrismaMediaCollectionRepository
6. THE Infrastructure layer SHALL implement PrismaMediaRelationRepository
7. THE Module SHALL wire interfaces to implementations using provide/useClass pattern
8. THE Application services SHALL inject repositories via interface tokens using @Inject()
9. THE Repositories SHALL map Prisma results to domain entities using toDomain() methods
10. THE Repositories SHALL throw RepositoryException on database failures

### Requirement 10: Backward Compatibility During Migration

**User Story:** As a system administrator, I want the old ArticleImage system to remain functional during migration, so that the application continues working without interruption.

#### Acceptance Criteria

1. WHILE Phase 1 is in progress, THE System SHALL keep ArticleImage table and related code intact
2. WHILE Phase 2 is in progress, THE System SHALL support both old and new systems simultaneously
3. WHEN Phase 3 begins, THE ArticleImageController SHALL be marked with @deprecated decorator
4. WHEN Phase 3 begins, THE ArticleService SHALL use MediaRelationService for new operations
5. WHEN Phase 4 begins, THE System SHALL remove ArticleImage table via Prisma migration
6. WHEN Phase 4 begins, THE System SHALL remove all ArticleImage-related code
7. THE Migration SHALL be reversible until Phase 4 is complete

### Requirement 11: Testing Strategy

**User Story:** As a quality assurance engineer, I want comprehensive test coverage, so that the system is reliable and regressions are prevented.

#### Acceptance Criteria

1. THE System SHALL provide in-memory repository fakes for TDD (InMemoryMediaAssetRepo, InMemoryMediaCollectionRepo, InMemoryMediaRelationRepo)
2. THE System SHALL have unit tests for all domain entities validating business rules
3. THE System SHALL have unit tests for all application services using mocked repositories
4. THE System SHALL have integration tests for repositories using test database
5. THE System SHALL have E2E tests for critical flows (upload, attach, reorder, delete)
6. THE System SHALL have tests validating collection rules enforcement
7. THE System SHALL have tests validating polymorphic relation uniqueness
8. THE System SHALL have tests validating cascade deletion behavior

### Requirement 12: Swagger Documentation

**User Story:** As an API consumer, I want complete API documentation, so that I can understand and integrate with the endpoints.

#### Acceptance Criteria

1. WHEN accessing /api/docs, THE System SHALL display all CMS endpoints with @ApiTags('CMS - Media Assets')
2. THE System SHALL document all endpoints with @ApiOperation describing the operation
3. THE System SHALL document all request DTOs with @ApiProperty decorators
4. THE System SHALL document all response schemas with @ApiResponse decorators
5. THE System SHALL document authentication requirements with @ApiBearerAuth()
6. THE System SHALL document file upload endpoints with @ApiConsumes('multipart/form-data')
7. THE System SHALL document query parameters with @ApiQuery decorators
8. THE System SHALL provide example values for all documented fields

### Requirement 13: Error Handling and Validation

**User Story:** As a system user, I want clear error messages when operations fail, so that I can understand and fix issues.

#### Acceptance Criteria

1. WHEN an asset is not found, THE System SHALL return error code 'ASSET_NOT_FOUND' with status 404
2. WHEN a collection is not found, THE System SHALL return error code 'COLLECTION_NOT_FOUND' with status 404
3. WHEN collection item limit is exceeded, THE System SHALL return error code 'COLLECTION_LIMIT_EXCEEDED' with status 400
4. WHEN file type is invalid, THE System SHALL return error code 'INVALID_FILE_TYPE' with status 422
5. WHEN file size is exceeded, THE System SHALL return error code 'FILE_SIZE_EXCEEDED' with status 422
6. WHEN a relation already exists, THE System SHALL return error code 'RELATION_ALREADY_EXISTS' with status 409
7. WHEN validation fails, THE System SHALL return field-level errors using class-validator
8. WHEN storage provider fails, THE System SHALL return error code 'STORAGE_PROVIDER_ERROR' with status 500

### Requirement 14: Performance and Scalability

**User Story:** As a system administrator, I want the system to handle large volumes of assets efficiently, so that performance remains acceptable as data grows.

#### Acceptance Criteria

1. WHEN listing assets, THE System SHALL support pagination with configurable page size
2. WHEN listing assets, THE System SHALL use database indexes on frequently queried fields (tenant_id, collection_id, status)
3. WHEN uploading files, THE System SHALL process images asynchronously to avoid blocking requests
4. WHEN deleting assets, THE System SHALL use cascade deletion to avoid orphaned relations
5. WHEN querying entity assets, THE System SHALL use efficient joins to minimize database queries
6. THE System SHALL support batch operations for attaching multiple assets to an entity
7. THE System SHALL cache collection validation rules to avoid repeated database queries

### Requirement 15: Security and Access Control

**User Story:** As a security engineer, I want proper access control and tenant isolation, so that users can only access their own assets.

#### Acceptance Criteria

1. WHEN any CMS endpoint is accessed, THE System SHALL require authentication via AdminJwtGuard or UserJwtGuard
2. WHEN creating or accessing assets, THE System SHALL enforce tenant_id isolation
3. WHEN uploading files, THE System SHALL validate file content to prevent malicious uploads
4. WHEN storing files, THE System SHALL generate unique storage keys to prevent collisions
5. THE System SHALL sanitize filenames to prevent path traversal attacks
6. THE System SHALL validate that entity_id exists before creating relations
7. THE System SHALL prevent cross-tenant access to assets, collections, and relations

### Requirement 16: Easy Integration with External Modules

**User Story:** As a module developer, I want to integrate media management into my module with minimal code, so that I can quickly add file upload capabilities to any feature (leads, blogs, brands, companies).

#### Acceptance Criteria

1. WHEN integrating with a new module, THE Developer SHALL only need to call MediaRelationService.attachAsset() with entity_type and entity_id
2. WHEN integrating with a new module, THE Developer SHALL NOT need to modify CMS module code
3. WHEN integrating with a new module, THE Developer SHALL NOT need to create new database tables
4. THE System SHALL provide a MediaRelationService that is injectable into any module
5. THE System SHALL provide clear TypeScript interfaces for integration (AttachMediaDTO, DetachMediaDTO)
6. THE System SHALL provide example integration code in documentation for common scenarios (blog featured image, lead avatar, brand logo)
7. WHEN a module needs custom collections, THE Developer SHALL be able to create them via API without code changes
8. THE System SHALL support querying all assets for an entity with a single method call (MediaRelationService.getEntityAssets())
9. THE System SHALL provide helper methods for common patterns (getEntityFeaturedImage(), getEntityGallery())
10. THE ReserveCmsModule SHALL be importable as a global module, making services available everywhere without repeated imports
