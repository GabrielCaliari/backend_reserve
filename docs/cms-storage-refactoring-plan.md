# CMS Storage Refactoring Plan

## Problema Atual

O sistema de storage está intrinsecamente acoplado ao blog/artigos:
- `ArticleImage` é específico para artigos
- Não há conceito de collections ou categorização
- Não é reutilizável para outros contextos (brands, companies, users, etc.)
- Viola o princípio de Single Responsibility

## Solução Proposta

Criar um sistema de **Media Asset Management** genérico e desacoplado dentro do módulo CMS.

---

## Nova Arquitetura

### 1. Domain Layer

#### Entities

**MediaAsset** (substitui ArticleImage)
```typescript
class MediaAsset {
  id: number;
  url: string;
  storage_key: string;
  filename: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  alt_text?: string;
  metadata?: Record<string, any>; // JSON flexível
  collection_id: number;
  tenant_id: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}
```

**MediaCollection**
```typescript
class MediaCollection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: ECollectionType; // image, document, video, mixed
  max_file_size?: number;
  allowed_mime_types?: string[];
  max_items?: number;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}
```

**MediaAssetRelation** (tabela pivot genérica)
```typescript
class MediaAssetRelation {
  id: number;
  asset_id: number;
  entity_type: string; // 'article', 'brand', 'company', 'user', etc.
  entity_id: number;
  relation_type: string; // 'featured', 'gallery', 'attachment', 'avatar', etc.
  display_order?: number;
  metadata?: Record<string, any>;
  created_at: Date;
}
```

#### Enums

```typescript
enum ECollectionType {
  image = 'image',
  document = 'document',
  video = 'video',
  audio = 'audio',
  mixed = 'mixed',
}

enum EAssetStatus {
  processing = 'processing',
  ready = 'ready',
  failed = 'failed',
  archived = 'archived',
}
```

---

### 2. Application Layer

#### Services

**MediaAssetService**
- `upload(collectionId, file, metadata)` - Upload genérico
- `findById(id)` - Buscar asset
- `findByCollection(collectionId, filters)` - Listar por collection
- `findByEntity(entityType, entityId)` - Buscar assets de uma entidade
- `delete(id)` - Deletar asset
- `updateMetadata(id, metadata)` - Atualizar metadados

**MediaCollectionService**
- `create(data)` - Criar collection
- `findById(id)` - Buscar collection
- `findAll(filters)` - Listar collections
- `update(id, data)` - Atualizar collection
- `delete(id)` - Deletar collection

**MediaRelationService**
- `attach(assetId, entityType, entityId, relationType)` - Vincular asset a entidade
- `detach(assetId, entityType, entityId)` - Desvincular
- `reorder(entityType, entityId, order)` - Reordenar assets de uma entidade
- `findRelations(assetId)` - Buscar relações de um asset

#### DTOs

```typescript
class UploadMediaDTO {
  file: Express.Multer.File;
  collection_id: number;
  alt_text?: string;
  metadata?: Record<string, any>;
}

class CreateCollectionDTO {
  name: string;
  slug: string;
  description?: string;
  type: ECollectionType;
  max_file_size?: number;
  allowed_mime_types?: string[];
  max_items?: number;
}

class AttachMediaDTO {
  asset_id: number;
  entity_type: string;
  entity_id: number;
  relation_type: string;
  display_order?: number;
  metadata?: Record<string, any>;
}
```

---

### 3. Infrastructure Layer

#### Controllers

**MediaAssetController** (`/api/cms/media`)
- `POST /` - Upload asset
- `GET /` - List assets (filterable by collection)
- `GET /:id` - Get asset details
- `PATCH /:id` - Update metadata
- `DELETE /:id` - Delete asset

**MediaCollectionController** (`/api/cms/collections`)
- `POST /` - Create collection
- `GET /` - List collections
- `GET /:id` - Get collection details
- `GET /:id/assets` - List assets in collection
- `PUT /:id` - Update collection
- `DELETE /:id` - Delete collection

**MediaRelationController** (`/api/cms/relations`)
- `POST /attach` - Attach asset to entity
- `POST /detach` - Detach asset from entity
- `PUT /reorder` - Reorder assets
- `GET /:entityType/:entityId` - Get entity's assets

#### Repositories

**PrismaMediaAssetRepository**
**PrismaMediaCollectionRepository**
**PrismaMediaRelationRepository**

---

### 4. Database Schema (Prisma)

```prisma
model MediaCollection {
  id                  Int           @id @default(autoincrement())
  name                String        @db.VarChar(100)
  slug                String        @db.VarChar(100)
  description         String?       @db.Text
  type                String        @db.VarChar(20) // image, document, video, audio, mixed
  max_file_size       Int?          // bytes
  allowed_mime_types  String?       @db.Text // JSON array
  max_items           Int?
  tenant_id           Int
  created_at          DateTime      @default(now())
  updated_at          DateTime      @updatedAt
  
  assets              MediaAsset[]
  
  @@unique([tenant_id, slug])
  @@index([tenant_id])
}

model MediaAsset {
  id              Int                   @id @default(autoincrement())
  url             String                @db.VarChar(500)
  storage_key     String                @db.VarChar(500)
  filename        String                @db.VarChar(255)
  mime_type       String                @db.VarChar(100)
  file_size       Int
  width           Int?
  height          Int?
  alt_text        String?               @db.VarChar(255)
  metadata        Json?                 // Flexible metadata
  status          String                @default("ready") @db.VarChar(20)
  collection_id   Int
  tenant_id       Int
  created_by      Int
  created_at      DateTime              @default(now())
  updated_at      DateTime              @updatedAt
  
  collection      MediaCollection       @relation(fields: [collection_id], references: [id], onDelete: Cascade)
  relations       MediaAssetRelation[]
  
  @@index([collection_id])
  @@index([tenant_id])
  @@index([created_by])
  @@index([status])
}

model MediaAssetRelation {
  id              Int         @id @default(autoincrement())
  asset_id        Int
  entity_type     String      @db.VarChar(50) // 'article', 'brand', 'company', etc.
  entity_id       Int
  relation_type   String      @db.VarChar(50) // 'featured', 'gallery', 'attachment', 'avatar'
  display_order   Int?
  metadata        Json?
  created_at      DateTime    @default(now())
  
  asset           MediaAsset  @relation(fields: [asset_id], references: [id], onDelete: Cascade)
  
  @@unique([asset_id, entity_type, entity_id, relation_type])
  @@index([entity_type, entity_id])
  @@index([asset_id])
}
```

---

## Migration Strategy

### Phase 1: Create New Structure (Non-Breaking)
1. Create new tables: `MediaCollection`, `MediaAsset`, `MediaAssetRelation`
2. Create new domain entities, interfaces, repositories
3. Create new services and controllers
4. Keep old `ArticleImage` intact

### Phase 2: Data Migration
1. Create seed collections:
   - `article-images` (type: image)
   - `brand-logos` (type: image)
   - `company-documents` (type: document)
2. Migrate existing `ArticleImage` data to `MediaAsset` + `MediaAssetRelation`
3. Update `article_id` references to use `MediaAssetRelation`

### Phase 3: Update Article Module
1. Update `ArticleService` to use `MediaRelationService`
2. Update `ArticleController` to use new endpoints
3. Deprecate `ArticleImageController` (mark as @deprecated)

### Phase 4: Cleanup (Breaking)
1. Remove `ArticleImage` table
2. Remove `ArticleImageController`
3. Remove `ArticleImageService`
4. Remove old repositories

---

## Benefits

### Decoupling
- Storage is independent of any specific entity
- Can be used by articles, brands, companies, users, etc.
- Single source of truth for media management

### Flexibility
- Collections organize assets by context
- Metadata field allows custom properties per use case
- Relation types enable different attachment semantics

### Scalability
- Easy to add new entity types without changing storage
- Can implement advanced features (tags, folders, permissions) later
- Supports multiple storage providers (S3, Vercel Blob, etc.)

### Reusability
- Brand logos → `brand-logos` collection
- Company documents → `company-documents` collection
- User avatars → `user-avatars` collection
- Article images → `article-images` collection

---

## Example Usage

### Upload to Collection
```typescript
// Upload brand logo
const asset = await mediaAssetService.upload({
  collection_id: brandLogosCollection.id,
  file: logoFile,
  alt_text: 'Acme Corp Logo',
  metadata: { brand_id: 123 }
});

// Attach to brand entity
await mediaRelationService.attach({
  asset_id: asset.id,
  entity_type: 'brand',
  entity_id: 123,
  relation_type: 'logo'
});
```

### Query Entity Assets
```typescript
// Get all images for an article
const articleImages = await mediaRelationService.findByEntity(
  'article',
  articleId,
  { relation_type: 'gallery' }
);

// Get featured image
const featured = await mediaRelationService.findByEntity(
  'article',
  articleId,
  { relation_type: 'featured' }
);
```

### Reorder Gallery
```typescript
await mediaRelationService.reorder('article', articleId, [
  { asset_id: 5, display_order: 1 },
  { asset_id: 2, display_order: 2 },
  { asset_id: 8, display_order: 3 }
]);
```

---

## Pre-defined Collections

### System Collections (created on seed)

| Slug | Type | Max Size | Allowed Types | Max Items | Use Case |
|------|------|----------|---------------|-----------|----------|
| `article-images` | image | 10MB | image/* | 20 | Blog article galleries |
| `article-featured` | image | 5MB | image/jpeg, image/png, image/webp | 1 | Article cover images |
| `brand-logos` | image | 2MB | image/svg+xml, image/png | 1 | Brand identity |
| `company-documents` | document | 50MB | application/pdf, application/msword | 100 | Legal docs, contracts |
| `user-avatars` | image | 1MB | image/jpeg, image/png | 1 | Profile pictures |
| `email-attachments` | mixed | 25MB | * | 10 | Email campaign files |

---

## API Routes Structure

```
/api/cms/
├── media/                          # MediaAssetController
│   ├── POST /                      # Upload asset
│   ├── GET /                       # List assets (filter by collection)
│   ├── GET /:id                    # Get asset
│   ├── PATCH /:id                  # Update metadata
│   └── DELETE /:id                 # Delete asset
│
├── collections/                    # MediaCollectionController
│   ├── POST /                      # Create collection
│   ├── GET /                       # List collections
│   ├── GET /:id                    # Get collection
│   ├── GET /:id/assets             # List collection assets
│   ├── PUT /:id                    # Update collection
│   └── DELETE /:id                 # Delete collection
│
└── relations/                      # MediaRelationController
    ├── POST /attach                # Attach asset to entity
    ├── POST /detach                # Detach asset
    ├── PUT /reorder                # Reorder entity assets
    └── GET /:entityType/:entityId  # Get entity's assets
```

---

## Implementation Checklist

### Domain Layer
- [ ] Create `MediaAsset` entity
- [ ] Create `MediaCollection` entity
- [ ] Create `MediaAssetRelation` entity
- [ ] Create `ECollectionType` enum
- [ ] Create `EAssetStatus` enum
- [ ] Create repository interfaces
- [ ] Create domain errors

### Application Layer
- [ ] Create `MediaAssetService`
- [ ] Create `MediaCollectionService`
- [ ] Create `MediaRelationService`
- [ ] Create DTOs (Upload, Create, Attach, etc.)
- [ ] Create presenters

### Infrastructure Layer
- [ ] Create `MediaAssetController`
- [ ] Create `MediaCollectionController`
- [ ] Create `MediaRelationController`
- [ ] Create Prisma repositories
- [ ] Update module providers

### Database
- [ ] Create Prisma schema for new tables
- [ ] Create migration
- [ ] Create seed for system collections
- [ ] Create data migration script (ArticleImage → MediaAsset)

### Documentation
- [ ] Update Swagger docs
- [ ] Create usage examples
- [ ] Document migration guide

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for repositories
- [ ] E2E tests for controllers

---

## Timeline Estimate

- **Phase 1** (New Structure): 3-4 days
- **Phase 2** (Data Migration): 1-2 days
- **Phase 3** (Update Article Module): 1-2 days
- **Phase 4** (Cleanup): 1 day
- **Testing & Documentation**: 2 days

**Total**: ~8-11 days

---

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feature/cms-storage-refactoring`
3. Start with Phase 1 (non-breaking changes)
4. Implement incrementally with tests
5. Deploy Phase 1-2 to staging for validation
6. Complete migration in production
7. Remove deprecated code after validation period
