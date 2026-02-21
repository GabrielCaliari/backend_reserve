# Design Document: CMS UUID Migration Expansion

## Overview

Este documento estende o design do CMS Blog Article Refactoring para incluir a migração completa de identificadores inteiros para UUID em todas as entidades do módulo CMS. A migração visa melhorar segurança, escalabilidade e consistência do sistema.

## UUID Strategy

### UUID Format

Utilizaremos **cuid()** (Collision-resistant Unique Identifier) do Prisma:
- **Formato**: String de 12 caracteres
- **Exemplo**: `ckl1234abcd5`
- **Vantagens**:
  - Mais curto que UUID v4 (12 vs 36 caracteres)
  - Ordenável por tempo de criação
  - URL-safe (sem caracteres especiais)
  - Collision-resistant
  - Geração rápida

### Database Schema

```prisma
// Antes (Int)
model Article {
  id Int @id @default(autoincrement())
}

// Depois (UUID)
model Article {
  id String @id @default(cuid()) @db.VarChar(12)
}
```

## Migration Architecture

### Phase-Based Approach

A migração segue uma abordagem em fases para minimizar riscos:

```
Phase 1: Infrastructure
    ↓
Phase 2: MediaCollection (leaf entity)
    ↓
Phase 3: MediaAsset (depends on MediaCollection)
    ↓
Phase 4: Author (depends on MediaAsset)
    ↓
Phase 5: Article (depends on Blog, Author, MediaAsset)
    ↓
Phase 6: MediaAssetRelation (depends on MediaAsset, Article)
    ↓
Phase 7-9: Testing, Documentation, Validation
```

### Three-Step Migration Pattern

Cada entidade segue este padrão de 3 etapas:

#### Step 1: Add UUID Column
```sql
-- Add temporary UUID column
ALTER TABLE "Article" ADD COLUMN "article_id_uuid" VARCHAR(12);

-- Generate UUIDs for existing records
UPDATE "Article" SET "article_id_uuid" = generate_cuid();

-- Add unique constraint
ALTER TABLE "Article" ADD CONSTRAINT "Article_article_id_uuid_key" 
  UNIQUE ("article_id_uuid");
```

#### Step 2: Map Foreign Keys
```sql
-- Add temporary UUID foreign key column
ALTER TABLE "ArticleImage" ADD COLUMN "article_id_uuid" VARCHAR(12);

-- Map Int IDs to UUIDs
UPDATE "ArticleImage" ai
SET "article_id_uuid" = (
  SELECT a."article_id_uuid"
  FROM "Article" a
  WHERE a.id = ai.article_id
);

-- Validate mapping
SELECT COUNT(*) FROM "ArticleImage" WHERE "article_id_uuid" IS NULL;
-- Should return 0
```

#### Step 3: Swap Columns
```sql
-- Drop old foreign key
ALTER TABLE "ArticleImage" DROP CONSTRAINT "ArticleImage_article_id_fkey";

-- Drop old ID column
ALTER TABLE "Article" DROP COLUMN "id";

-- Rename UUID column to id
ALTER TABLE "Article" RENAME COLUMN "article_id_uuid" TO "id";
ALTER TABLE "ArticleImage" RENAME COLUMN "article_id_uuid" TO "article_id";

-- Recreate foreign key
ALTER TABLE "ArticleImage" ADD CONSTRAINT "ArticleImage_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE;

-- Recreate indexes
CREATE INDEX "Article_blog_id_status_display_order_idx" 
  ON "Article"("blog_id", "status", "display_order");
```

## Entity Migration Details

### 1. MediaCollection Migration

**Dependencies**: None (leaf entity)

**Schema Changes**:
```prisma
model MediaCollection {
  id String @id @default(cuid()) @db.VarChar(12) // Changed from Int
  // ... other fields
  assets MediaAsset[]
}
```

**Foreign Keys to Update**:
- `MediaAsset.collection_id` → String

**Code Changes**:
- Domain entity: `MediaCollection.id: string`
- Repository interface: `findById(id: string)`
- Service methods: Accept/return string IDs
- DTOs: Update ID field types
- Controller: Update route parameters

### 2. MediaAsset Migration

**Dependencies**: MediaCollection

**Schema Changes**:
```prisma
model MediaAsset {
  id            String @id @default(cuid()) @db.VarChar(12) // Changed from Int
  collection_id String @db.VarChar(12) // Changed from Int
  // ... other fields
  
  collection         MediaCollection      @relation(fields: [collection_id], references: [id])
  ArticleCoverImages Article[]            @relation("ArticleCoverImage")
  AuthorAvatars      Author[]             @relation("AuthorAvatar")
}
```

**Foreign Keys to Update**:
- `Article.cover_image_id` → String
- `Author.avatar_id` → String
- `MediaAssetRelation.asset_id` → String
- `LeadAttachment.asset_id` → String

**Code Changes**:
- Domain entity: `MediaAsset.id: string`, `collectionId: string`
- Repository: Update all query methods
- Service: Update upload, update, delete methods
- DTOs: Update response DTOs
- Keep `storage_key` as separate field for S3 references

### 3. Author Migration

**Dependencies**: MediaAsset (for avatar)

**Schema Changes**:
```prisma
model Author {
  id        String @id @default(cuid()) @db.VarChar(12) // Changed from Int
  avatar_id String? @db.VarChar(12) // Changed from Int
  // ... other fields
  
  Avatar  MediaAsset? @relation("AuthorAvatar", fields: [avatar_id], references: [id])
  Article Article[]
}
```

**Foreign Keys to Update**:
- `Article.author_id` → String

**Code Changes**:
- Domain entity: `Author.id: string`, `avatarId: string | null`
- Repository: Update CRUD methods
- Service: Update all methods, validate UUID format
- DTOs: Update CreateAuthorDTO, UpdateAuthorDTO, AuthorResponseDTO
- Controller: Update route parameters

### 4. Blog Migration

**Dependencies**: None (already planned in original spec)

**Schema Changes**:
```prisma
model Blog {
  id String @id @default(cuid()) @db.VarChar(12) // Already changed
  // ... other fields
  Article Article[]
}
```

**Foreign Keys to Update**:
- `Article.blog_id` → String (already planned)

### 5. Article Migration

**Dependencies**: Blog, Author, MediaAsset

**Schema Changes**:
```prisma
model Article {
  id             String @id @default(cuid()) @db.VarChar(12) // Changed from Int
  cover_image_id String? @db.VarChar(12) // Changed from Int
  author_id      String @db.VarChar(12) // Changed from Int
  blog_id        String @db.VarChar(12) // Already changed
  // ... other fields
  
  Blog              Blog        @relation(fields: [blog_id], references: [id])
  CoverImage        MediaAsset? @relation("ArticleCoverImage", fields: [cover_image_id], references: [id])
  Author            Author      @relation(fields: [author_id], references: [id])
  ArticleImage      ArticleImage[]
}
```

**Foreign Keys to Update**:
- `ArticleImage.article_id` → String
- `MediaAssetRelation.entity_id` (when entity_type = 'article') → String

**Code Changes**:
- Domain entity: `Article.id: string`, `coverImageId: string | null`, `authorId: string`, `blogId: string`
- Repository: Update all query methods
- Service: Update all business logic methods
- DTOs: Update all DTOs
- Controller: Update all endpoints
- Presenter: Update formatting methods

### 6. MediaAssetRelation Migration

**Dependencies**: MediaAsset, Article (polymorphic)

**Schema Changes**:
```prisma
model MediaAssetRelation {
  id            String @id @default(cuid()) @db.VarChar(12) // Changed from Int
  asset_id      String @db.VarChar(12) // Changed from Int
  entity_type   String @db.VarChar(50)
  entity_id     String @db.VarChar(50) // Polymorphic: can be UUID or Int
  entity_id_type String @db.VarChar(10) // NEW: 'uuid' or 'int'
  relation_type String @db.VarChar(50)
  // ... other fields
  
  asset MediaAsset @relation(fields: [asset_id], references: [id])
}
```

**Polymorphic Entity ID Handling**:
```typescript
// Domain entity
export class MediaAssetRelation {
  entityId: string; // Can be UUID or Int as string
  entityIdType: 'uuid' | 'int'; // Discriminator
  
  isUuidEntity(): boolean {
    return this.entityIdType === 'uuid';
  }
  
  getEntityIdAsUuid(): string | null {
    return this.isUuidEntity() ? this.entityId : null;
  }
  
  getEntityIdAsInt(): number | null {
    return !this.isUuidEntity() ? parseInt(this.entityId, 10) : null;
  }
}
```

**Code Changes**:
- Domain entity: Add `entityIdType` field, add type guards
- Repository: Handle polymorphic queries
- Service: Pass `entityIdType` when creating relations

## Code Layer Updates

### Domain Layer

#### Entity Changes
```typescript
// Before
export class Article {
  public readonly id?: number;
  public coverImageId: number | null;
  public authorId: number;
  public blogId: string; // Already UUID
}

// After
export class Article {
  public readonly id?: string;
  public coverImageId: string | null;
  public authorId: string;
  public blogId: string;
}
```

#### Value Object for UUID
```typescript
// domain/value-objects/uuid.vo.ts
export class Uuid {
  private readonly value: string;

  constructor(uuid: string) {
    if (!Uuid.isValid(uuid)) {
      throw new DomainException(`Invalid UUID: ${uuid}`);
    }
    this.value = uuid;
  }

  static isValid(uuid: string): boolean {
    // cuid format: c + timestamp (8 chars) + random (3 chars)
    return /^c[a-z0-9]{11}$/.test(uuid);
  }

  static generate(): Uuid {
    // Use Prisma's cuid() or a library
    return new Uuid(generateCuid());
  }

  toString(): string {
    return this.value;
  }

  equals(other: Uuid): boolean {
    return this.value === other.value;
  }
}
```

### Application Layer

#### Repository Interfaces
```typescript
// Before
export interface IArticleRepository {
  findById(id: number): Promise<Article | null>;
  create(article: Article): Promise<Article>;
  update(id: number, data: Partial<Article>): Promise<Article>;
  delete(id: number): Promise<void>;
}

// After
export interface IArticleRepository {
  findById(id: string): Promise<Article | null>;
  create(article: Article): Promise<Article>;
  update(id: string, data: Partial<Article>): Promise<Article>;
  delete(id: string): Promise<void>;
}
```

#### DTOs
```typescript
// Before
export class ArticleResponseDTO {
  @ApiProperty({ example: 123 })
  id: number;
  
  @ApiProperty({ example: 456 })
  coverImageId: number | null;
  
  @ApiProperty({ example: 789 })
  authorId: number;
}

// After
export class ArticleResponseDTO {
  @ApiProperty({ example: 'ckl1234abcd5' })
  id: string;
  
  @ApiProperty({ example: 'ckl5678efgh9' })
  coverImageId: string | null;
  
  @ApiProperty({ example: 'ckl9012ijkl3' })
  authorId: string;
}
```

#### Services
```typescript
// Before
async findById(id: number): Promise<ServiceResponse<Article>> {
  const article = await this.articleRepository.findById(id);
  // ...
}

// After
async findById(id: string): Promise<ServiceResponse<Article>> {
  // Validate UUID format
  if (!Uuid.isValid(id)) {
    return errorResponse('400:Invalid article ID format', 400);
  }
  
  const article = await this.articleRepository.findById(id);
  // ...
}
```

### Infrastructure Layer

#### Controllers
```typescript
// Before
@Get('/:id')
async findOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
  const result = await this.articleService.findById(id);
  return res.status(result.status).json(result.data);
}

// After
@Get('/:id')
async findOne(
  @Param('id', new ParseUuidPipe()) id: string,
  @Res() res: Response
) {
  const result = await this.articleService.findById(id);
  return res.status(result.status).json(result.data);
}
```

#### Custom UUID Validation Pipe
```typescript
// infrastructure/pipes/parse-uuid.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Uuid } from '../../domain/value-objects/uuid.vo';

@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Uuid.isValid(value)) {
      throw new BadRequestException(`Invalid UUID format: ${value}`);
    }
    return value;
  }
}
```

#### Repositories
```typescript
// Before
async findById(id: number): Promise<Article | null> {
  const record = await this.prisma.article.findUnique({
    where: { id },
  });
  return record ? this.toDomain(record) : null;
}

// After
async findById(id: string): Promise<Article | null> {
  const record = await this.prisma.article.findUnique({
    where: { id },
  });
  return record ? this.toDomain(record) : null;
}
```

## Migration Utilities

### UUID Generation Function
```typescript
// infrastructure/utils/uuid.util.ts
import { createId } from '@paralleldrive/cuid2';

export function generateCuid(): string {
  return createId();
}

export function isValidCuid(value: string): boolean {
  return /^c[a-z0-9]{11}$/.test(value);
}

export function isCuid(value: unknown): value is string {
  return typeof value === 'string' && isValidCuid(value);
}
```

### Migration Helper Functions
```typescript
// infrastructure/migrations/helpers/uuid-migration.helper.ts
import { PrismaClient } from '@prisma/client';
import { generateCuid } from '../utils/uuid.util';

export async function addUuidColumn(
  prisma: PrismaClient,
  tableName: string,
  columnName: string = 'id_uuid'
): Promise<void> {
  await prisma.$executeRaw`
    ALTER TABLE ${tableName} 
    ADD COLUMN ${columnName} VARCHAR(12)
  `;
  
  // Generate UUIDs for existing records
  const records = await prisma.$queryRaw`
    SELECT id FROM ${tableName}
  `;
  
  for (const record of records) {
    const uuid = generateCuid();
    await prisma.$executeRaw`
      UPDATE ${tableName}
      SET ${columnName} = ${uuid}
      WHERE id = ${record.id}
    `;
  }
  
  // Add unique constraint
  await prisma.$executeRaw`
    ALTER TABLE ${tableName}
    ADD CONSTRAINT ${tableName}_${columnName}_key
    UNIQUE (${columnName})
  `;
}

export async function mapForeignKeys(
  prisma: PrismaClient,
  sourceTable: string,
  targetTable: string,
  fkColumn: string,
  uuidColumn: string = 'id_uuid'
): Promise<void> {
  // Add temporary UUID column
  await prisma.$executeRaw`
    ALTER TABLE ${sourceTable}
    ADD COLUMN ${fkColumn}_uuid VARCHAR(12)
  `;
  
  // Map Int IDs to UUIDs
  await prisma.$executeRaw`
    UPDATE ${sourceTable} s
    SET ${fkColumn}_uuid = (
      SELECT t.${uuidColumn}
      FROM ${targetTable} t
      WHERE t.id = s.${fkColumn}
    )
  `;
  
  // Validate mapping
  const unmapped = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM ${sourceTable}
    WHERE ${fkColumn}_uuid IS NULL
  `;
  
  if (unmapped[0].count > 0) {
    throw new Error(`Failed to map ${unmapped[0].count} records in ${sourceTable}.${fkColumn}`);
  }
}

export async function swapColumns(
  prisma: PrismaClient,
  tableName: string,
  oldColumn: string,
  newColumn: string
): Promise<void> {
  // Drop old column
  await prisma.$executeRaw`
    ALTER TABLE ${tableName}
    DROP COLUMN ${oldColumn}
  `;
  
  // Rename new column
  await prisma.$executeRaw`
    ALTER TABLE ${tableName}
    RENAME COLUMN ${newColumn} TO ${oldColumn}
  `;
}

export async function validateDataIntegrity(
  prisma: PrismaClient,
  tableName: string,
  idColumn: string = 'id'
): Promise<boolean> {
  // Check for NULL IDs
  const nullIds = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM ${tableName}
    WHERE ${idColumn} IS NULL
  `;
  
  if (nullIds[0].count > 0) {
    console.error(`Found ${nullIds[0].count} NULL IDs in ${tableName}`);
    return false;
  }
  
  // Check for duplicate IDs
  const duplicates = await prisma.$queryRaw`
    SELECT ${idColumn}, COUNT(*) as count
    FROM ${tableName}
    GROUP BY ${idColumn}
    HAVING COUNT(*) > 1
  `;
  
  if (duplicates.length > 0) {
    console.error(`Found ${duplicates.length} duplicate IDs in ${tableName}`);
    return false;
  }
  
  return true;
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('Uuid Value Object', () => {
  it('should validate correct cuid format', () => {
    expect(Uuid.isValid('ckl1234abcd5')).toBe(true);
  });
  
  it('should reject invalid format', () => {
    expect(Uuid.isValid('123')).toBe(false);
    expect(Uuid.isValid('not-a-uuid')).toBe(false);
  });
  
  it('should generate valid uuid', () => {
    const uuid = Uuid.generate();
    expect(Uuid.isValid(uuid.toString())).toBe(true);
  });
});
```

### Integration Tests
```typescript
describe('Article UUID Migration', () => {
  it('should migrate article IDs to UUID', async () => {
    // Create article with Int ID
    const article = await createTestArticle();
    expect(typeof article.id).toBe('number');
    
    // Run migration
    await runArticleUuidMigration();
    
    // Verify UUID format
    const migrated = await findArticleById(article.id);
    expect(typeof migrated.id).toBe('string');
    expect(Uuid.isValid(migrated.id)).toBe(true);
  });
  
  it('should preserve all article data', async () => {
    const before = await getAllArticles();
    await runArticleUuidMigration();
    const after = await getAllArticles();
    
    expect(after.length).toBe(before.length);
    // Verify all fields except ID are unchanged
  });
});
```

### E2E Tests
```typescript
describe('Article API with UUID', () => {
  it('should create article and return UUID', async () => {
    const response = await request(app)
      .post('/api/v2/articles')
      .send(createArticleDto)
      .expect(201);
    
    expect(typeof response.body.id).toBe('string');
    expect(Uuid.isValid(response.body.id)).toBe(true);
  });
  
  it('should reject invalid UUID format', async () => {
    await request(app)
      .get('/api/v2/articles/123')
      .expect(400);
  });
});
```

## Performance Considerations

### Index Strategy
```sql
-- UUID indexes perform similarly to Int indexes
CREATE INDEX "Article_blog_id_status_idx" ON "Article"("blog_id", "status");
CREATE INDEX "Article_author_id_idx" ON "Article"("author_id");
CREATE INDEX "MediaAsset_collection_id_idx" ON "MediaAsset"("collection_id");
```

### Query Performance
- **UUID vs Int**: Minimal performance difference for indexed lookups
- **Storage**: UUID (12 bytes) vs Int (4 bytes) = 3x storage increase
- **Join Performance**: Comparable with proper indexes
- **Sorting**: cuid() is time-ordered, maintains chronological sorting

### Optimization Tips
1. Always index UUID foreign keys
2. Use covering indexes for common queries
3. Consider partitioning for very large tables
4. Monitor query performance after migration

## Rollback Strategy

Each migration phase has a corresponding rollback:

```typescript
// Up migration
export async function up(prisma: PrismaClient) {
  await addUuidColumn(prisma, 'Article');
  await mapForeignKeys(prisma, 'ArticleImage', 'Article', 'article_id');
  await swapColumns(prisma, 'Article', 'id', 'id_uuid');
}

// Down migration
export async function down(prisma: PrismaClient) {
  // Restore Int ID column
  await prisma.$executeRaw`
    ALTER TABLE "Article" ADD COLUMN "id_int" SERIAL
  `;
  
  // Map UUIDs back to Ints (using stored mapping table)
  await prisma.$executeRaw`
    UPDATE "Article" a
    SET "id_int" = (
      SELECT m.old_id
      FROM "uuid_migration_map" m
      WHERE m.table_name = 'Article' AND m.new_id = a.id
    )
  `;
  
  // Swap columns back
  await swapColumns(prisma, 'Article', 'id', 'id_int');
}
```

## Security Considerations

### UUID Benefits
1. **No Enumeration**: Cannot guess valid IDs
2. **No Sequence Exposure**: Doesn't reveal creation order or volume
3. **Collision Resistance**: Extremely low probability of duplicates
4. **URL Safety**: No special characters, safe in URLs

### Validation
```typescript
// Always validate UUID format
if (!Uuid.isValid(id)) {
  throw new BadRequestException('Invalid ID format');
}

// Prevent timing attacks
function safeUuidCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

## Conclusion

A migração UUID fornece:
- ✅ Identificadores globalmente únicos
- ✅ Melhor segurança (sem enumeração)
- ✅ Escalabilidade (geração distribuída)
- ✅ Consistência em todo o módulo CMS
- ✅ Rollback seguro em cada fase
- ✅ Performance aceitável com indexes adequados
