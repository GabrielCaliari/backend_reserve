# CMS Storage Architecture - Generic Media Asset Management

## Executive Summary

O sistema de storage do CMS foi redesenhado para ser **genérico, desacoplado e reutilizável**. Ao invés de estar intrinsecamente ligado ao blog/artigos, agora oferece um sistema completo de **Media Asset Management** que pode ser usado por qualquer módulo da aplicação.

### Principais Mudanças

| Antes | Depois |
|-------|--------|
| `ArticleImage` - específico para artigos | `MediaAsset` - genérico para qualquer uso |
| Sem organização/categorização | `MediaCollection` - organiza assets por contexto |
| Acoplado ao blog | `MediaAssetRelation` - vincula assets a qualquer entidade |
| Não reutilizável | Totalmente desacoplado e reutilizável |

---

## Conceitos Fundamentais

### 1. MediaAsset (Ativo de Mídia)

Representa um arquivo armazenado (imagem, documento, vídeo, etc.).

**Características:**
- Independente de qualquer entidade específica
- Metadados flexíveis via campo JSON
- Suporte a múltiplos tipos de mídia
- Status de processamento (processing, ready, failed, archived)
- Dimensões para imagens (width, height)
- Tenant isolation

**Exemplo de uso:**
```typescript
// Logo de uma marca
const brandLogo = new MediaAsset({
  url: 'https://storage.com/brands/acme-logo.webp',
  storage_key: 'brands/123/logo.webp',
  filename: 'acme-logo.webp',
  mime_type: 'image/webp',
  file_size: 45678,
  width: 500,
  height: 500,
  alt_text: 'Acme Corp Logo',
  metadata: { brand_id: 123, version: 2 },
  collection_id: brandLogosCollection.id,
  tenant_id: 1,
  created_by: adminId
});
```

### 2. MediaCollection (Coleção de Mídia)

Organiza e categoriza assets por contexto/propósito.

**Características:**
- Define regras de validação (tamanho máximo, tipos permitidos)
- Limita quantidade de itens
- Agrupa assets relacionados
- Slug único por tenant

**Collections pré-definidas:**
- `article-images` - Galeria de imagens de artigos
- `article-featured` - Imagem de capa de artigos
- `brand-logos` - Logos de marcas
- `company-documents` - Documentos de empresas
- `user-avatars` - Fotos de perfil
- `email-attachments` - Anexos de campanhas

**Exemplo de uso:**
```typescript
const brandLogosCollection = new MediaCollection({
  name: 'Brand Logos',
  slug: 'brand-logos',
  description: 'Corporate brand identity logos',
  type: ECollectionType.image,
  max_file_size: 2 * 1024 * 1024, // 2MB
  allowed_mime_types: ['image/svg+xml', 'image/png', 'image/webp'],
  max_items: 1, // Apenas um logo por marca
  tenant_id: 1
});
```

### 3. MediaAssetRelation (Relação Asset-Entidade)

Vincula assets a entidades de negócio de forma genérica.

**Características:**
- Polimórfica - funciona com qualquer entidade
- Tipos de relação customizáveis (featured, gallery, attachment, avatar)
- Display order para ordenação
- Metadados específicos da relação

**Exemplo de uso:**
```typescript
// Vincular logo à marca
const relation = new MediaAssetRelation({
  asset_id: brandLogo.id,
  entity_type: 'brand',
  entity_id: 123,
  relation_type: 'logo',
  metadata: { is_primary: true }
});

// Vincular imagem à galeria de artigo
const galleryRelation = new MediaAssetRelation({
  asset_id: image.id,
  entity_type: 'article',
  entity_id: 456,
  relation_type: 'gallery',
  display_order: 1
});
```

---

## Arquitetura em Camadas

### Domain Layer (Puro TypeScript)

```
domain/
├── entities/
│   ├── media-asset.entity.ts
│   ├── media-collection.entity.ts
│   └── media-asset-relation.entity.ts
├── enums/
│   ├── collection-type.enum.ts
│   └── asset-status.enum.ts
├── interfaces/
│   ├── media-asset.repository.interface.ts
│   ├── media-collection.repository.interface.ts
│   └── media-relation.repository.interface.ts
└── errors/
    ├── asset-not-found.error.ts
    ├── collection-not-found.error.ts
    ├── collection-limit-exceeded.error.ts
    ├── invalid-file-type.error.ts
    └── file-size-exceeded.error.ts
```

### Application Layer

```
application/
├── services/
│   ├── media-asset.service.ts
│   ├── media-collection.service.ts
│   └── media-relation.service.ts
├── dtos/
│   ├── upload-media.dto.ts
│   ├── create-collection.dto.ts
│   ├── attach-media.dto.ts
│   └── reorder-media.dto.ts
└── presenters/
    ├── media-asset.presenter.ts
    └── media-collection.presenter.ts
```

### Infrastructure Layer

```
infrastructure/
├── controllers/
│   ├── media-asset.controller.ts
│   ├── media-collection.controller.ts
│   └── media-relation.controller.ts
├── repositories/
│   ├── prisma-media-asset.repository.ts
│   ├── prisma-media-collection.repository.ts
│   └── prisma-media-relation.repository.ts
└── providers/
    ├── s3-storage.provider.ts (já existe)
    ├── vercel-blob-storage.provider.ts (já existe)
    └── sharp-image-processor.provider.ts (já existe)
```

---

## Fluxos de Uso

### Fluxo 1: Upload de Logo de Marca

```typescript
// 1. Cliente faz upload
POST /api/cms/media
{
  collection_id: brandLogosCollection.id,
  file: <binary>,
  alt_text: "Acme Corp Logo",
  metadata: { brand_id: 123 }
}

// 2. Sistema valida collection rules
collection.canAcceptFile(mimeType, fileSize)
collection.canAcceptMoreItems(currentCount)

// 3. Processa imagem (se necessário)
imageProcessor.processToWebp(buffer, quality)

// 4. Upload para storage
storageProvider.upload(key, data, contentType)

// 5. Cria MediaAsset
mediaAssetRepository.create(asset)

// 6. Vincula à marca
POST /api/cms/relations/attach
{
  asset_id: asset.id,
  entity_type: "brand",
  entity_id: 123,
  relation_type: "logo"
}
```

### Fluxo 2: Galeria de Artigo

```typescript
// 1. Upload múltiplas imagens
for (const file of files) {
  const asset = await mediaAssetService.upload({
    collection_id: articleImagesCollection.id,
    file,
    alt_text: file.alt
  });
  
  // 2. Vincula ao artigo
  await mediaRelationService.attach({
    asset_id: asset.id,
    entity_type: 'article',
    entity_id: articleId,
    relation_type: 'gallery',
    display_order: index + 1
  });
}

// 3. Reordenar depois
PUT /api/cms/relations/reorder
{
  entity_type: "article",
  entity_id: 456,
  order: [
    { asset_id: 5, display_order: 1 },
    { asset_id: 2, display_order: 2 }
  ]
}
```

### Fluxo 3: Buscar Assets de uma Entidade

```typescript
// Buscar todas as imagens de um artigo
GET /api/cms/relations/article/456?relation_type=gallery

// Resposta
[
  {
    id: 1,
    asset: {
      id: 5,
      url: "https://storage.com/...",
      alt_text: "Primeira imagem",
      width: 1920,
      height: 1080
    },
    display_order: 1,
    relation_type: "gallery"
  },
  {
    id: 2,
    asset: {
      id: 2,
      url: "https://storage.com/...",
      alt_text: "Segunda imagem",
      width: 1920,
      height: 1080
    },
    display_order: 2,
    relation_type: "gallery"
  }
]
```

---

## Casos de Uso por Módulo

### Blog/Articles
- **Collection**: `article-images`, `article-featured`
- **Relation Types**: `gallery`, `featured`
- **Use Case**: Galeria de imagens e capa de artigos

### Brands
- **Collection**: `brand-logos`
- **Relation Types**: `logo`, `banner`
- **Use Case**: Identidade visual de marcas

### Companies
- **Collection**: `company-documents`
- **Relation Types**: `contract`, `certificate`, `report`
- **Use Case**: Documentos legais e relatórios

### Users
- **Collection**: `user-avatars`
- **Relation Types**: `avatar`
- **Use Case**: Fotos de perfil

### Email Campaigns
- **Collection**: `email-attachments`
- **Relation Types**: `attachment`
- **Use Case**: Anexos de campanhas de email

---

## Vantagens da Nova Arquitetura

### 1. Desacoplamento Total
- Storage não conhece artigos, marcas ou qualquer entidade específica
- Pode ser usado por qualquer módulo sem modificações
- Segue o princípio de Single Responsibility

### 2. Flexibilidade
- Collections customizáveis por tenant
- Metadados flexíveis via JSON
- Tipos de relação extensíveis

### 3. Reutilização
- Um asset pode ser vinculado a múltiplas entidades
- Evita duplicação de arquivos
- Economia de storage

### 4. Escalabilidade
- Fácil adicionar novos tipos de entidades
- Suporta múltiplos storage providers
- Preparado para features avançadas (tags, folders, permissions)

### 5. Manutenibilidade
- Código organizado em camadas claras
- Testes isolados por responsabilidade
- Fácil evolução sem breaking changes

---

## Comparação: Antes vs Depois

### Antes (Acoplado)

```typescript
// Específico para artigos
POST /api/cms/articles/:articleId/images
{
  file: <binary>,
  alt_text: "..."
}

// Não reutilizável para brands
// Precisaria criar BrandImageController
// Duplicação de lógica
```

### Depois (Desacoplado)

```typescript
// Genérico - funciona para qualquer entidade
POST /api/cms/media
{
  collection_id: <collection>,
  file: <binary>,
  alt_text: "..."
}

POST /api/cms/relations/attach
{
  asset_id: <asset>,
  entity_type: "article" | "brand" | "company" | ...,
  entity_id: <id>,
  relation_type: "gallery" | "logo" | "avatar" | ...
}

// Mesma API para artigos, brands, companies, users, etc.
```

---

## Migração de Dados

### Script de Migração (ArticleImage → MediaAsset)

```typescript
// 1. Criar collection 'article-images'
const collection = await collectionRepo.create({
  name: 'Article Images',
  slug: 'article-images',
  type: ECollectionType.image,
  max_file_size: 10 * 1024 * 1024,
  max_items: 20,
  tenant_id: 1
});

// 2. Migrar cada ArticleImage
const oldImages = await articleImageRepo.findAll();

for (const oldImage of oldImages) {
  // Criar MediaAsset
  const asset = await mediaAssetRepo.create({
    url: oldImage.url,
    storage_key: oldImage.storage_key,
    filename: extractFilename(oldImage.storage_key),
    mime_type: 'image/webp',
    file_size: oldImage.file_size,
    alt_text: oldImage.alt_text,
    metadata: { original_format: oldImage.original_format },
    collection_id: collection.id,
    tenant_id: 1,
    created_by: 1 // System
  });
  
  // Criar relação com artigo
  await mediaRelationRepo.create({
    asset_id: asset.id,
    entity_type: 'article',
    entity_id: oldImage.article_id,
    relation_type: 'gallery',
    display_order: oldImage.display_order
  });
}
```

---

## Próximos Passos

1. ✅ **Planejamento** - Documentação e arquitetura definidas
2. 🔄 **Implementação Phase 1** - Criar estrutura nova (non-breaking)
3. ⏳ **Implementação Phase 2** - Migração de dados
4. ⏳ **Implementação Phase 3** - Atualizar módulo de artigos
5. ⏳ **Implementação Phase 4** - Remover código legado

---

## Referências

- [Plano de Refatoração Completo](./cms-storage-refactoring-plan.md)
- [Swagger API Documentation](./swagger-cms-storage.md)
- [NestJS Guidelines](../backend-nestjs.md)
