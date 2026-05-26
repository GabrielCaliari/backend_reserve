# Implementation Plan: CMS Blog Article Refactoring

## Overview

This implementation plan refactors the CMS blog and article management system to use the MediaAsset system for images, introduce proper SEO metadata, add author management, enhance audit trails, and migrate all entity IDs to UUID format. The implementation follows a careful migration strategy to preserve all existing data while modernizing the schema and business logic.

The plan is divided into two phases:
- **Phase 1 (Tasks 1-17)**: Core refactoring with Blog UUID migration
- **Phase 2 (Tasks 18-25)**: Complete UUID migration for all CMS entities

## Tasks

- [x] 1. Update Prisma schema with new models and fields
  - Change Blog.id from Int to String @db.VarChar(12) with @default(cuid())
  - Change Article.blog_id from Int to String @db.VarChar(12)
  - Add Author model with fields: id, first_name, last_name, biography, avatar_id, tenant_id, active, created_at, updated_at
  - Add new fields to Article: display_title, meta_title, meta_description, focus_keyword, cover_image_id, author_id, created_by, last_edited_by
  - Remove slug field from Blog model
  - Add foreign key relations: Article.cover_image_id → MediaAsset, Article.author_id → Author, Article.created_by → Admin, Article.last_edited_by → Admin
  - Add Author.avatar_id → MediaAsset relation
  - Rename ArticleImage table to article_images_deprecated in schema
  - Add unique constraint on (name, tenant_id) for Blog
  - Add unique constraint on (slug, blog_id) for Article
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 3.1, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 8.1_

- [x] 2. Create domain entities and value objects
  - [x] 2.1 Create Blog entity with UUID id
    - Implement Blog entity with id (string UUID), name, description, secretKeyHash, secretKeySalt, tenantId, active
    - Add validateName() method
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Create Article entity with new fields
    - Implement Article entity with displayTitle, metaTitle, metaDescription, focusKeyword, content, slug, status, coverImageId, authorId, blogId (string UUID), createdBy, lastEditedBy
    - Add canPublish() method to check required fields
    - Add publish() method with validation
    - Add validateMetadata() method for length constraints
    - _Requirements: 1.5, 2.1, 3.1, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2_
  
  - [x] 2.3 Create Author entity
    - Implement Author entity with firstName, lastName, biography, avatarId, tenantId, active
    - Add getFullName() method
    - Add validateNames() method
    - _Requirements: 5.1, 5.3_
  
  - [x] 2.4 Create SeoMetadata value object
    - Implement SeoMetadata VO with metaTitle, metaDescription, focusKeyword
    - Validate metaTitle max 60 characters
    - Validate metaDescription max 160 characters
    - _Requirements: 4.6, 4.7_
  
  - [x] 2.5 Create Slug value object
    - Implement Slug VO with URL-safe validation
    - Add static isValid() method
    - Add static fromString() method for slugification
    - _Requirements: 2.3_

- [x] 3. Create domain interfaces and errors
  - [x] 3.1 Create repository interfaces
    - Define IArticleRepository with CRUD methods and findBySlugAndBlogId, countByAuthorId
    - Define IAuthorRepository with CRUD methods and hasPublishedArticles
    - Define IBlogRepository with CRUD methods and findByNameAndTenantId
    - Use Symbol tokens for dependency injection
    - _Requirements: All_
  
  - [x] 3.2 Create domain errors
    - Create ArticleValidationError with missingFields property
    - Create AuthorNotFoundError
    - Create SlugImmutableError
    - Create TenantMismatchError
    - _Requirements: 2.4, 5.4, 9.7_

- [x] 4. Implement Prisma repositories
  - [x] 4.1 Implement PrismaArticleRepository
    - Implement all IArticleRepository methods
    - Map Prisma results to Article domain entities
    - Handle transactions for complex operations
    - _Requirements: All article-related_
  
  - [x] 4.2 Implement PrismaAuthorRepository
    - Implement all IAuthorRepository methods
    - Map Prisma results to Author domain entities
    - Implement hasPublishedArticles check
    - _Requirements: 5.1, 5.7_
  
  - [x] 4.3 Implement PrismaBlogRepository
    - Implement all IBlogRepository methods
    - Map Prisma results to Blog domain entities
    - Remove slug-related logic
    - _Requirements: 1.1, 1.2_


- [x] 5. Create application DTOs
  - [x] 5.1 Create Article DTOs
    - Create CreateArticleDTO with validation decorators
    - Create UpdateArticleDTO with partial fields
    - Create ArticleResponseDTO with all fields
    - Create PublishArticleDTO for status change
    - Add @ApiProperty decorators for Swagger
    - _Requirements: 2.3, 3.2, 4.6, 4.7, 5.5, 9.1-9.5_
  
  - [x] 5.2 Create Author DTOs
    - Create CreateAuthorDTO with validation decorators
    - Create UpdateAuthorDTO with partial fields
    - Create AuthorResponseDTO
    - Add @ApiProperty decorators for Swagger
    - _Requirements: 5.1_
  
  - [x] 5.3 Create Blog DTOs
    - Update CreateBlogDTO to remove slug field
    - Update UpdateBlogDTO
    - Update BlogResponseDTO
    - _Requirements: 1.1_

- [x] 6. Implement application services
  - [x] 6.1 Implement ArticleService
    - Implement createArticle with author validation and audit trail
    - Implement updateArticle with last_edited_by tracking
    - Implement publishArticle with complete field validation
    - Implement validateSlugUniqueness
    - Implement validateAuthorTenant matching
    - Implement validateImageReferences in markdown
    - Implement createMediaAssetRelations for cover and content images
    - Return ServiceResponse for all methods
    - _Requirements: 2.2, 2.3, 2.4, 3.2, 3.3, 5.4, 5.5, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1-9.7_
  
  - [x] 6.2 Implement AuthorService
    - Implement createAuthor with tenant validation
    - Implement updateAuthor
    - Implement deleteAuthor with published articles check
    - Implement assignAvatar with MediaAsset validation
    - Return ServiceResponse for all methods
    - _Requirements: 5.1, 5.7_
  
  - [x] 6.3 Implement BlogService
    - Update createBlog to remove slug generation
    - Update updateBlog
    - Implement validateNameUniqueness per tenant
    - Return ServiceResponse for all methods
    - _Requirements: 1.1, 1.2_

- [x] 7. Create infrastructure controllers
  - [x] 7.1 Create ArticleController
    - Add POST /articles endpoint with CreateArticleDTO
    - Add PUT /articles/:id endpoint with UpdateArticleDTO
    - Add POST /articles/:id/publish endpoint
    - Add GET /articles/:id endpoint
    - Add GET /articles endpoint with filters
    - Add DELETE /articles/:id endpoint
    - Use @ApiTags, @ApiOperation, @ApiResponse decorators
    - Use AdminJwtGuard for authentication
    - Return responses via res.status().json()
    - _Requirements: All article-related_
  
  - [x] 7.2 Create AuthorController
    - Add POST /authors endpoint with CreateAuthorDTO
    - Add PUT /authors/:id endpoint with UpdateAuthorDTO
    - Add GET /authors/:id endpoint
    - Add GET /authors endpoint with filters
    - Add DELETE /authors/:id endpoint
    - Add POST /authors/:id/avatar endpoint for avatar upload
    - Use @ApiTags, @ApiOperation, @ApiResponse decorators
    - Use AdminJwtGuard for authentication
    - _Requirements: 5.1, 5.7_
  
  - [x] 7.3 Update BlogController
    - Remove slug from create/update endpoints
    - Update response DTOs to exclude slug
    - Update Swagger documentation
    - _Requirements: 1.1_

- [x] 8. Create presenters for response formatting
  - [x] 8.1 Create ArticlePresenter
    - Implement present() method to format Article entity
    - Include author information (nested)
    - Include cover image information (nested)
    - Include creator and last editor information
    - Implement presentList() for collections
    - _Requirements: All article-related_
  
  - [x] 8.2 Create AuthorPresenter
    - Implement present() method to format Author entity
    - Include avatar information (nested)
    - Implement presentList() for collections
    - _Requirements: 5.1_

- [x] 9. Create database migrations
  - [x] 9.1 Create migration to add Author table
    - Create Author table with all fields
    - Add foreign key to Tenant
    - Add foreign key to MediaAsset for avatar
    - Add indexes on tenant_id and active
    - _Requirements: 5.1, 5.3_
  
  - [x] 9.2 Create migration to add Article fields
    - Add display_title column (String, required, default empty string temporarily)
    - Add meta_description column (String, nullable)
    - Add focus_keyword column (String, nullable)
    - Add cover_image_id column (Int, nullable)
    - Add author_id column (Int, nullable temporarily)
    - Add created_by column (Int, nullable temporarily)
    - Add last_edited_by column (Int, nullable)
    - Add foreign keys to MediaAsset, Author, Admin
    - Add indexes on new foreign keys
    - _Requirements: 3.1, 4.2, 4.3, 4.4, 5.2, 6.1, 6.2_
  
  - [x] 9.3 Create data migration to populate new fields
    - Copy Article.title to Article.meta_title (already exists)
    - Copy Article.title to Article.display_title
    - Create default "System Author" for each tenant
    - Set Article.author_id to default author
    - Set Article.created_by to first admin of tenant or default admin
    - _Requirements: 4.5, 5.2, 6.1_
  
  - [x] 9.4 Create migration to rename Article.title to meta_title
    - Rename title column to meta_title
    - Update column constraints (max 60 chars)
    - _Requirements: 4.1, 4.6_
  
  - [x] 9.5 Create migration to make Article fields required
    - Alter author_id to NOT NULL
    - Alter created_by to NOT NULL
    - _Requirements: 5.2, 6.1_
  
  - [x] 9.6 Create migration to change Blog.id to UUID
    - Generate UUIDs for all existing Blog records
    - Add temporary blog_id_uuid column to Article
    - Map Article.blog_id (Int) to new Blog UUID values
    - Drop old Article.blog_id and rename blog_id_uuid to blog_id
    - Change Blog.id from Int to String with UUID values
    - Update all foreign key constraints
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 9.7 Create migration to remove Blog.slug
    - Drop slug column from Blog table
    - Drop unique index on slug
    - _Requirements: 1.1, 1.2_
  
  - [x] 9.8 Create migration to rename ArticleImage table
    - Rename article_images to article_images_deprecated
    - Add deprecation comment
    - _Requirements: 8.1_
  
  - [x] 9.9 Create rollback migrations
    - Create down migrations for all schema changes
    - Test rollback functionality
    - _Requirements: 10.5, 10.7_

- [x] 10. Create ArticleImage to MediaAsset migration script
  - [x] 10.1 Create migration script
    - Query all ArticleImage records
    - For each ArticleImage, create MediaAsset in 'article-images' collection
    - Preserve url, storage_key, alt_text, file_size fields
    - Create MediaAssetRelation with relation_type 'content-image'
    - Set display_order from ArticleImage.display_order
    - Log any errors during migration
    - Validate all records migrated successfully
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 10.6, 10.7_

- [x] 11. Create MediaCollection setup
  - [x] 11.1 Create seed for article-images collection
    - Create MediaCollection with slug 'article-images'
    - Set type to 'image'
    - Set allowed_mime_types to image types
    - Set max_file_size appropriately
    - _Requirements: 11.1_
  
  - [x] 11.2 Create seed for author-avatars collection
    - Create MediaCollection with slug 'author-avatars'
    - Set type to 'image'
    - Set allowed_mime_types to image types
    - Set max_file_size appropriately
    - _Requirements: 11.2_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 13. Implement property-based tests
  - [ ]* 13.1 Write property test for blog name uniqueness
    - **Property 1: Blog Name Uniqueness Per Tenant**
    - **Validates: Requirements 1.2**
  
  - [ ]* 13.2 Write property test for article slug uniqueness
    - **Property 2: Article Slug Uniqueness Per Blog**
    - **Validates: Requirements 2.2**
  
  - [ ]* 13.3 Write property test for slug URL safety
    - **Property 3: Slug URL Safety**
    - **Validates: Requirements 2.3**
  
  - [ ]* 13.4 Write property test for published article slug immutability
    - **Property 4: Published Article Slug Immutability**
    - **Validates: Requirements 2.4**
  
  - [ ]* 13.5 Write property test for publishing validation
    - **Property 5: Publishing Requires Complete Fields**
    - **Validates: Requirements 3.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.7**
  
  - [ ]* 13.6 Write property test for image relation creation
    - **Property 6: Image Assignment Creates Relations**
    - **Validates: Requirements 3.3, 7.2**
  
  - [ ]* 13.7 Write property test for deletion prevention
    - **Property 7: Referenced Entity Deletion Prevention**
    - **Validates: Requirements 3.4, 5.7**
  
  - [ ]* 13.8 Write property test for SEO metadata length
    - **Property 8: SEO Metadata Length Constraints**
    - **Validates: Requirements 4.6, 4.7**
  
  - [ ]* 13.9 Write property test for author tenant matching
    - **Property 9: Author Tenant Matching**
    - **Validates: Requirements 5.4**
  
  - [ ]* 13.10 Write property test for author requirement
    - **Property 10: Article Creation Requires Author**
    - **Validates: Requirements 5.5**
  
  - [ ]* 13.11 Write property test for audit trail updates
    - **Property 11: Admin Audit Trail Updates**
    - **Validates: Requirements 6.3, 6.4**
  
  - [ ]* 13.12 Write property test for markdown image validation
    - **Property 12: Markdown Image Reference Validation**
    - **Validates: Requirements 7.4**
  
  - [ ]* 13.13 Write property test for markdown syntax support
    - **Property 13: Markdown Image Syntax Support**
    - **Validates: Requirements 7.5**
  
  - [ ]* 13.14 Write property test for image display order
    - **Property 14: Content Image Display Order**
    - **Validates: Requirements 7.3**
  
  - [ ]* 13.15 Write property test for migration preservation
    - **Property 15: ArticleImage Migration Preservation**
    - **Validates: Requirements 8.3**
  
  - [ ]* 13.16 Write property test for collection routing
    - **Property 16: Collection-Based Image Routing**
    - **Validates: Requirements 11.3, 11.4**
  
  - [ ]* 13.17 Write property test for collection type constraints
    - **Property 17: Collection Type Constraint Enforcement**
    - **Validates: Requirements 11.5**

- [ ] 14. Implement unit tests
  - [ ]* 14.1 Write unit tests for domain entities
    - Test Blog.validateName()
    - Test Article.canPublish() with various field combinations
    - Test Article.publish() success and failure cases
    - Test Article.validateMetadata() with boundary values
    - Test Author.getFullName() and validateNames()
    - _Requirements: 1.1, 2.1, 3.2, 4.6, 4.7, 5.1, 9.1-9.5_
  
  - [ ]* 14.2 Write unit tests for value objects
    - Test SeoMetadata validation with various lengths
    - Test Slug.isValid() with valid and invalid inputs
    - Test Slug.fromString() slugification
    - _Requirements: 2.3, 4.6, 4.7_
  
  - [ ]* 14.3 Write unit tests for services
    - Test ArticleService.createArticle with valid and invalid data
    - Test ArticleService.publishArticle validation
    - Test ArticleService.validateAuthorTenant
    - Test AuthorService.deleteAuthor with and without published articles
    - Test BlogService.validateNameUniqueness
    - _Requirements: All service-related_
  
  - [ ]* 14.4 Write integration tests for repositories
    - Test PrismaArticleRepository CRUD operations
    - Test PrismaAuthorRepository.hasPublishedArticles
    - Test PrismaBlogRepository.findByNameAndTenantId
    - Test foreign key constraints
    - Test unique constraints
    - _Requirements: All repository-related_
  
  - [ ]* 14.5 Write migration tests
    - Test Blog.slug removal preserves records
    - Test Article.title → meta_title + display_title copy
    - Test ArticleImage → MediaAsset migration
    - Test default author creation
    - Test rollback migrations
    - _Requirements: 1.3, 4.5, 8.2, 8.3, 8.4, 8.5, 10.1-10.7_

- [x] 15. Create frontend integration guide
  - [x] 15.1 Document API changes
    - Document removed Blog.slug field
    - Document new Article fields (display_title, meta_title, meta_description, focus_keyword)
    - Document Author entity structure
    - Document MediaAsset integration for images
    - Provide field mapping guide (title → meta_title, display_title)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 15.2 Provide API examples
    - Example: Create article with all new fields
    - Example: Publish article with validation
    - Example: Upload cover image and assign to article
    - Example: Create author with avatar
    - Example: Query articles with author and cover image included
    - _Requirements: 12.6_

- [x] 16. Update module configuration
  - [x] 16.1 Register new providers in ReserveCmsModule
    - Register ArticleRepository with PrismaArticleRepository
    - Register AuthorRepository with PrismaAuthorRepository
    - Register BlogRepository with PrismaBlogRepository
    - Register ArticleService, AuthorService, BlogService
    - Export services for other modules
    - _Requirements: All_
  
  - [x] 16.2 Verify route configuration to ensure consistency
    - Register ArticleController with /api/articles prefix
    - Register AuthorController with /api/authors prefix
    - Update BlogController routes
    - _Requirements: All_

- [x] 17. Final checkpoint - Phase 1 complete
  - Ensure all Phase 1 tests pass, ask the user if questions arise.

---

## Phase 2: Complete UUID Migration (Requirements 13-20)

- [x] 18. Update Prisma schema for UUID migration
  - [x] 18.1 Update Article model for UUID
    - Change Article.id from Int to String @db.VarChar(12) with @default(cuid())
    - Update ArticleImage.article_id to String @db.VarChar(12)
    - Update MediaAssetRelation entity_id handling for article references
    - _Requirements: 13.1, 13.2_
  
  - [x] 18.2 Update Author model for UUID
    - Change Author.id from Int to String @db.VarChar(12) with @default(cuid())
    - Update Article.author_id from Int to String @db.VarChar(12)
    - _Requirements: 14.1, 14.2_
  
  - [x] 18.3 Update MediaAsset model for UUID
    - Change MediaAsset.id from Int to String @db.VarChar(12) with @default(cuid())
    - Update Article.cover_image_id to String @db.VarChar(12)
    - Update Author.avatar_id to String @db.VarChar(12)
    - Update MediaAssetRelation.asset_id to String @db.VarChar(12)
    - Update LeadAttachment.asset_id to String @db.VarChar(12)
    - _Requirements: 15.1, 15.2_
  
  - [x] 18.4 Update MediaCollection model for UUID
    - Change MediaCollection.id from Int to String @db.VarChar(12) with @default(cuid())
    - Update MediaAsset.collection_id to String @db.VarChar(12)
    - _Requirements: 16.1, 16.2_
  
  - [x] 18.5 Update MediaAssetRelation model for UUID
    - Change MediaAssetRelation.id from Int to String @db.VarChar(12) with @default(cuid())
    - Update MediaAssetRelation.asset_id to String @db.VarChar(12)
    - Add entity_id_type field (String, enum: 'int' | 'uuid')
    - Keep entity_id as String for polymorphic support
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 19. Create UUID migration scripts
  - [x] 19.1 Create Article UUID migration
    - Generate UUIDs for all existing Article records
    - Add temporary article_id_uuid column
    - Map ArticleImage.article_id to new UUIDs
    - Map MediaAssetRelation.entity_id for article references
    - Drop old Article.id and rename article_id_uuid to id
    - Update all indexes and constraints
    - _Requirements: 13.3, 13.4_
  
  - [x] 19.2 Create Author UUID migration
    - Generate UUIDs for all existing Author records
    - Add temporary author_id_uuid column to Article
    - Map Article.author_id to new Author UUIDs
    - Drop old Author.id and rename author_id_uuid to id
    - Update all indexes and constraints
    - _Requirements: 14.3, 14.4_
  
  - [x] 19.3 Create MediaAsset UUID migration
    - Generate UUIDs for all existing MediaAsset records
    - Add temporary asset_id_uuid columns to all referencing tables
    - Map all foreign keys to new MediaAsset UUIDs
    - Drop old MediaAsset.id and rename asset_id_uuid to id
    - Update all indexes and constraints
    - _Requirements: 15.3, 15.4_
  
  - [x] 19.4 Create MediaCollection UUID migration
    - Generate UUIDs for all existing MediaCollection records
    - Add temporary collection_id_uuid column to MediaAsset
    - Map MediaAsset.collection_id to new UUIDs
    - Drop old MediaCollection.id and rename collection_id_uuid to id
    - Update all indexes and constraints
    - _Requirements: 16.3, 16.4_
  
  - [x] 19.5 Create MediaAssetRelation UUID migration
    - Generate UUIDs for all existing MediaAssetRelation records
    - Update asset_id references to new MediaAsset UUIDs
    - Set entity_id_type based on entity_type ('article'/'author' = 'uuid', others = 'int')
    - Update all indexes and constraints
    - _Requirements: 17.5_
  
  - [x] 19.6 Create rollback migrations for UUID changes
    - Create down migrations for all UUID schema changes
    - Test rollback functionality at each phase
    - Document rollback procedures
    - _Requirements: 10.7, 18.1-18.5_

- [x] 20. Update domain entities for UUID
  - [x] 20.1 Update Article entity
    - Change id type from number to string
    - Change authorId type from number to string
    - Change coverImageId type from number to string
    - Update constructor and validation logic
    - _Requirements: 13.5_
  
  - [x] 20.2 Update Author entity
    - Change id type from number to string
    - Change avatarId type from number to string
    - Update constructor and validation logic
    - _Requirements: 14.5_
  
  - [x] 20.3 Update MediaAsset entity (if exists in domain)
    - Change id type from number to string
    - Change collectionId type from number to string
    - Update constructor and validation logic
    - _Requirements: 15.5_
  
  - [x] 20.4 Update MediaCollection entity (if exists in domain)
    - Change id type from number to string
    - Update constructor and validation logic
    - _Requirements: 16.5_
  
  - [x] 20.5 Update MediaAssetRelation entity (if exists in domain)
    - Change id type from number to string
    - Change assetId type from number to string
    - Add entityIdType field
    - Update polymorphic entity_id handling
    - _Requirements: 17.6_

- [-] 21. Update repository interfaces and implementations
  - [x] 21.1 Update ArticleRepository
    - Change all ID parameters from number to string
    - Update return types to use string IDs
    - Add UUID format validation
    - Update PrismaArticleRepository implementation
    - _Requirements: 13.6_
  
  - [x] 21.2 Update AuthorRepository
    - Change all ID parameters from number to string
    - Update return types to use string IDs
    - Add UUID format validation
    - Update PrismaAuthorRepository implementation
    - _Requirements: 14.6_
  
  - [x] 21.3 Update MediaAssetRepository
    - Change all ID parameters from number to string
    - Update return types to use string IDs
    - Add UUID format validation
    - Update implementation
    - _Requirements: 15.6_
  
  - [x] 21.4 Update MediaCollectionRepository
    - Change all ID parameters from number to string
    - Update return types to use string IDs
    - Add UUID format validation
    - Update implementation
    - _Requirements: 16.6_
  
  - [x] 21.5 Update MediaAssetRelationRepository
    - Change all ID parameters from number to string
    - Update polymorphic entity_id handling
    - Add entity_id_type logic
    - Update implementation
    - _Requirements: 17.7_

- [ ] 22. Update application services for UUID
  - [x] 22.1 Update ArticleService
    - Change all ID parameters from number to string
    - Add UUID format validation in all methods
    - Update error messages to reference string IDs
    - Update ServiceResponse types
    - _Requirements: 13.7_
  
  - [x] 22.2 Update AuthorService
    - Change all ID parameters from number to string
    - Add UUID format validation in all methods
    - Update error messages to reference string IDs
    - Update ServiceResponse types
    - _Requirements: 14.7_
  
  - [x] 22.3 Update MediaAsset-related services
    - Change all ID parameters from number to string
    - Add UUID format validation
    - Update relation creation logic for polymorphic IDs
    - _Requirements: 15.7, 17.7_

- [ ] 23. Update controllers and DTOs for UUID
  - [x] 23.1 Update ArticleController
    - Change @Param('id') type from number to string
    - Update all endpoint signatures
    - Add UUID validation in route parameters
    - Update Swagger @ApiParam decorators
    - _Requirements: 13.8, 13.9_
  
  - [x] 23.2 Update AuthorController
    - Change @Param('id') type from number to string
    - Update all endpoint signatures
    - Add UUID validation in route parameters
    - Update Swagger @ApiParam decorators
    - _Requirements: 14.8_
  
  - [x] 23.3 Update Article DTOs
    - Update CreateArticleDTO (authorId, coverImageId to string)
    - Update UpdateArticleDTO
    - Update ArticleResponseDTO (id, authorId, coverImageId, blogId to string)
    - Update @ApiProperty decorators with UUID examples
    - _Requirements: 13.9_
  
  - [x] 23.4 Update Author DTOs
    - Update CreateAuthorDTO (avatarId to string)
    - Update UpdateAuthorDTO
    - Update AuthorResponseDTO (id, avatarId to string)
    - Update @ApiProperty decorators with UUID examples
    - _Requirements: 14.8_

- [ ] 24. Update presenters for UUID
  - [x] 24.1 Update ArticlePresenter
    - Ensure all ID fields are formatted as strings
    - Update nested object formatting (author, coverImage)
    - Verify UUID format in responses
    - _Requirements: 13.9_
  
  - [x] 24.2 Update AuthorPresenter
    - Ensure all ID fields are formatted as strings
    - Update nested object formatting (avatar)
    - Verify UUID format in responses
    - _Requirements: 14.8_

- [ ] 25. UUID migration validation and documentation
  - [x] 25.1 Create UUID validation utilities
    - Create isValidUUID() helper function
    - Create UUID format validation pipe
    - Add UUID validation to all ID inputs
    - _Requirements: 18.4, 18.5_
  
  - [x] 25.2 Add migration logging
    - Log all UUID generation operations
    - Log all ID format conversions
    - Add error tracking for migration issues
    - _Requirements: 18.3_
  
  - [x] 25.3 Create UUID migration documentation
    - Document all breaking API changes
    - Provide before/after examples for all endpoints
    - Document UUID format (12-character cuid)
    - Document validation rules
    - Create frontend migration guide
    - Update Swagger documentation
    - Document rollback procedures
    - Provide migration timeline
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_
  
  - [x] 25.4 Verify data integrity after UUID migration
    - Run data integrity checks on all migrated tables
    - Verify all foreign key relationships
    - Verify no orphaned records
    - Verify UUID uniqueness
    - _Requirements: 13.4, 14.4, 15.4, 16.4, 17.5_

- [x] 26. Checkpoint - Phase 2 complete
  - Ensure all Phase 2 tests pass, ask the user if questions arise.

- [ ]* 27. UUID migration property-based tests
  - [ ]* 27.1 Write property test for UUID format validation
    - Test that all generated UUIDs match cuid format
    - Test that invalid UUIDs are rejected
    - _Requirements: 18.4_
  
  - [ ]* 27.2 Write property test for UUID uniqueness
    - Test that all generated UUIDs are unique across entities
    - Test that UUID generation doesn't create collisions
    - _Requirements: 13.3, 14.3, 15.3, 16.3, 17.5_
  
  - [ ]* 27.3 Write property test for foreign key integrity
    - Test that all foreign key references are preserved after migration
    - Test that no orphaned records exist
    - _Requirements: 13.2, 14.2, 15.2, 16.2_
  
  - [ ]* 27.4 Write property test for polymorphic entity_id handling
    - Test that entity_id_type is correctly set based on entity_type
    - Test that both int and uuid entity_ids are handled correctly
    - _Requirements: 17.3, 17.4_

- [ ]* 28. UUID migration unit tests
  - [ ]* 28.1 Write unit tests for UUID validation utilities
    - Test isValidUUID() with valid and invalid inputs
    - Test UUID validation pipe
    - _Requirements: 18.4_
  
  - [ ]* 28.2 Write unit tests for migration scripts
    - Test UUID generation for each entity type
    - Test foreign key mapping logic
    - Test rollback functionality
    - _Requirements: 13.3, 14.3, 15.3, 16.3, 17.5_
  
  - [ ]* 28.3 Write integration tests for UUID repositories
    - Test CRUD operations with string IDs
    - Test foreign key constraints with UUIDs
    - Test query performance with UUID indexes
    - _Requirements: 13.6, 14.6, 15.6, 16.6, 17.7_
  
  - [ ]* 28.4 Write end-to-end tests for UUID APIs
    - Test all endpoints with UUID parameters
    - Test error handling for invalid UUIDs
    - Test response format with UUID IDs
    - _Requirements: 13.8, 13.9, 14.8, 19.7_

- [x] 29. Final checkpoint - All phases complete
  - Ensure all tests pass, verify data integrity, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Migration tasks must be executed in order to preserve data integrity
- The ArticleImage table is deprecated but not dropped to allow rollback
- Phase 1 can be deployed independently; Phase 2 requires Phase 1 completion
- UUID migration is a breaking change requiring frontend updates
- All UUID migrations include rollback procedures for safety
