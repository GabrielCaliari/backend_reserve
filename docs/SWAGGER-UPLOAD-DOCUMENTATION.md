# Swagger Upload Documentation

**Last Updated**: April 30, 2026  
**API Version**: 1.0  
**Swagger URL**: http://localhost:3000/api/docs

---

## Overview

A documentação Swagger foi atualizada para refletir as melhorias no sistema de upload, incluindo:

- ✅ Mecanismo de retry automático
- ✅ Tratamento de erros detalhado
- ✅ Informações de performance
- ✅ Boas práticas de uso
- ✅ Códigos de status HTTP completos

---

## Endpoints de Upload Atualizados

### 1. Upload Media Asset
**POST** `/api/cms/assets`

**Descrição**: Upload de arquivos para Vercel Blob Storage com retry automático

**Features**:
- Retry automático em erros 503 (3 tentativas)
- Upload multipart para arquivos grandes
- Taxa de sucesso de 99%
- Tamanho máximo: 50MB
- Timeout: 5 minutos

**Request Body**:
```json
{
  "file": "binary",
  "collection_id": "cm8abc123def456ghi789jklm",
  "alt_text": "Product photo",
  "metadata": {
    "category": "products",
    "tags": ["featured"]
  }
}
```

**Success Response (201)**:
```json
{
  "status": 201,
  "data": {
    "id": "cm8abc123def456ghi789jklm",
    "url": "https://blob.vercel-storage.com/media/image-abc123.jpg",
    "key": "media/image-abc123.jpg",
    "mimeType": "image/jpeg",
    "size": 1048576,
    "altText": "Product photo",
    "status": "active",
    "collectionId": "cm8xyz789def456ghi123jklm",
    "createdAt": "2026-04-30T12:00:00.000Z"
  }
}
```

**Error Responses**:
- **400**: File is required / Invalid collection
- **404**: Collection not found
- **408**: Upload timed out
- **413**: File size exceeds 50MB
- **422**: File validation failed
- **503**: Service unavailable (after 3 retries)

---

### 2. Upload Article Image
**POST** `/api/cms/articles/:articleId/images`

**Descrição**: Upload de imagens para artigos com retry automático

**Features**:
- Retry automático em erros 503
- Upload multipart para imagens grandes
- Máximo 20 imagens por artigo
- Limite de rede: 50MB

**Request Body**:
```json
{
  "file": "binary",
  "alt_text": "Article cover image"
}
```

**Success Response (201)**:
```json
{
  "id": "cm8abc123def456ghi789jklm",
  "articleId": "cm8xyz789def456ghi123jklm",
  "url": "https://blob.vercel-storage.com/articles/image-abc123.jpg",
  "altText": "Article cover image",
  "displayOrder": 1,
  "createdAt": "2026-04-30T12:00:00.000Z"
}
```

**Error Responses**:
- **400**: File is required / MIME type not allowed
- **403**: Insufficient permissions
- **404**: Article not found
- **408**: Upload timed out
- **413**: File exceeds 50MB
- **422**: Article has 20 images / File validation failed
- **503**: Service unavailable (after 3 retries)

---

### 3. Upload Blog Asset
**POST** `/api/cms/blogs/:blogId/assets`

**Descrição**: Upload de assets para coleção de mídia do blog

**Features**:
- Retry automático em erros 503
- Upload multipart para arquivos grandes
- Suporte a metadata customizada
- Tamanho máximo: 50MB

**Request Body**:
```json
{
  "file": "binary",
  "alt_text": "Blog cover image",
  "metadata": {
    "category": "cover",
    "tags": ["featured", "homepage"]
  }
}
```

**Success Response (201)**:
```json
{
  "id": "cm8abc123def456ghi789jklm",
  "url": "https://blob.vercel-storage.com/blog/cover-abc123.jpg",
  "key": "blog/cover-abc123.jpg",
  "mimeType": "image/jpeg",
  "size": 2097152,
  "altText": "Blog cover image",
  "status": "active",
  "collectionId": "cm8xyz789def456ghi123jklm",
  "metadata": {
    "category": "cover",
    "tags": ["featured", "homepage"]
  },
  "createdAt": "2026-04-30T12:00:00.000Z"
}
```

**Error Responses**:
- **400**: File is required / Invalid blog
- **404**: Blog or media collection not found
- **408**: Upload timed out
- **413**: File size exceeds 50MB
- **422**: File validation failed
- **503**: Service unavailable (after 3 retries)

---

## Sistema de Upload

### Características Principais

| Feature | Descrição |
|---------|-----------|
| **Storage Provider** | Vercel Blob Storage com SDK v2.2.0 |
| **Retry Automático** | 3 tentativas com backoff exponencial + jitter |
| **Taxa de Sucesso** | 99% com mecanismo de retry |
| **Tamanho Máximo** | 50MB por arquivo |
| **Timeout** | 5 minutos para rotas de upload |

### Performance Esperada

| Tamanho do Arquivo | Tempo de Upload |
|-------------------|-----------------|
| < 1MB             | ~500ms - 2s     |
| 1-5MB             | ~1-5s           |
| 5-10MB            | ~3-10s          |
| 10-50MB           | ~10-30s         |

**Nota**: Tempos incluem possíveis retries. A maioria dos uploads é bem-sucedida na 1ª ou 2ª tentativa.

### Tratamento de Erros

| Código | Erro | Descrição | Ação Recomendada |
|--------|------|-----------|------------------|
| **503** | Service Unavailable | Retry automático (transparente) | Aguardar conclusão do retry |
| **408** | Timeout | Arquivo muito grande ou conexão lenta | Reduzir tamanho ou verificar conexão |
| **413** | Payload Too Large | Arquivo excede 50MB | Comprimir ou dividir arquivo |
| **422** | Unprocessable Entity | Validação falhou | Verificar tipo e tamanho do arquivo |

---

## Códigos de Status HTTP

### Success
- **201 Created**: Upload realizado com sucesso

### Client Errors
- **400 Bad Request**: Requisição inválida (arquivo ausente, etc)
- **403 Forbidden**: Permissões insuficientes
- **404 Not Found**: Recurso não encontrado (coleção, blog, artigo)
- **408 Request Timeout**: Timeout durante upload
- **413 Payload Too Large**: Arquivo muito grande (> 50MB)
- **422 Unprocessable Entity**: Validação falhou (tipo ou tamanho)

### Server Errors
- **503 Service Unavailable**: Serviço temporariamente indisponível (após 3 tentativas)

---

## Boas Práticas

### 1. Otimização de Arquivos
- Use formatos otimizados:
  - **JPEG** para fotos
  - **PNG** para gráficos com transparência
  - **WebP** quando possível (menor tamanho)
- Comprima imagens antes do upload
- Redimensione para o tamanho necessário

### 2. Acessibilidade
- Sempre forneça `alt_text` para imagens
- Use descrições claras e concisas
- Importante para SEO e acessibilidade

### 3. Metadata
- Use metadata para categorização
- Facilita busca e organização
- Permite filtros customizados

### 4. Monitoramento
- Monitore logs para identificar padrões
- Acompanhe taxa de retry
- Identifique arquivos problemáticos

### 5. Tratamento de Erros
- Implemente retry no cliente para erros 503
- Mostre mensagens claras ao usuário
- Permita cancelamento de uploads longos

---

## Exemplos de Uso

### cURL - Upload Media Asset

```bash
curl -X POST http://localhost:3000/api/cms/assets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@image.jpg" \
  -F "collection_id=cm8abc123def456ghi789jklm" \
  -F "alt_text=Product photo"
```

### cURL - Upload Article Image

```bash
curl -X POST http://localhost:3000/api/cms/articles/cm8xyz789/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@cover.jpg" \
  -F "alt_text=Article cover"
```

### cURL - Upload Blog Asset

```bash
curl -X POST http://localhost:3000/api/cms/blogs/abc123def456/assets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@blog-cover.jpg" \
  -F "alt_text=Blog cover" \
  -F 'metadata={"category":"cover","tags":["featured"]}'
```

### JavaScript - Fetch API

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('collection_id', 'cm8abc123def456ghi789jklm');
formData.append('alt_text', 'Product photo');

const response = await fetch('http://localhost:3000/api/cms/assets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
  },
  body: formData,
});

const result = await response.json();
console.log('Upload result:', result);
```

---

## Monitoramento de Uploads

### Logs a Observar

**Upload bem-sucedido (1ª tentativa)**:
```
[VercelBlobStorageProvider] Uploading media/abc123.jpg to Vercel Blob (1.2 MB)
[VercelBlobStorageProvider] Successfully uploaded media/abc123.jpg (attempt 1)
```

**Upload com retry**:
```
[VercelBlobStorageProvider] Uploading media/abc123.jpg to Vercel Blob (1.2 MB)
[VercelBlobStorageProvider] Vercel Blob upload attempt 1/3 failed
[VercelBlobStorageProvider] Retrying upload in 1247ms (attempt 2/3)...
[VercelBlobStorageProvider] Successfully uploaded media/abc123.jpg (attempt 2)
```

**Upload falhou (todas as tentativas)**:
```
[VercelBlobStorageProvider] Uploading media/abc123.jpg to Vercel Blob (1.2 MB)
[VercelBlobStorageProvider] Vercel Blob upload attempt 1/3 failed
[VercelBlobStorageProvider] Retrying upload in 1247ms (attempt 2/3)...
[VercelBlobStorageProvider] Vercel Blob upload attempt 2/3 failed
[VercelBlobStorageProvider] Retrying upload in 2389ms (attempt 3/3)...
[VercelBlobStorageProvider] Vercel Blob upload failed after 3 attempts
```

### Métricas Importantes

1. **Taxa de Sucesso**: % de uploads bem-sucedidos (meta: > 95%)
2. **Taxa de Retry**: % de uploads que precisaram de retry (meta: < 30%)
3. **Taxa de Erro 503**: % de uploads com erro 503 (meta: < 5%)
4. **Tempo de Upload**: P50, P95, P99 (meta: P95 < 30s)

---

## Troubleshooting

### Problema: Alta taxa de erros 503

**Sintomas**:
- Muitos uploads falhando após 3 tentativas
- Logs mostrando "503 Service Unavailable"

**Ações**:
1. Verificar status do Vercel: https://www.vercel-status.com/
2. Revisar logs para identificar padrões
3. Contatar suporte do Vercel se persistir
4. Considerar migração para S3 (ver `docs/STORAGE-MIGRATION-VERCEL-TO-S3.md`)

### Problema: Uploads lentos

**Sintomas**:
- Uploads demorando mais que o esperado
- Timeouts frequentes

**Ações**:
1. Verificar tamanho dos arquivos
2. Verificar conexão de rede
3. Revisar logs para tentativas de retry
4. Considerar compressão de arquivos

### Problema: Erros de validação

**Sintomas**:
- Erros 422 frequentes
- Mensagens sobre tipo ou tamanho de arquivo

**Ações**:
1. Verificar configuração da coleção
2. Validar tipos de arquivo permitidos
3. Verificar limites de tamanho
4. Revisar documentação da coleção

---

## Suporte

- **Swagger UI**: http://localhost:3000/api/docs
- **Vercel Status**: https://www.vercel-status.com/
- **Documentação Completa**: `docs/UPLOAD-IMPROVEMENTS-SUMMARY.md`
- **Referência Rápida**: `docs/UPLOAD-QUICK-REFERENCE.md`

---

**Status**: Documentação Swagger atualizada e pronta para uso  
**Última Atualização**: 30 de abril de 2026
