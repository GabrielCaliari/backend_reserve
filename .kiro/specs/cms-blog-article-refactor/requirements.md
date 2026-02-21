# Requirements Document

## Introduction

This document specifies the requirements for refactoring the CMS blog and article management system. The refactoring aims to improve the content management structure by introducing proper SEO metadata, author management, cover images using the existing MediaAsset system, and enhanced audit trails. The changes will remove redundant slug fields from blogs, consolidate image management through MediaAsset, and introduce a dedicated Author entity for better content attribution.

## Glossary

- **Blog**: A content container that groups related articles under a tenant
- **Article**: A content piece with markdown body, SEO metadata, and display information
- **Author**: A content creator entity with biographical information and avatar
- **MediaAsset**: Generic storage entity for files (images, documents, etc.)
- **MediaCollection**: A grouping of MediaAssets with type constraints
- **MediaAssetRelation**: A polymorphic relationship linking MediaAssets to entities
- **Tenant**: A multi-tenant isolation boundary
- **Admin**: An administrative user who can create and edit content
- **Cover_Image**: The featured image displayed for an article
- **Content_Image**: An image embedded within the article markdown content
- **SEO_Metadata**: Search engine optimization fields (meta_title, meta_description, focus_keyword)
- **Display_Title**: The human-readable title shown to readers
- **Storage_Key**: The unique identifier for a file in the storage system

## Requirements

### Requirement 1: Blog ID Migration to UUID

**User Story:** As a system architect, I want to migrate Blog IDs from integer to UUID (12-character string), so that blogs have globally unique identifiers that are URL-safe and don't expose sequential numbering.

#### Acceptance Criteria

1. THE System SHALL change the Blog.id field from Int to String (12-character UUID)
2. THE System SHALL remove the slug field from the Blog model
3. THE System SHALL maintain the unique constraint on (name, tenant_id) for Blog
4. WHEN migrating existing data, THE System SHALL generate UUIDs for existing blogs and preserve all blog records without data loss
5. THE System SHALL update Article.blog_id foreign key to reference the new UUID type
6. THE System SHALL update any code references that previously used blog.slug or integer blog IDs

### Requirement 2: Article Slug Retention

**User Story:** As a content manager, I want each article to have its own unique slug, so that articles can be accessed via clean URLs.

#### Acceptance Criteria

1. THE System SHALL maintain the slug field on the Article model
2. THE System SHALL enforce uniqueness of slug within a blog (unique constraint on slug + blog_id)
3. WHEN creating an article, THE System SHALL validate that the slug is URL-safe
4. THE System SHALL prevent slug changes for published articles to maintain URL stability

### Requirement 3: Cover Image Integration

**User Story:** As a content creator, I want to assign a cover image to each article using the existing MediaAsset system, so that articles have consistent featured imagery.

#### Acceptance Criteria

1. THE System SHALL add a cover_image_id field to Article (foreign key to MediaAsset, nullable)
2. WHEN an article status is published, THE System SHALL require a cover_image_id to be set
3. THE System SHALL create a MediaAssetRelation with relation_type 'cover' when a cover image is assigned
4. WHEN a cover image is deleted, THE System SHALL prevent deletion if it is referenced by published articles
5. THE System SHALL allow draft articles to exist without a cover image

### Requirement 4: SEO Metadata Fields

**User Story:** As an SEO specialist, I want dedicated metadata fields for articles, so that I can optimize content for search engines.

#### Acceptance Criteria

1. THE System SHALL rename Article.title to meta_title
2. THE System SHALL add meta_description field (String, nullable) to Article
3. THE System SHALL add focus_keyword field (String, nullable) to Article
4. THE System SHALL add display_title field (String, required) to Article
5. WHEN migrating existing data, THE System SHALL copy Article.title to both meta_title and display_title
6. THE System SHALL validate that meta_title does not exceed 60 characters
7. THE System SHALL validate that meta_description does not exceed 160 characters

### Requirement 5: Author Entity Creation

**User Story:** As a content manager, I want to track article authors with biographical information, so that readers can learn about content creators.

#### Acceptance Criteria

1. THE System SHALL create an Author model with fields: id, first_name, last_name, biography, avatar_id, tenant_id, active, created_at, updated_at
2. THE System SHALL add author_id field to Article (foreign key to Author, required)
3. THE System SHALL link Author.avatar_id to MediaAsset (nullable foreign key)
4. THE System SHALL enforce that Author.tenant_id matches the Article's Blog.tenant_id
5. WHEN creating an article, THE System SHALL require a valid author_id
6. THE System SHALL allow multiple articles to share the same author
7. THE System SHALL prevent deletion of an Author if they have published articles

### Requirement 6: Audit Trail Enhancement

**User Story:** As a content administrator, I want to track who created and last edited each article, so that I can maintain accountability and content history.

#### Acceptance Criteria

1. THE System SHALL add created_by field to Article (foreign key to Admin, required)
2. THE System SHALL add last_edited_by field to Article (foreign key to Admin, nullable)
3. WHEN an article is created, THE System SHALL set created_by to the current admin user
4. WHEN an article is updated, THE System SHALL set last_edited_by to the current admin user
5. THE System SHALL maintain created_at and updated_at timestamps automatically
6. THE System SHALL allow querying articles by creator or last editor

### Requirement 7: Content Image Management

**User Story:** As a content creator, I want to embed images in article markdown that reference MediaAssets, so that all images are managed through a unified system.

#### Acceptance Criteria

1. WHEN an image is embedded in Article.content markdown, THE System SHALL reference MediaAsset via storage_key or url
2. THE System SHALL create MediaAssetRelation entries with relation_type 'content-image' for embedded images
3. THE System SHALL set display_order on MediaAssetRelation to indicate image position in content
4. THE System SHALL validate that all image references in markdown point to existing MediaAssets before publishing
5. THE System SHALL support markdown image syntax: `![alt text](storage_key)` or `![alt text](url)`

### Requirement 8: ArticleImage Deprecation

**User Story:** As a system architect, I want to deprecate the ArticleImage entity, so that all image management uses the MediaAsset system.

#### Acceptance Criteria

1. THE System SHALL mark the ArticleImage model as deprecated in code comments
2. THE System SHALL provide a migration path to convert ArticleImage records to MediaAsset + MediaAssetRelation
3. WHEN migrating ArticleImage data, THE System SHALL preserve url, storage_key, alt_text, display_order, and file_size
4. THE System SHALL create corresponding MediaAsset records in an appropriate MediaCollection
5. THE System SHALL create MediaAssetRelation records linking migrated assets to articles

### Requirement 9: Publication Validation

**User Story:** As a content manager, I want the system to validate required fields before publishing, so that incomplete articles cannot go live.

#### Acceptance Criteria

1. WHEN changing article status to published, THE System SHALL validate that display_title is set
2. WHEN changing article status to published, THE System SHALL validate that meta_title is set
3. WHEN changing article status to published, THE System SHALL validate that cover_image_id is set
4. WHEN changing article status to published, THE System SHALL validate that author_id is set
5. WHEN changing article status to published, THE System SHALL validate that content is not empty
6. THE System SHALL allow draft articles to exist with incomplete fields
7. THE System SHALL provide clear validation error messages indicating which required fields are missing

### Requirement 10: Data Migration Safety

**User Story:** As a database administrator, I want migrations to preserve existing data, so that no content is lost during the refactoring.

#### Acceptance Criteria

1. THE System SHALL create migrations that preserve all existing Blog records
2. THE System SHALL create migrations that preserve all existing Article records
3. WHEN migrating Blog.id from Int to UUID, THE System SHALL generate unique 12-character UUIDs for all existing blogs
4. WHEN migrating Blog.id, THE System SHALL update all Article.blog_id foreign key references to the new UUID values
5. WHEN removing Blog.slug, THE System SHALL not drop the column until all references are updated
6. WHEN renaming Article.title to meta_title, THE System SHALL copy data to display_title before renaming
7. THE System SHALL provide rollback migrations for all schema changes
8. THE System SHALL log any data transformation errors during migration
9. THE System SHALL validate data integrity after migration completes

### Requirement 11: MediaAsset Collection Organization

**User Story:** As a content administrator, I want article images organized in appropriate MediaCollections, so that assets are logically grouped.

#### Acceptance Criteria

1. THE System SHALL create or use a MediaCollection with slug 'article-images' for article-related images
2. THE System SHALL create or use a MediaCollection with slug 'author-avatars' for author profile images
3. WHEN uploading a cover image, THE System SHALL add it to the 'article-images' collection
4. WHEN uploading an author avatar, THE System SHALL add it to the 'author-avatars' collection
5. THE System SHALL enforce MediaCollection type constraints (e.g., only images in 'article-images')

### Requirement 12: Backward Compatibility

**User Story:** As a frontend developer, I want clear documentation of API changes, so that I can update client applications smoothly.

#### Acceptance Criteria

1. THE System SHALL document all breaking changes in API responses
2. THE System SHALL provide a migration guide for frontend applications
3. THE System SHALL document the new field mappings (title → meta_title, display_title)
4. THE System SHALL document the MediaAsset integration for images
5. THE System SHALL document the Author entity structure and relationships
6. THE System SHALL provide example API requests and responses for the new structure
