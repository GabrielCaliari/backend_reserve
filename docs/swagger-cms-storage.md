# Swagger Documentation - CMS Storage API (Generic Media Asset Management)

## Overview

API genérica para gerenciamento de assets de mídia (imagens, documentos, vídeos) no sistema CMS. 

O sistema é **desacoplado e reutilizável**, permitindo que qualquer módulo (artigos, brands, companies, users) armazene e gerencie seus assets através de:
- **Collections**: Organizam assets por contexto/propósito
- **Assets**: Arquivos armazenados com metadados
- **Relations**: Vinculam assets a entidades de negócio

## Base URLs

```
/api/cms/media           # MediaAssetController
/api/cms/collections     # MediaCollectionController  
/api/cms/relations       # MediaRelationController
```

## Architecture Concepts

### MediaAsset
Representa um arquivo armazenado (imagem, documento, vídeo). Independente de qualquer entidade específica.

### MediaCollection
Organiza e categoriza assets. Define regras de validação (tamanho, tipos permitidos, limite de itens).

### MediaAssetRelation
Vincula assets a entidades de negócio (article, brand, company, user) com tipos de relação (gallery, featured, logo, avatar).

## Authentication

Todas as rotas requerem:
- Bearer Token JWT (Admin)
- Header `x-tenant-id` com o ID do tenant

---

## Pre-defined Collections

Collections do sistema criadas automaticamente no seed:

| Slug | Type | Max Size | Allowed Types | Max Items | Use Case |
|------|------|----------|---------------|-----------|----------|
| `article-images` | image | 10MB | image/* | 20 | Galeria de imagens de artigos |
| `article-featured` | image | 5MB | image/jpeg, image/png, image/webp | 1 | Imagem de capa de artigos |
| `brand-logos` | image | 2MB | image/svg+xml, image/png, image/webp | 1 | Logos de marcas |
| `company-documents` | document | 50MB | application/pdf, application/msword | 100 | Documentos de empresas |
| `user-avatars` | image | 1MB | image/jpeg, image/png | 1 | Fotos de perfil |
| `email-attachments` | mixed | 25MB | * | 10 | Anexos de campanhas |

---

## Endpoints

---

## MEDIA ASSETS

### 1. Upload Media Asset

**POST** `/api/cms/media`

Faz upload de um arquivo para uma collection específica. O arquivo é processado conforme o tipo (imagens convertidas para WebP) e armazenado.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
Content-Type: multipart/form-data
```

#### Request Body (multipart/form-data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | binary | Yes | Arquivo de mídia |
| collection_id | integer | Yes | ID da collection de destino |
| alt_text | string | No | Texto alternativo para acessibilidade (max 255 chars) |
| metadata | JSON string | No | Metadados customizados em formato JSON |

#### Business Rules
- Collection deve existir e pertencer ao tenant
- Arquivo deve respeitar regras da collection (tamanho, tipo, limite de itens)
- Imagens são automaticamente convertidas para WebP
- Qualidade de compressão configurável via `CMS_IMAGE_QUALITY` (padrão: 80)

#### Responses

**201 Created**
```json
{
  "id": 123,
  "url": "https://storage.example.com/cms/brands/123/1708345678901.webp",
  "storage_key": "cms/brands/123/1708345678901.webp",
  "filename": "acme-logo.webp",
  "mime_type": "image/webp",
  "file_size": 45678,
  "width": 500,
  "height": 500,
  "alt_text": "Acme Corp Logo",
  "metadata": {
    "brand_id": 123,
    "version": 2
  },
  "status": "ready",
  "collection_id": 5,
  "tenant_id": 1,
  "created_by": 10,
  "created_at": "2026-02-18T10:30:00.000Z",
  "updated_at": "2026-02-18T10:30:00.000Z"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "File is required"
}
```
```json
{
  "statusCode": 400,
  "message": "File type image/bmp is not allowed. Allowed types: image/jpeg, image/png, image/webp"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Collection not found"
}
```

**413 Payload Too Large**
```json
{
  "statusCode": 413,
  "message": "File size 3145728 bytes exceeds maximum 2097152 bytes"
}
```

**422 Unprocessable Entity**
```json
{
  "statusCode": 422,
  "message": "Collection has reached maximum of 20 items"
}
```

#### Required Role
- `editor` ou superior

#### Example Request (cURL)
```bash
curl -X POST \
  'https://api.example.com/api/cms/media' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'x-tenant-id: tenant-123' \
  -F 'file=@/path/to/logo.png' \
  -F 'collection_id=5' \
  -F 'alt_text=Acme Corp Logo' \
  -F 'metadata={"brand_id":123,"version":2}'
```

---

### 2. List Media Assets

**GET** `/api/cms/media`

Lista assets com filtros opcionais.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| collection_id | integer | No | Filtrar por collection |
| status | string | No | Filtrar por status (ready, processing, failed, archived) |
| mime_type | string | No | Filtrar por tipo MIME |

#### Responses

**200 OK**
```json
[
  {
    "id": 123,
    "url": "https://storage.example.com/cms/brands/123/logo.webp",
    "storage_key": "cms/brands/123/logo.webp",
    "filename": "acme-logo.webp",
    "mime_type": "image/webp",
    "file_size": 45678,
    "width": 500,
    "height": 500,
    "alt_text": "Acme Corp Logo",
    "metadata": { "brand_id": 123 },
    "status": "ready",
    "collection_id": 5,
    "created_at": "2026-02-18T10:30:00.000Z"
  }
]
```

#### Required Role
- `viewer` ou superior

#### Example Request (cURL)
```bash
curl -X GET \
  'https://api.example.com/api/cms/media?collection_id=5&status=ready' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'x-tenant-id: tenant-123'
```

---

### 3. Get Media Asset

**GET** `/api/cms/media/:id`

Busca um asset específico por ID.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | ID do asset |

#### Responses

**200 OK**
```json
{
  "id": 123,
  "url": "https://storage.example.com/cms/brands/123/logo.webp",
  "storage_key": "cms/brands/123/logo.webp",
  "filename": "acme-logo.webp",
  "mime_type": "image/webp",
  "file_size": 45678,
  "width": 500,
  "height": 500,
  "alt_text": "Acme Corp Logo",
  "metadata": { "brand_id": 123 },
  "status": "ready",
  "collection_id": 5,
  "tenant_id": 1,
  "created_by": 10,
  "created_at": "2026-02-18T10:30:00.000Z",
  "updated_at": "2026-02-18T10:30:00.000Z"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Media asset not found"
}
```

#### Required Role
- `viewer` ou superior

---

### 4. Update Media Metadata

**PATCH** `/api/cms/media/:id`

Atualiza metadados de um asset (alt_text, metadata).

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
Content-Type: application/json
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | ID do asset |

#### Request Body
```json
{
  "alt_text": "Updated alt text",
  "metadata": {
    "brand_id": 123,
    "version": 3,
    "updated_reason": "Rebranding"
  }
}
```

#### Responses

**200 OK**
```json
{
  "id": 123,
  "url": "https://storage.example.com/cms/brands/123/logo.webp",
  "alt_text": "Updated alt text",
  "metadata": {
    "brand_id": 123,
    "version": 3,
    "updated_reason": "Rebranding"
  },
  "updated_at": "2026-02-18T11:00:00.000Z"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Media asset not found"
}
```

#### Required Role
- `editor` ou superior

---

### 5. Delete Media Asset

**DELETE** `/api/cms/media/:id`

Remove um asset. O arquivo é deletado do storage e todas as relações são removidas.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | ID do asset |

#### Business Rules
- Asset é removido permanentemente do storage
- Todas as relações (MediaAssetRelation) são deletadas em cascata
- Operação irreversível

#### Responses

**200 OK**
```json
{
  "message": "Media asset deleted successfully"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Media asset not found"
}
```

#### Required Role
- `editor` ou superior

---

## COLLECTIONS

### 6. Create Collection

**POST** `/api/cms/collections`

Cria uma nova collection customizada.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "Product Images",
  "slug": "product-images",
  "description": "Product catalog images",
  "type": "image",
  "max_file_size": 5242880,
  "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
  "max_items": 10
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Nome da collection |
| slug | string | Yes | Slug único (kebab-case) |
| description | string | No | Descrição da collection |
| type | string | Yes | Tipo: image, document, video, audio, mixed |
| max_file_size | integer | No | Tamanho máximo em bytes |
| allowed_mime_types | string[] | No | Tipos MIME permitidos (suporta wildcards como 'image/*') |
| max_items | integer | No | Número máximo de itens |

#### Responses

**201 Created**
```json
{
  "id": 10,
  "name": "Product Images",
  "slug": "product-images",
  "description": "Product catalog images",
  "type": "image",
  "max_file_size": 5242880,
  "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
  "max_items": 10,
  "tenant_id": 1,
  "created_at": "2026-02-18T10:30:00.000Z"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Collection with slug 'product-images' already exists for this tenant"
}
```

#### Required Role
- `admin` ou superior

---

### 7. List Collections

**GET** `/api/cms/collections`

Lista todas as collections do tenant.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | Filtrar por tipo (image, document, video, audio, mixed) |

#### Responses

**200 OK**
```json
[
  {
    "id": 5,
    "name": "Brand Logos",
    "slug": "brand-logos",
    "type": "image",
    "max_file_size": 2097152,
    "allowed_mime_types": ["image/svg+xml", "image/png", "image/webp"],
    "max_items": 1,
    "asset_count": 45,
    "created_at": "2026-01-15T10:00:00.000Z"
  },
  {
    "id": 10,
    "name": "Product Images",
    "slug": "product-images",
    "type": "image",
    "max_file_size": 5242880,
    "max_items": 10,
    "asset_count": 120,
    "created_at": "2026-02-18T10:30:00.000Z"
  }
]
```

#### Required Role
- `viewer` ou superior

---

### 8. Get Collection

**GET** `/api/cms/collections/:id`

Busca uma collection específica.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | ID da collection |

#### Responses

**200 OK**
```json
{
  "id": 5,
  "name": "Brand Logos",
  "slug": "brand-logos",
  "description": "Corporate brand identity logos",
  "type": "image",
  "max_file_size": 2097152,
  "allowed_mime_types": ["image/svg+xml", "image/png", "image/webp"],
  "max_items": 1,
  "tenant_id": 1,
  "asset_count": 45,
  "created_at": "2026-01-15T10:00:00.000Z",
  "updated_at": "2026-01-15T10:00:00.000Z"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Collection not found"
}
```

#### Required Role
- `viewer` ou superior

---

### 9. Get Collection Assets

**GET** `/api/cms/collections/:id/assets`

Lista todos os assets de uma collection.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | ID da collection |

#### Responses

**200 OK**
```json
[
  {
    "id": 123,
    "url": "https://storage.example.com/cms/brands/123/logo.webp",
    "filename": "acme-logo.webp",
    "mime_type": "image/webp",
    "file_size": 45678,
    "alt_text": "Acme Corp Logo",
    "status": "ready",
    "created_at": "2026-02-18T10:30:00.000Z"
  }
]
```

#### Required Role
- `viewer` ou superior

---

## RELATIONS

### 10. Attach Asset to Entity

**POST** `/api/cms/relations/attach`

Vincula um asset a uma entidade de negócio.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
Content-Type: application/json
```

#### Request Body
```json
{
  "asset_id": 123,
  "entity_type": "brand",
  "entity_id": 456,
  "relation_type": "logo",
  "display_order": 1,
  "metadata": {
    "is_primary": true
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| asset_id | integer | Yes | ID do asset |
| entity_type | string | Yes | Tipo da entidade (article, brand, company, user, etc.) |
| entity_id | integer | Yes | ID da entidade |
| relation_type | string | Yes | Tipo de relação (gallery, featured, logo, avatar, attachment) |
| display_order | integer | No | Ordem de exibição |
| metadata | object | No | Metadados customizados |

#### Business Rules
- Asset deve existir
- Combinação (asset_id, entity_type, entity_id, relation_type) deve ser única
- Entity_type e relation_type são convertidos para lowercase

#### Responses

**201 Created**
```json
{
  "id": 789,
  "asset_id": 123,
  "entity_type": "brand",
  "entity_id": 456,
  "relation_type": "logo",
  "display_order": 1,
  "metadata": {
    "is_primary": true
  },
  "created_at": "2026-02-18T10:30:00.000Z"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Relation already exists"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Media asset not found"
}
```

#### Required Role
- `editor` ou superior

---

### 11. Detach Asset from Entity

**POST** `/api/cms/relations/detach`

Remove o vínculo entre um asset e uma entidade.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
Content-Type: application/json
```

#### Request Body
```json
{
  "asset_id": 123,
  "entity_type": "brand",
  "entity_id": 456,
  "relation_type": "logo"
}
```

#### Responses

**200 OK**
```json
{
  "message": "Asset detached successfully"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Relation not found"
}
```

#### Required Role
- `editor` ou superior

---

### 12. Get Entity Assets

**GET** `/api/cms/relations/:entityType/:entityId`

Busca todos os assets vinculados a uma entidade.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| entityType | string | Yes | Tipo da entidade (article, brand, company, user) |
| entityId | integer | Yes | ID da entidade |

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| relation_type | string | No | Filtrar por tipo de relação |

#### Responses

**200 OK**
```json
[
  {
    "id": 789,
    "asset": {
      "id": 123,
      "url": "https://storage.example.com/cms/brands/123/logo.webp",
      "filename": "acme-logo.webp",
      "mime_type": "image/webp",
      "file_size": 45678,
      "width": 500,
      "height": 500,
      "alt_text": "Acme Corp Logo"
    },
    "relation_type": "logo",
    "display_order": 1,
    "metadata": {
      "is_primary": true
    },
    "created_at": "2026-02-18T10:30:00.000Z"
  }
]
```

#### Required Role
- `viewer` ou superior

#### Example Request (cURL)
```bash
# Buscar todas as imagens de um artigo
curl -X GET \
  'https://api.example.com/api/cms/relations/article/456?relation_type=gallery' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'x-tenant-id: tenant-123'

# Buscar logo de uma marca
curl -X GET \
  'https://api.example.com/api/cms/relations/brand/789?relation_type=logo' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'x-tenant-id: tenant-123'
```

---

### 13. Reorder Entity Assets

**PUT** `/api/cms/relations/reorder`

Reordena os assets de uma entidade atualizando o campo `display_order`.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
Content-Type: application/json
```

#### Request Body
```json
{
  "entity_type": "article",
  "entity_id": 456,
  "order": [
    {
      "asset_id": 5,
      "display_order": 1
    },
    {
      "asset_id": 2,
      "display_order": 2
    },
    {
      "asset_id": 8,
      "display_order": 3
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| entity_type | string | Yes | Tipo da entidade |
| entity_id | integer | Yes | ID da entidade |
| order | array | Yes | Array de objetos com asset_id e display_order |
| order[].asset_id | integer | Yes | ID do asset |
| order[].display_order | integer | Yes | Nova posição (≥ 0) |

#### Business Rules
- Apenas assets vinculados à entidade especificada são reordenados
- Não é necessário incluir todos os assets da entidade
- `display_order` deve ser um número inteiro não-negativo

#### Responses

**200 OK**
```json
{
  "message": "Assets reordered successfully"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Invalid asset IDs or assets not related to entity"
}
```

#### Required Role
- `editor` ou superior

---

**POST** `/api/cms/articles/:articleId/images`

Faz upload de uma imagem para um artigo específico. A imagem é automaticamente processada e convertida para formato WebP para otimização.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
Content-Type: multipart/form-data
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| articleId | integer | Yes | ID do artigo |

#### Request Body (multipart/form-data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | binary | Yes | Arquivo de imagem (JPEG, PNG, GIF, WebP, AVIF). Máximo 10 MB |
| alt_text | string | No | Texto alternativo para acessibilidade. Máximo 255 caracteres |

#### Business Rules
- Máximo de 20 imagens por artigo
- Tamanho máximo do arquivo: 10 MB
- Formatos aceitos: JPEG, PNG, GIF, WebP, AVIF
- Imagens são automaticamente convertidas para WebP
- Qualidade de compressão configurável via `CMS_IMAGE_QUALITY` (padrão: 80)
- Display order é atribuído automaticamente (próximo número disponível)

#### Responses

**201 Created**
```json
{
  "id": 123,
  "url": "https://storage.example.com/cms/articles/45/1708345678901.webp",
  "storage_key": "cms/articles/45/1708345678901.webp",
  "alt_text": "Descrição da imagem",
  "display_order": 1,
  "file_size": 245678,
  "original_format": "jpeg",
  "article_id": 45,
  "created_at": "2026-02-18T10:30:00.000Z"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "File is required"
}
```
```json
{
  "statusCode": 400,
  "message": "Invalid file format. Allowed formats: JPEG, PNG, GIF, WebP, AVIF"
}
```

**403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Insufficient role. Required: editor"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Article not found"
}
```

**413 Payload Too Large**
```json
{
  "statusCode": 413,
  "message": "File size exceeds 10 MB limit"
}
```

**422 Unprocessable Entity**
```json
{
  "statusCode": 422,
  "message": "Article already has 20 images (maximum limit)"
}
```

#### Required Role
- `editor` ou superior

#### Example Request (cURL)
```bash
curl -X POST \
  'https://api.example.com/api/cms/articles/45/images' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'x-tenant-id: tenant-123' \
  -F 'file=@/path/to/image.jpg' \
  -F 'alt_text=Imagem ilustrativa do produto'
```

---

### 2. List Article Images

**GET** `/api/cms/articles/:articleId/images`

Lista todas as imagens de um artigo, ordenadas por `display_order`.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| articleId | integer | Yes | ID do artigo |

#### Responses

**200 OK**
```json
[
  {
    "id": 123,
    "url": "https://storage.example.com/cms/articles/45/1708345678901.webp",
    "storage_key": "cms/articles/45/1708345678901.webp",
    "alt_text": "Primeira imagem",
    "display_order": 1,
    "file_size": 245678,
    "original_format": "jpeg",
    "article_id": 45,
    "created_at": "2026-02-18T10:30:00.000Z"
  },
  {
    "id": 124,
    "url": "https://storage.example.com/cms/articles/45/1708345789012.webp",
    "storage_key": "cms/articles/45/1708345789012.webp",
    "alt_text": "Segunda imagem",
    "display_order": 2,
    "file_size": 189234,
    "original_format": "png",
    "article_id": 45,
    "created_at": "2026-02-18T10:32:00.000Z"
  }
]
```

**200 OK (Empty)**
```json
[]
```

#### Required Role
- `viewer` ou superior

#### Example Request (cURL)
```bash
curl -X GET \
  'https://api.example.com/api/cms/articles/45/images' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'x-tenant-id: tenant-123'
```

---

### 3. Delete Image

**DELETE** `/api/cms/articles/:articleId/images/:imageId`

Remove uma imagem específica do artigo. A imagem é deletada tanto do storage quanto do banco de dados.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| articleId | integer | Yes | ID do artigo |
| imageId | integer | Yes | ID da imagem a ser deletada |

#### Business Rules
- A imagem é removida permanentemente do storage (S3/similar)
- O registro é removido do banco de dados
- Não há reordenação automática das imagens restantes

#### Responses

**200 OK**
```json
{
  "message": "Image deleted successfully"
}
```

**403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Insufficient role. Required: editor"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Image not found"
}
```

#### Required Role
- `editor` ou superior

#### Example Request (cURL)
```bash
curl -X DELETE \
  'https://api.example.com/api/cms/articles/45/images/123' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'x-tenant-id: tenant-123'
```

---

### 4. Reorder Images

**PUT** `/api/cms/articles/:articleId/images/reorder`

Reordena as imagens de um artigo, atualizando o campo `display_order` de múltiplas imagens em uma única operação.

#### Headers
```
Authorization: Bearer {token}
x-tenant-id: {tenant_id}
Content-Type: application/json
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| articleId | integer | Yes | ID do artigo |

#### Request Body
```json
{
  "order": [
    {
      "id": 5,
      "display_order": 1
    },
    {
      "id": 2,
      "display_order": 2
    },
    {
      "id": 8,
      "display_order": 3
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| order | array | Yes | Array de objetos com id e display_order |
| order[].id | integer | Yes | ID da imagem |
| order[].display_order | integer | Yes | Nova posição de exibição (≥ 0) |

#### Business Rules
- Todos os IDs devem pertencer ao artigo especificado
- `display_order` deve ser um número inteiro não-negativo
- Não é necessário incluir todas as imagens do artigo
- Apenas as imagens especificadas terão seu `display_order` atualizado

#### Responses

**200 OK**
```json
{
  "message": "Images reordered successfully"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Invalid image IDs"
}
```

**403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Insufficient role. Required: editor"
}
```

#### Required Role
- `editor` ou superior

#### Example Request (cURL)
```bash
curl -X PUT \
  'https://api.example.com/api/cms/articles/45/images/reorder' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'x-tenant-id: tenant-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "order": [
      { "id": 5, "display_order": 1 },
      { "id": 2, "display_order": 2 },
      { "id": 8, "display_order": 3 }
    ]
  }'
```

---

## Data Models

### ArticleImage

| Field | Type | Description |
|-------|------|-------------|
| id | integer | ID único da imagem |
| url | string | URL pública da imagem no storage |
| storage_key | string | Chave/caminho da imagem no storage (ex: `cms/articles/45/1708345678901.webp`) |
| alt_text | string | Texto alternativo para acessibilidade (opcional, max 255 chars) |
| display_order | integer | Ordem de exibição da imagem no artigo |
| file_size | integer | Tamanho do arquivo em bytes (após processamento) |
| original_format | string | Formato original do arquivo enviado (jpeg, png, gif, webp, avif) |
| article_id | integer | ID do artigo ao qual a imagem pertence |
| created_at | datetime | Data/hora de criação do registro |

---

## Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Arquivo ausente ou formato inválido |
| 401 | UNAUTHORIZED | Token JWT ausente ou inválido |
| 403 | FORBIDDEN | Permissão insuficiente (role inadequada) |
| 404 | NOT_FOUND | Artigo ou imagem não encontrada |
| 413 | PAYLOAD_TOO_LARGE | Arquivo excede 10 MB |
| 422 | UNPROCESSABLE_ENTITY | Limite de 20 imagens por artigo atingido |
| 500 | INTERNAL_SERVER_ERROR | Erro no processamento ou storage |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| CMS_IMAGE_QUALITY | 80 | Qualidade de compressão WebP (0-100) |

---

## Storage Structure

As imagens são armazenadas seguindo a estrutura:

```
cms/
└── articles/
    └── {articleId}/
        └── {timestamp}.webp
```

Exemplo: `cms/articles/45/1708345678901.webp`

---

## Image Processing Pipeline

1. **Upload**: Cliente envia arquivo via multipart/form-data
2. **Validation**: Verifica formato, tamanho e limite de imagens
3. **Processing**: Converte para WebP com qualidade configurável
4. **Storage**: Upload para S3 ou storage provider configurado
5. **Database**: Salva metadados com URL pública e storage key
6. **Response**: Retorna objeto completo da imagem

---

## Best Practices

### Upload
- Sempre forneça `alt_text` para acessibilidade
- Otimize imagens antes do upload quando possível
- Use formatos modernos (WebP, AVIF) para melhor compressão

### Display Order
- Mantenha sequência contínua (1, 2, 3...) para facilitar manutenção
- Use a rota de reordenação para ajustes em lote

### Deletion
- Considere impacto em artigos publicados antes de deletar
- Não há soft delete - operação é permanente

### Performance
- Liste imagens apenas quando necessário
- Cache URLs de imagens no frontend
- Use lazy loading para imagens em listas

---

## Security Considerations

- Validação de tipo MIME no backend (não confia apenas na extensão)
- Limite de tamanho de arquivo aplicado em múltiplas camadas
- Storage keys não-previsíveis (timestamp)
- Autenticação e autorização em todas as rotas
- Tenant isolation via header `x-tenant-id`

---

## Testing

### Upload Test
```typescript
describe('POST /articles/:articleId/images', () => {
  it('should upload image successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/cms/articles/1/images')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', 'tenant-123')
      .attach('file', './test/fixtures/test-image.jpg')
      .field('alt_text', 'Test image');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('url');
    expect(response.body.original_format).toBe('jpeg');
  });
});
```

### Reorder Test
```typescript
describe('PUT /articles/:articleId/images/reorder', () => {
  it('should reorder images successfully', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/cms/articles/1/images/reorder')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', 'tenant-123')
      .send({
        order: [
          { id: 2, display_order: 1 },
          { id: 1, display_order: 2 },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Images reordered successfully');
  });
});
```

---

## Changelog

### Version 1.0.0 (2026-02-18)
- Initial documentation
- Upload, list, delete, and reorder endpoints
- WebP automatic conversion
- 20 images per article limit
- Role-based access control (viewer, editor)
