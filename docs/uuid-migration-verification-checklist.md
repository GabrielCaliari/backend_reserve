# UUID Migration Verification Checklist

This checklist ensures comprehensive verification of data integrity after completing the Phase 2 UUID migration for all CMS entities.

## Pre-Migration Preparation

- [ ] **Backup Database**: Create a full database backup before running verification
- [ ] **Record Counts**: Document current record counts for all entities
  - [ ] Blog count: _______
  - [ ] Article count: _______
  - [ ] Author count: _______
  - [ ] MediaAsset count: _______
  - [ ] MediaCollection count: _______
  - [ ] MediaAssetRelation count: _______
  - [ ] ArticleImage (deprecated) count: _______

## 1. UUID Format Validation

Verify all entity IDs are valid 12-character cuid format.

### Blog
- [ ] All Blog.id values are 12 characters long
- [ ] All Blog.id values match pattern `^[a-z0-9]{12}$`
- [ ] No Blog.id values are NULL

### Article
- [ ] All Article.id values are 12 characters long
- [ ] All Article.id values match pattern `^[a-z0-9]{12}$`
- [ ] No Article.id values are NULL
- [ ] All Article.blog_id values are 12 characters long
- [ ] All Article.author_id values (when not NULL) are 12 characters long
- [ ] All Article.cover_image_id values (when not NULL) are 12 characters long

### Author
- [ ] All Author.id values are 12 characters long
- [ ] All Author.id values match pattern `^[a-z0-9]{12}$`
- [ ] No Author.id values are NULL
- [ ] All Author.avatar_id values (when not NULL) are 12 characters long

### MediaAsset
- [ ] All MediaAsset.id values are 12 characters long
- [ ] All MediaAsset.id values match pattern `^[a-z0-9]{12}$`
- [ ] No MediaAsset.id values are NULL
- [ ] All MediaAsset.collection_id values are 12 characters long

### MediaCollection
- [ ] All MediaCollection.id values are 12 characters long
- [ ] All MediaCollection.id values match pattern `^[a-z0-9]{12}$`
- [ ] No MediaCollection.id values are NULL

### MediaAssetRelation
- [ ] All MediaAssetRelation.id values are 12 characters long
- [ ] All MediaAssetRelation.id values match pattern `^[a-z0-9]{12}$`
- [ ] No MediaAssetRelation.id values are NULL
- [ ] All MediaAssetRelation.asset_id values are 12 characters long

## 2. UUID Uniqueness Verification

Verify no duplicate UUIDs exist within each entity type.

- [ ] No duplicate Blog.id values
- [ ] No duplicate Article.id values
- [ ] No duplicate Author.id values
- [ ] No duplicate MediaAsset.id values
- [ ] No duplicate MediaCollection.id values
- [ ] No duplicate MediaAssetRelation.id values

## 3. Foreign Key Integrity

Verify all foreign key references point to existing records.

### Article Foreign Keys
- [ ] All Article.blog_id values reference existing Blog.id
- [ ] All Article.author_id values (when not NULL) reference existing Author.id
- [ ] All Article.cover_image_id values (when not NULL) reference existing MediaAsset.id
- [ ] All Article.created_by values (when not NULL) reference existing Admin.id
- [ ] All Article.last_edited_by values (when not NULL) reference existing Admin.id

### Author Foreign Keys
- [ ] All Author.avatar_id values (when not NULL) reference existing MediaAsset.id
- [ ] All Author.tenant_id values reference existing Tenant.id

### Blog Foreign Keys
- [ ] All Blog.tenant_id values reference existing Tenant.id

### MediaAsset Foreign Keys
- [ ] All MediaAsset.collection_id values reference existing MediaCollection.id
- [ ] All MediaAsset.tenant_id values reference existing Tenant.id
- [ ] All MediaAsset.created_by values reference existing Admin.id

### MediaCollection Foreign Keys
- [ ] All MediaCollection.tenant_id values reference existing Tenant.id

### MediaAssetRelation Foreign Keys
- [ ] All MediaAssetRelation.asset_id values reference existing MediaAsset.id

### ArticleImage (Deprecated) Foreign Keys
- [ ] All ArticleImage.article_id values reference existing Article.id

## 4. Polymorphic Relation Integrity

Verify MediaAssetRelation polymorphic references are valid.

- [ ] All MediaAssetRelation records with entity_type='article' and entity_id_type='uuid' reference existing Article.id
- [ ] All MediaAssetRelation records with entity_type='author' and entity_id_type='uuid' reference existing Author.id
- [ ] All MediaAssetRelation records with entity_id_type='uuid' have entity_id matching UUID format
- [ ] All MediaAssetRelation records with entity_id_type='int' have entity_id matching integer format

## 5. Data Consistency Checks

Verify no NULL values exist in NOT NULL fields.

### Blog
- [ ] No NULL Blog.id values
- [ ] No NULL Blog.name values
- [ ] No NULL Blog.tenant_id values
- [ ] No NULL Blog.secret_key_hash values
- [ ] No NULL Blog.secret_key_salt values

### Article
- [ ] No NULL Article.id values
- [ ] No NULL Article.display_title values
- [ ] No NULL Article.meta_title values
- [ ] No NULL Article.content values
- [ ] No NULL Article.slug values
- [ ] No NULL Article.blog_id values

### Author
- [ ] No NULL Author.id values
- [ ] No NULL Author.first_name values
- [ ] No NULL Author.last_name values
- [ ] No NULL Author.tenant_id values

### MediaAsset
- [ ] No NULL MediaAsset.id values
- [ ] No NULL MediaAsset.url values
- [ ] No NULL MediaAsset.storage_key values
- [ ] No NULL MediaAsset.filename values
- [ ] No NULL MediaAsset.collection_id values
- [ ] No NULL MediaAsset.tenant_id values

### MediaCollection
- [ ] No NULL MediaCollection.id values
- [ ] No NULL MediaCollection.name values
- [ ] No NULL MediaCollection.slug values
- [ ] No NULL MediaCollection.tenant_id values

### MediaAssetRelation
- [ ] No NULL MediaAssetRelation.id values
- [ ] No NULL MediaAssetRelation.asset_id values
- [ ] No NULL MediaAssetRelation.entity_type values
- [ ] No NULL MediaAssetRelation.entity_id values
- [ ] No NULL MediaAssetRelation.entity_id_type values

## 6. Relationship Integrity (Bidirectional)

Verify relationships are consistent in both directions.

- [ ] All Blogs with Articles have valid Article.blog_id references
- [ ] All Authors with Articles have valid Article.author_id references
- [ ] All MediaCollections with Assets have valid MediaAsset.collection_id references
- [ ] No orphaned Blogs (blogs without articles that are older than 1 day)
- [ ] No orphaned Authors (authors without articles that are older than 1 day)
- [ ] No orphaned MediaCollections (collections without assets that are older than 1 day)

## 7. Record Count Preservation

Verify no records were lost during migration.

- [ ] Blog count matches pre-migration count
- [ ] Article count matches pre-migration count
- [ ] Author count matches pre-migration count
- [ ] MediaAsset count matches pre-migration count
- [ ] MediaCollection count matches pre-migration count
- [ ] MediaAssetRelation count matches or exceeds pre-migration count (may increase if new relations created)
- [ ] ArticleImage (deprecated) count matches pre-migration count

## 8. Unique Constraint Verification

Verify unique constraints are enforced.

- [ ] Blog (name, tenant_id) combinations are unique
- [ ] Article (slug, blog_id) combinations are unique
- [ ] MediaCollection (tenant_id, slug) combinations are unique
- [ ] MediaAssetRelation (asset_id, entity_type, entity_id, relation_type) combinations are unique

## 9. Index Verification

Verify all indexes are created and functional.

- [ ] Blog indexes: tenant_id
- [ ] Article indexes: blog_id, author_id, created_by, last_edited_by, (blog_id, status, display_order)
- [ ] Author indexes: tenant_id, active
- [ ] MediaAsset indexes: collection_id, tenant_id, created_by, status
- [ ] MediaAssetRelation indexes: (entity_type, entity_id), asset_id

## 10. Application-Level Verification

Verify the application works correctly with UUID IDs.

- [ ] Can create new Blog with UUID id
- [ ] Can create new Article with UUID id and UUID foreign keys
- [ ] Can create new Author with UUID id
- [ ] Can create new MediaAsset with UUID id
- [ ] Can create new MediaCollection with UUID id
- [ ] Can create new MediaAssetRelation with UUID id and polymorphic references
- [ ] Can query Blog by UUID id
- [ ] Can query Article by UUID id
- [ ] Can query Author by UUID id
- [ ] Can query MediaAsset by UUID id
- [ ] Can update Article with UUID foreign keys
- [ ] Can delete entities with UUID cascade behavior working correctly

## 11. API Endpoint Verification

Verify all API endpoints work with UUID parameters.

- [ ] GET /api/blogs/:id (with UUID)
- [ ] GET /api/articles/:id (with UUID)
- [ ] GET /api/authors/:id (with UUID)
- [ ] POST /api/articles (with UUID foreign keys in body)
- [ ] PUT /api/articles/:id (with UUID)
- [ ] DELETE /api/articles/:id (with UUID)
- [ ] All endpoints return UUID values in responses
- [ ] All endpoints validate UUID format in parameters
- [ ] All endpoints return appropriate errors for invalid UUIDs

## 12. Performance Verification

Verify query performance is acceptable with UUID indexes.

- [ ] Blog queries by id are fast (< 50ms)
- [ ] Article queries by id are fast (< 50ms)
- [ ] Article queries by blog_id are fast (< 100ms)
- [ ] Author queries by id are fast (< 50ms)
- [ ] MediaAsset queries by collection_id are fast (< 100ms)
- [ ] MediaAssetRelation queries by entity_type and entity_id are fast (< 100ms)

## Verification Scripts

### Run SQL Verification
```bash
psql -U your_user -d your_database -f prisma/migrations/verify-uuid-migration.sql
```

### Run TypeScript Verification
```bash
pnpm exec ts-node prisma/scripts/verify-uuid-migration.ts
```

## Sign-Off

- [ ] All checks passed
- [ ] No data integrity issues found
- [ ] Application tested and working correctly
- [ ] API endpoints tested and working correctly
- [ ] Performance is acceptable
- [ ] Documentation updated

**Verified by:** ___________________  
**Date:** ___________________  
**Notes:** ___________________

## Rollback Plan

If verification fails:

1. **Stop all application instances**
2. **Restore database from backup**
3. **Review migration logs for errors**
4. **Fix migration scripts**
5. **Re-run migration with fixes**
6. **Re-run verification**

## Post-Verification Tasks

After successful verification:

- [ ] Update frontend applications to use UUID IDs
- [ ] Update API documentation with UUID examples
- [ ] Notify team of successful migration
- [ ] Archive migration scripts and logs
- [ ] Schedule deprecated table cleanup (ArticleImage)
