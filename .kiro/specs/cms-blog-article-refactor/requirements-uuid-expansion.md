  # Requirements Document - UUID Expansion

## Introduction

Este documento estende os requisitos do CMS Blog Article Refactoring para incluir a migração de identificadores inteiros para UUID em todas as entidades principais do CMS. Esta mudança visa:

1. **Segurança**: UUIDs não expõem informações sobre volume de dados ou sequência de criação
2. **Escalabilidade**: UUIDs permitem geração distribuída de IDs sem conflitos
3. **Integração**: UUIDs facilitam sincronização entre sistemas e ambientes
4. **Consistência**: Padronizar o uso de UUIDs em todo o módulo CMS

## Entidades Afetadas

As seguintes entidades serão migradas de Int para String UUID (12 caracteres usando cuid()):

1. **Blog** - Já planejado no requisito original 1
2. **Article** - Nova migração
3. **Author** - Nova migração  
4. **MediaAsset** - Nova migração
5. **MediaCollection** - Nova migração
6. **MediaAssetRelation** - Nova migração (entity_id permanece polimórfico)

## Requirement 13: Article ID Migration to UUID

**User Story:** Como arquiteto de sistema, quero migrar Article IDs de inteiro para UUID, para que artigos tenham identificadores globalmente únicos e seguros.

### Acceptance Criteria

1. THE System SHALL change Article.id from Int to String @db.VarChar(12) with @default(cuid())
2. THE System SHALL update all foreign key references to Article.id:
   - ArticleImage.article_id
   - MediaAssetRelation.entity_id (quando entity_type = 'article')
3. WHEN migrating existing data, THE System SHALL generate UUIDs for all existing articles
4. THE System SHALL preserve all article data without loss
5. THE System SHALL update Article entity in domain layer to use string id
6. THE System SHALL update ArticleRepository interface and implementation
7. THE System SHALL update ArticleService to handle string IDs
8. THE System SHALL update ArticleController endpoints to accept string IDs
9. THE System SHALL update all API documentation with new ID format

## Requirement 14: Author ID Migration to UUID

**User Story:** Como arquiteto de sistema, quero migrar Author IDs de inteiro para UUID, para consistência com outras entidades do CMS.

### Acceptance Criteria

1. THE System SHALL change Author.id from Int to String @db.VarChar(12) with @default(cuid())
2. THE System SHALL update Article.author_id from Int to String @db.VarChar(12)
3. WHEN migrating existing data, THE System SHALL generate UUIDs for all existing authors
4. THE System SHALL preserve all author data and article associations
5. THE System SHALL update Author entity in domain layer to use string id
6. THE System SHALL update AuthorRepository interface and implementation
7. THE System SHALL update AuthorService to handle string IDs
8. THE System SHALL update AuthorController endpoints to accept string IDs

## Requirement 15: MediaAsset ID Migration to UUID

**User Story:** Como arquiteto de sistema, quero migrar MediaAsset IDs de inteiro para UUID, para melhor rastreabilidade e segurança de assets.

### Acceptance Criteria

1. THE System SHALL change MediaAsset.id from Int to String @db.VarChar(12) with @default(cuid())
2. THE System SHALL update all foreign key references to MediaAsset.id:
   - Article.cover_image_id
   - Author.avatar_id
   - MediaAssetRelation.asset_id
   - LeadAttachment.asset_id
3. WHEN migrating existing data, THE System SHALL generate UUIDs for all existing media assets
4. THE System SHALL preserve all asset data and relationships
5. THE System SHALL update MediaAsset entity in domain layer to use string id
6. THE System SHALL update MediaAssetRepository interface and implementation
7. THE System SHALL update all services that interact with MediaAsset
8. THE System SHALL maintain storage_key as separate field for S3 references

## Requirement 16: MediaCollection ID Migration to UUID

**User Story:** Como arquiteto de sistema, quero migrar MediaCollection IDs de inteiro para UUID, para consistência no sistema de assets.

### Acceptance Criteria

1. THE System SHALL change MediaCollection.id from Int to String @db.VarChar(12) with @default(cuid())
2. THE System SHALL update MediaAsset.collection_id from Int to String @db.VarChar(12)
3. WHEN migrating existing data, THE System SHALL generate UUIDs for all existing collections
4. THE System SHALL preserve all collection data and asset associations
5. THE System SHALL update MediaCollection entity in domain layer to use string id
6. THE System SHALL update MediaCollectionRepository interface and implementation
7. THE System SHALL update collection-related services

## Requirement 17: MediaAssetRelation ID Migration to UUID

**User Story:** Como arquiteto de sistema, quero migrar MediaAssetRelation IDs de inteiro para UUID, completando a migração do sistema de assets.

### Acceptance Criteria

1. THE System SHALL change MediaAssetRelation.id from Int to String @db.VarChar(12) with @default(cuid())
2. THE System SHALL update MediaAssetRelation.asset_id from Int to String @db.VarChar(12)
3. THE System SHALL keep entity_id as polymorphic field that can reference both Int and String IDs
4. THE System SHALL add entity_id_type field to indicate if entity_id is 'int' or 'uuid'
5. WHEN migrating existing data, THE System SHALL:
   - Generate UUIDs for all MediaAssetRelation records
   - Update asset_id references to new MediaAsset UUIDs
   - Set entity_id_type based on entity_type
6. THE System SHALL update MediaAssetRelation entity in domain layer
7. THE System SHALL update MediaRelationRepository to handle polymorphic entity_id

## Migration Strategy

### Phase 1: Schema Preparation
1. Add temporary UUID columns to all affected tables
2. Generate UUIDs for all existing records
3. Populate temporary columns with generated UUIDs

### Phase 2: Foreign Key Migration
1. Add temporary foreign key columns with UUID type
2. Map old Int IDs to new UUID values
3. Verify data integrity

### Phase 3: Column Swap
1. Drop old Int ID columns and foreign keys
2. Rename temporary UUID columns to final names
3. Recreate indexes and constraints

### Phase 4: Code Update
1. Update domain entities to use string IDs
2. Update repository interfaces and implementations
3. Update services to handle string IDs
4. Update controllers and DTOs
5. Update presenters

### Phase 5: Validation
1. Run all tests
2. Verify data integrity
3. Test rollback procedures
4. Update API documentation

## Rollback Strategy

Each migration phase SHALL have a corresponding rollback migration that:
1. Restores original Int ID columns
2. Restores original foreign key relationships
3. Preserves all data
4. Can be executed safely at any point before Phase 3 completion

## Breaking Changes

### API Endpoints
All endpoints that previously accepted/returned integer IDs will now use string UUIDs:

**Before:**
```json
{
  "id": 123,
  "blog_id": 456,
  "author_id": 789
}
```

**After:**
```json
{
  "id": "ckl1234abcd5",
  "blog_id": "ckl5678efgh9",
  "author_id": "ckl9012ijkl3"
}
```

### Database Schema
All ID columns change from `Int @id @default(autoincrement())` to `String @id @default(cuid()) @db.VarChar(12)`

### Code Impact
- All repository methods accepting/returning IDs must handle strings
- All service methods must validate UUID format
- All DTOs must update ID field types
- All presenters must format UUIDs correctly

## Compatibility Considerations

### Requirement 18: Gradual Migration Support

**User Story:** Como desenvolvedor, quero suporte para migração gradual, para minimizar downtime e riscos.

#### Acceptance Criteria

1. THE System SHALL support both Int and UUID IDs during migration period
2. THE System SHALL provide utility functions to detect ID type
3. THE System SHALL log all ID format conversions for debugging
4. THE System SHALL validate UUID format on all inputs
5. THE System SHALL provide clear error messages for invalid ID formats

## Testing Requirements

### Requirement 19: Comprehensive UUID Migration Testing

**User Story:** Como QA engineer, quero testes abrangentes da migração UUID, para garantir zero perda de dados.

#### Acceptance Criteria

1. THE System SHALL have unit tests for all UUID generation logic
2. THE System SHALL have integration tests for all foreign key migrations
3. THE System SHALL have end-to-end tests for complete migration workflow
4. THE System SHALL have rollback tests for all migration phases
5. THE System SHALL have performance tests comparing Int vs UUID queries
6. THE System SHALL validate data integrity after each migration phase
7. THE System SHALL test all API endpoints with UUID IDs

## Documentation Requirements

### Requirement 20: UUID Migration Documentation

**User Story:** Como desenvolvedor frontend, quero documentação clara sobre mudanças de UUID, para atualizar aplicações cliente.

#### Acceptance Criteria

1. THE System SHALL document all breaking changes in API
2. THE System SHALL provide migration guide for frontend applications
3. THE System SHALL document UUID format and validation rules
4. THE System SHALL provide example requests/responses with UUIDs
5. THE System SHALL document rollback procedures
6. THE System SHALL update Swagger/OpenAPI specs with UUID types
7. THE System SHALL provide migration timeline and phases
