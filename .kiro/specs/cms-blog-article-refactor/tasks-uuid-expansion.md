# Implementation Plan: CMS UUID Migration Expansion

## Overview

Este plano estende o CMS Blog Article Refactoring para incluir migração de identificadores inteiros para UUID em todas as entidades principais do CMS. A migração será feita em fases para minimizar riscos e permitir rollback seguro.

## Ordem de Migração

A migração seguirá esta ordem para respeitar dependências de foreign keys:

1. **MediaCollection** (sem dependências de outras entidades CMS)
2. **MediaAsset** (depende de MediaCollection)
3. **Author** (depende de MediaAsset para avatar)
4. **Blog** (já planejado)
5. **Article** (depende de Blog, Author, MediaAsset)
6. **MediaAssetRelation** (depende de MediaAsset, referencia Article)

## Tasks

### Phase 1: Schema Preparation and UUID Generation

- [ ] 18. Prepare UUID migration infrastructure
  - [ ] 18.1 Create UUID utility functions
    - Create generateCuid() function for consistent UUID generation
    - Create isValidCuid() function for validation
    - Create isCuid() type guard function
    - Add UUID format constants
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [ ] 18.2 Create migration helper functions
    - Create addUuidColumn() helper for adding temporary UUID columns
    - Create mapForeignKeys() helper for mapping Int IDs to UUIDs
    - Create swapColumns() helper for column replacement
    - Create validateDataIntegrity() helper
    - _Requirements: 10.1, 10.2, 10.8, 10.9_

### Phase 2: MediaCollection UUID Migration

- [ ] 19. Migrate MediaCollection to UUID
  - [ ] 19.1 Create migration to add UUID column to MediaCollection
    - Add media_collection_id_uuid column (String, nullable)
    - Generate UUIDs for all existing MediaCollection records
    - Populate media_collection_id_uuid with generated UUIDs
    - Add unique constraint on media_collection_id_uuid
    - _Requirements: 16.1, 16.3, 16.4_
  
  - [ ] 19.2 Create migration to update MediaAsset.collection_id
    - Add collection_id_uuid column to MediaAsset (String, nullable)
    - Map MediaAsset.collection_id (Int) to MediaCollection UUIDs
    - Validate all mappings are successful
    - _Requirements: 16.2, 16.4_
  
  - [ ] 19.3 Create migration to swap MediaCollection ID columns
    - Drop old MediaAsset.collection_id foreign key
    - Drop old MediaCollection.id column
    - Rename media_collection_id_uuid to id
    - Rename MediaAsset.collection_id_uuid to collection_id
    - Recreate foreign key constraints
    - Recreate indexes
    - _Requirements: 16.1, 16.2_
  
  - [ ] 19.4 Update MediaCollection domain entity
    - Change id type from number to string
    - Update constructor and methods
    - Update validation logic
    - _Requirements: 16.5_
  
  - [ ] 19.5 Update MediaCollection repository
    - Update interface to use string IDs
    - Update PrismaMediaCollectionRepository implementation
    - Update all query methods
    - Update create/update methods
    - _Requirements: 16.6_
  
  - [ ] 19.6 Update MediaCollection service and DTOs
    - Update service methods to handle string IDs
    - Update CreateMediaCollectionDTO
    - Update UpdateMediaCollectionDTO
    - Update MediaCollectionResponseDTO
    - _Requirements: 16.7_
  
  - [ ] 19.7 Update MediaCollection controller
    - Update route parameters to accept string IDs
    - Update Swagger documentation
    - Add UUID validation
    - _Requirements: 16.7_

### Phase 3: MediaAsset UUID Migration

- [ ] 20. Migrate MediaAsset to UUID
  - [ ] 20.1 Create migration to add UUID column to MediaAsset
    - Add media_asset_id_uuid column (String, nullable)
    - Generate UUIDs for all existing MediaAsset records
    - Populate media_asset_id_uuid with generated UUIDs
    - Add unique constraint on media_asset_id_uuid
    - _Requirements: 15.1, 15.3, 15.4_
  
  - [ ] 20.2 Create migration to update foreign keys to MediaAsset
    - Add cover_image_id_uuid to Article (String, nullable)
    - Add avatar_id_uuid to Author (String, nullable)
    - Add asset_id_uuid to MediaAssetRelation (String, nullable)
    - Add asset_id_uuid to LeadAttachment (String, nullable)
    - Map all Int IDs to MediaAsset UUIDs
    - Validate all mappings
    - _Requirements: 15.2, 15.4_
  
  - [ ] 20.3 Create migration to swap MediaAsset ID columns
    - Drop old foreign key constraints
    - Drop old MediaAsset.id column
    - Rename media_asset_id_uuid to id
    - Rename all foreign key UUID columns
    - Recreate foreign key constraints
    - Recreate indexes
    - _Requirements: 15.1, 15.2_
  
  - [ ] 20.4 Update MediaAsset domain entity
    - Change id type from number to string
    - Update constructor and methods
    - Keep storage_key as separate field
    - _Requirements: 15.5, 15.8_
  
  - [ ] 20.5 Update MediaAsset repository
    - Update interface to use string IDs
    - Update PrismaMediaAssetRepository implementation
    - Update all query methods
    - Update findById to accept string
    - _Requirements: 15.6_
  
  - [ ] 20.6 Update MediaAsset service and DTOs
    - Update service methods to handle string IDs
    - Update UploadMediaDTO
    - Update UpdateAssetDTO
    - Update asset response DTOs
    - _Requirements: 15.7_
  
  - [ ] 20.7 Update MediaAsset-related services
    - Update ArticleService to use string cover_image_id
    - Update AuthorService to use string avatar_id
    - Update all services that interact with MediaAsset
    - _Requirements: 15.7_

### Phase 4: Author UUID Migration

- [ ] 21. Migrate Author to UUID
  - [ ] 21.1 Create migration to add UUID column to Author
    - Add author_id_uuid column (String, nullable)
    - Generate UUIDs for all existing Author records
    - Populate author_id_uuid with generated UUIDs
    - Add unique constraint on author_id_uuid
    - _Requirements: 14.1, 14.3, 14.4_
  
  - [ ] 21.2 Create migration to update Article.author_id
    - Add author_id_uuid to Article (String, nullable)
    - Map Article.author_id (Int) to Author UUIDs
    - Validate all mappings
    - _Requirements: 14.2, 14.4_
  
  - [ ] 21.3 Create migration to swap Author ID columns
    - Drop old Article.author_id foreign key
    - Drop old Author.id column
    - Rename author_id_uuid to id
    - Rename Article.author_id_uuid to author_id
    - Recreate foreign key constraints
    - Recreate indexes
    - _Requirements: 14.1, 14.2_
  
  - [ ] 21.4 Update Author domain entity
    - Change id type from number to string
    - Update constructor and methods
    - Update validation logic
    - _Requirements: 14.5_
  
  - [ ] 21.5 Update Author repository
    - Update interface to use string IDs
    - Update PrismaAuthorRepository implementation
    - Update all query methods
    - Update hasPublishedArticles to use string ID
    - _Requirements: 14.6_
  
  - [ ] 21.6 Update Author service and DTOs
    - Update service methods to handle string IDs
    - Update CreateAuthorDTO
    - Update UpdateAuthorDTO
    - Update AuthorResponseDTO
    - _Requirements: 14.7_
  
  - [ ] 21.7 Update Author controller
    - Update route parameters to accept string IDs
    - Update Swagger documentation
    - Add UUID validation
    - _Requirements: 14.8_

### Phase 5: Article UUID Migration

- [ ] 22. Migrate Article to UUID
  - [ ] 22.1 Create migration to add UUID column to Article
    - Add article_id_uuid column (String, nullable)
    - Generate UUIDs for all existing Article records
    - Populate article_id_uuid with generated UUIDs
    - Add unique constraint on article_id_uuid
    - _Requirements: 13.1, 13.3, 13.4_
  
  - [ ] 22.2 Create migration to update foreign keys to Article
    - Add article_id_uuid to ArticleImage (String, nullable)
    - Update MediaAssetRelation.entity_id for article relations
    - Map all Int IDs to Article UUIDs
    - Validate all mappings
    - _Requirements: 13.2, 13.4_
  
  - [ ] 22.3 Create migration to swap Article ID columns
    - Drop old foreign key constraints
    - Drop old Article.id column
    - Rename article_id_uuid to id
    - Rename ArticleImage.article_id_uuid to article_id
    - Update MediaAssetRelation records
    - Recreate foreign key constraints
    - Recreate indexes
    - _Requirements: 13.1, 13.2_
  
  - [ ] 22.4 Update Article domain entity
    - Change id type from number to string
    - Update constructor and methods
    - Update validation logic
    - _Requirements: 13.5_
  
  - [ ] 22.5 Update Article repository
    - Update interface to use string IDs
    - Update PrismaArticleRepository implementation
    - Update all query methods
    - Update findById to accept string
    - _Requirements: 13.6_
  
  - [ ] 22.6 Update Article service and DTOs
    - Update service methods to handle string IDs
    - Update CreateArticleDTO
    - Update UpdateArticleDTO
    - Update ArticleResponseDTO
    - Update PublishArticleDTO
    - _Requirements: 13.7_
  
  - [ ] 22.7 Update Article controller
    - Update route parameters to accept string IDs
    - Update Swagger documentation
    - Add UUID validation
    - _Requirements: 13.8, 13.9_
  
  - [ ] 22.8 Update Article presenter
    - Update present() to format string IDs
    - Update presentList() to handle string IDs
    - Update presentPaginated()
    - _Requirements: 13.9_

### Phase 6: MediaAssetRelation UUID Migration

- [ ] 23. Migrate MediaAssetRelation to UUID
  - [ ] 23.1 Create migration to add UUID column to MediaAssetRelation
    - Add media_asset_relation_id_uuid column (String, nullable)
    - Generate UUIDs for all existing MediaAssetRelation records
    - Populate media_asset_relation_id_uuid with generated UUIDs
    - Add unique constraint on media_asset_relation_id_uuid
    - _Requirements: 17.1, 17.5_
  
  - [ ] 23.2 Create migration to add entity_id_type field
    - Add entity_id_type column (String, nullable)
    - Populate entity_id_type based on entity_type:
      - 'uuid' for entity_type = 'article'
      - 'int' for other entity types (lead, etc.)
    - Make entity_id_type NOT NULL after population
    - _Requirements: 17.4, 17.5_
  
  - [ ] 23.3 Create migration to swap MediaAssetRelation ID columns
    - Drop old MediaAssetRelation.id column
    - Rename media_asset_relation_id_uuid to id
    - Recreate indexes
    - Update unique constraint
    - _Requirements: 17.1, 17.2_
  
  - [ ] 23.4 Update MediaAssetRelation domain entity
    - Change id type from number to string
    - Add entityIdType field
    - Update constructor to handle polymorphic entity_id
    - Add type guards for entity_id
    - _Requirements: 17.6_
  
  - [ ] 23.5 Update MediaAssetRelation repository
    - Update interface to use string IDs
    - Update PrismaMediaRelationRepository implementation
    - Handle polymorphic entity_id in queries
    - Update create/update methods
    - _Requirements: 17.7_
  
  - [ ] 23.6 Update MediaAssetRelation service
    - Update service methods to handle string IDs
    - Add entity_id_type parameter to create methods
    - Update validation logic
    - _Requirements: 17.7_

### Phase 7: Testing and Validation

- [ ] 24. UUID migration testing
  - [ ] 24.1 Create unit tests for UUID utilities
    - Test generateCuid() produces valid UUIDs
    - Test isValidCuid() validates correctly
    - Test isCuid() type guard
    - _Requirements: 19.1_
  
  - [ ] 24.2 Create integration tests for migrations
    - Test MediaCollection UUID migration
    - Test MediaAsset UUID migration
    - Test Author UUID migration
    - Test Article UUID migration
    - Test MediaAssetRelation UUID migration
    - Verify data integrity after each migration
    - _Requirements: 19.2, 19.6_
  
  - [ ] 24.3 Create end-to-end tests for UUID APIs
    - Test all CRUD operations with UUID IDs
    - Test foreign key relationships
    - Test error handling for invalid UUIDs
    - Test pagination with UUID IDs
    - _Requirements: 19.2_
  
  - [ ] 24.4 Create rollback tests
    - Test rollback for each migration phase
    - Verify data integrity after rollback
    - Test multiple rollback scenarios
    - _Requirements: 19.4_
  
  - [ ] 24.5 Create performance tests
    - Compare query performance: Int vs UUID
    - Test index performance
    - Test join performance
    - Measure migration execution time
    - _Requirements: 19.5_

### Phase 8: Documentation and Deployment

- [ ] 25. UUID migration documentation
  - [ ] 25.1 Update API documentation
    - Document all breaking changes
    - Update Swagger/OpenAPI specs
    - Provide before/after examples
    - Document UUID format and validation
    - _Requirements: 20.1, 20.4, 20.6_
  
  - [ ] 25.2 Create migration guide for frontend
    - Document ID format changes
    - Provide migration timeline
    - Include code examples
    - Document error handling
    - _Requirements: 20.2, 20.7_
  
  - [ ] 25.3 Create database migration guide
    - Document migration phases
    - Provide rollback procedures
    - Include troubleshooting guide
    - Document data validation steps
    - _Requirements: 20.5, 20.7_
  
  - [ ] 25.4 Update system architecture documentation
    - Document UUID strategy
    - Update entity relationship diagrams
    - Document foreign key relationships
    - Update data flow diagrams
    - _Requirements: 20.3_

### Phase 9: Final Validation

- [ ] 26. Final UUID migration checkpoint
  - [ ] 26.1 Run complete test suite
    - Run all unit tests
    - Run all integration tests
    - Run all e2e tests
    - Verify 100% pass rate
    - _Requirements: 19.1, 19.2_
  
  - [ ] 26.2 Validate data integrity
    - Verify all foreign key relationships
    - Verify no orphaned records
    - Verify UUID uniqueness
    - Verify data completeness
    - _Requirements: 19.6_
  
  - [ ] 26.3 Performance validation
    - Run performance benchmarks
    - Compare with baseline metrics
    - Verify acceptable performance
    - Document any degradation
    - _Requirements: 19.5_
  
  - [ ] 26.4 Security validation
    - Verify UUID unpredictability
    - Test for ID enumeration vulnerabilities
    - Verify access control with UUIDs
    - _Requirements: 18.1, 18.2_

## Migration Execution Order

1. **Phase 1**: Infrastructure setup (Task 18)
2. **Phase 2**: MediaCollection migration (Task 19) - 7 subtasks
3. **Phase 3**: MediaAsset migration (Task 20) - 7 subtasks
4. **Phase 4**: Author migration (Task 21) - 7 subtasks
5. **Phase 5**: Article migration (Task 22) - 8 subtasks
6. **Phase 6**: MediaAssetRelation migration (Task 23) - 6 subtasks
7. **Phase 7**: Testing (Task 24) - 5 subtasks
8. **Phase 8**: Documentation (Task 25) - 4 subtasks
9. **Phase 9**: Final validation (Task 26) - 4 subtasks

**Total: 9 phases, 48 subtasks**

## Rollback Points

Each phase has a rollback migration that can restore the previous state:
- After Phase 2: Rollback MediaCollection to Int
- After Phase 3: Rollback MediaAsset to Int
- After Phase 4: Rollback Author to Int
- After Phase 5: Rollback Article to Int
- After Phase 6: Rollback MediaAssetRelation to Int

## Estimated Timeline

- Phase 1: 1 day
- Phase 2: 2 days
- Phase 3: 2 days
- Phase 4: 2 days
- Phase 5: 3 days
- Phase 6: 2 days
- Phase 7: 3 days
- Phase 8: 2 days
- Phase 9: 1 day

**Total: ~18 days**

## Notes

- All migrations preserve existing data
- Each phase can be rolled back independently
- Testing is integrated throughout the process
- Documentation is updated continuously
- Performance is monitored at each phase
