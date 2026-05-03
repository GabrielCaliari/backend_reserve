# Multipart Upload Flow - Backend Architecture

**Last Updated**: April 30, 2026  
**Storage Provider**: Vercel Blob Storage with SDK v2.2.0

---

## Overview

O backend processa uploads multipart em várias camadas, desde o parsing HTTP até o envio para o Vercel Blob Storage. Este documento detalha cada etapa do processo.

---

## Fluxo Completo do Upload

```
┌─────────────────────────────────────────────────────────────────┐
│  1. HTTP Request (multipart/form-data)                          │
│     Content-Type: multipart/form-data; boundary=----...         │
│     Body: file binary + metadata fields                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. NestJS Middleware (main.ts)                                 │
│     ├─ Detect upload route                                      │
│     ├─ Set timeout: 10 minutes                                  │
│     └─ Add stream error handlers                                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Upload Error Interceptor                                    │
│     ├─ Catch stream errors                                      │
│     ├─ Catch connection errors                                  │
│     └─ Provide detailed error messages                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Multer FileInterceptor                                      │
│     ├─ Parse multipart/form-data                                │
│     ├─ Extract file to memory buffer                            │
│     ├─ Validate file size (< 50MB)                              │
│     └─ Extract metadata fields                                  │
│                                                                  │
│     Output: Express.Multer.File                                 │
│     {                                                            │
│       fieldname: 'file',                                         │
│       originalname: 'image.png',                                 │
│       encoding: '7bit',                                          │
│       mimetype: 'image/png',                                     │
│       buffer: <Buffer ...>,  // File in memory                  │
│       size: 7500000          // 7.5 MB                          │
│     }                                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Controller (media-asset.controller.ts)                      │
│     ├─ Validate file exists                                     │
│     ├─ Validate buffer not empty                                │
│     ├─ Extract DTO (collection_id, alt_text, metadata)          │
│     └─ Call service layer                                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Service Layer (media-asset.service.ts)                      │
│     ├─ Validate collection UUID                                 │
│     ├─ Validate collection exists                               │
│     ├─ Validate file size against collection rules              │
│     ├─ Validate mime type against collection rules              │
│     ├─ Check collection item limit                              │
│     ├─ Process image (if image)                                 │
│     │  ├─ Get metadata (width, height)                          │
│     │  └─ Convert to WebP (quality: 80)                         │
│     ├─ Generate unique storage key                              │
│     │  Format: cms/{tenant}/{collection}/{timestamp}-{filename} │
│     └─ Call storage provider                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Storage Provider (vercel-blob-storage.provider.ts)          │
│     ├─ Validate token configured                                │
│     ├─ Validate buffer not empty                                │
│     ├─ Log upload start (file size)                             │
│     └─ Upload with retry mechanism                              │
│        │                                                         │
│        ├─ Attempt 1: Immediate                                  │
│        │  └─ Call Vercel Blob SDK put()                         │
│        │     with multipart: true                               │
│        │                                                         │
│        ├─ If 503 error: Wait 1-1.5s                             │
│        │  └─ Attempt 2: Retry                                   │
│        │                                                         │
│        ├─ If 503 error: Wait 2-2.5s                             │
│        │  └─ Attempt 3: Final retry                             │
│        │                                                         │
│        └─ Return result or throw error                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. Vercel Blob SDK (@vercel/blob v2.2.0)                       │
│     ├─ SDK built-in retry (automatic)                           │
│     ├─ Multipart upload for large files                         │
│     │  ├─ Split file into chunks (if > 5MB)                     │
│     │  ├─ Upload chunks in parallel                             │
│     │  └─ Combine chunks on server                              │
│     └─ Return public URL                                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. Vercel Blob Storage (Cloud)                                 │
│     ├─ Store file                                               │
│     ├─ Generate public URL                                      │
│     └─ Return URL to SDK                                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. Service Layer (continued)                                  │
│      ├─ Create MediaAsset entity                                │
│      ├─ Save to database (Prisma)                               │
│      └─ Return success response                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  11. Controller (continued)                                     │
│      ├─ Format response with presenter                          │
│      └─ Return HTTP 201 with asset data                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detalhamento por Camada

### 1. HTTP Request (Cliente → Servidor)

**Formato**:
```http
POST /api/cms/assets HTTP/1.1
Host: localhost:3000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
x-tenant-id: 1

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="image.png"
Content-Type: image/png

<binary data>
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="collection_id"

cm8abc123def456ghi789jklm
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="alt_text"

Product photo
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

### 2. Middleware (main.ts)

**Código**:
```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  const isUploadRoute = 
    req.path.includes('/upload') || 
    req.path.includes('/assets') || 
    req.path.includes('/images') ||
    req.path.includes('/articles/') && req.method === 'POST';

  if (isUploadRoute) {
    // Set 10-minute timeout
    req.setTimeout(10 * 60 * 1000);
    res.setTimeout(10 * 60 * 1000);
    
    // Add error handlers
    req.on('error', (error) => console.error('Request stream error:', error.message));
    res.on('error', (error) => console.error('Response stream error:', error.message));
  }
  
  next();
});
```

**Propósito**:
- Detectar rotas de upload automaticamente
- Configurar timeout generoso (10 minutos)
- Adicionar handlers de erro para streams

### 3. Upload Error Interceptor

**Código**:
```typescript
@Injectable()
export class UploadErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Add error handlers for streams
    request.on('error', (error) => this.logger.error('Request stream error', error));
    response.on('error', (error) => this.logger.error('Response stream error', error));

    return next.handle().pipe(
      catchError((error) => {
        // Handle specific error types
        if (this.isConnectionError(error)) {
          return throwError(() => ({
            statusCode: 503,
            message: 'Upload connection interrupted',
            error: 'CONNECTION_ERROR',
          }));
        }
        // ... other error types
      }),
    );
  }
}
```

**Propósito**:
- Capturar erros de stream (ECONNRESET, EPIPE, ETIMEDOUT)
- Fornecer mensagens de erro claras
- Logging detalhado para debugging

### 4. Multer FileInterceptor

**Configuração**:
```typescript
@UseInterceptors(
  UploadErrorInterceptor,
  FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  }),
)
```

**Processo**:
1. **Parse multipart/form-data**: Lê o boundary e separa os campos
2. **Extract file**: Lê o binário do arquivo para memória (buffer)
3. **Validate size**: Verifica se < 50MB (limite do Multer)
4. **Extract metadata**: Extrai campos como collection_id, alt_text

**Output**:
```typescript
interface Express.Multer.File {
  fieldname: string;        // 'file'
  originalname: string;     // 'image.png'
  encoding: string;         // '7bit'
  mimetype: string;         // 'image/png'
  buffer: Buffer;           // File content in memory
  size: number;             // File size in bytes
}
```

**Importante**: O arquivo é mantido **em memória** (buffer), não é salvo em disco.

### 5. Controller Layer

**Código**:
```typescript
async upload(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadMediaDTO,
  @CurrentAdmin() admin: CurrentAdminPayload,
  @Res() res: Response,
) {
  // Validate file exists
  if (!file) {
    throw new BadRequestException('File is required');
  }

  // Validate buffer not empty
  if (!file.buffer || file.size === 0) {
    throw new BadRequestException('Uploaded file is empty');
  }

  // Call service
  const result = await this.assetService.uploadAsset(
    file,
    dto,
    admin.tenant_id!,
    admin.admin_id,
  );

  return res.status(result.status).json({
    status: result.status,
    data: MediaAssetPresenter.present(result.data),
  });
}
```

**Validações**:
- ✅ Arquivo existe
- ✅ Buffer não está vazio
- ✅ DTO válido (collection_id, alt_text, metadata)

### 6. Service Layer

**Código**:
```typescript
async uploadAsset(
  file: Express.Multer.File,
  dto: UploadMediaDTO,
  tenantId: string,
  userId: string,
) {
  // 1. Validate collection
  const collection = await this.collectionRepo.findById(dto.collection_id, tenantId);
  if (!collection) return errorResponse(ERROR_COLLECTION_NOT_FOUND, 404);

  // 2. Validate file size against collection rules
  if (!collection.validateFileSize(file.size)) {
    return errorResponse(ERROR_FILE_SIZE_EXCEEDED, 422);
  }

  // 3. Validate mime type
  if (!collection.validateMimeType(file.mimetype)) {
    return errorResponse(ERROR_INVALID_FILE_TYPE, 422);
  }

  // 4. Check collection limit
  const currentCount = await this.assetRepo.countByCollection(dto.collection_id, tenantId);
  if (!collection.canAddMoreItems(currentCount)) {
    return errorResponse(ERROR_COLLECTION_LIMIT_EXCEEDED, 400);
  }

  // 5. Process image (if applicable)
  let processedBuffer = file.buffer;
  let finalMimeType = file.mimetype;

  if (file.mimetype.startsWith('image/')) {
    const metadata = await this.imageProcessor.getMetadata(file.buffer);
    const processed = await this.imageProcessor.processToWebp(file.buffer, 80);
    
    processedBuffer = processed.data;
    finalMimeType = 'image/webp';
  }

  // 6. Generate storage key
  const storageKey = `cms/${tenantId}/${collection.slug}/${timestamp}-${filename}`;

  // 7. Upload to storage provider
  const uploadResult = await this.storageProvider.upload(
    storageKey,
    processedBuffer,
    finalMimeType,
  );

  // 8. Save to database
  const asset = new MediaAsset({ ... });
  const saved = await this.assetRepo.create(asset, tenantId);

  return successResponse(saved, 201);
}
```

**Processamento de Imagem**:
- Extrai metadata (width, height)
- Converte para WebP (quality: 80)
- Reduz tamanho do arquivo (~30-50% menor)

### 7. Storage Provider (Vercel Blob)

**Código**:
```typescript
async upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult> {
  // Validate
  if (!this.token) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  if (!data || data.length === 0) throw new Error('Cannot upload empty buffer');

  const fileSizeMB = (data.length / 1024 / 1024).toFixed(2);
  this.logger.log(`Uploading ${key} to Vercel Blob (${fileSizeMB} MB)`);

  // Retry logic
  let lastError: any;
  for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
    try {
      // Call Vercel Blob SDK
      const blob = await put(key, data, {
        access: 'public',
        contentType,
        token: this.token,
        multipart: true,  // ← MULTIPART ENABLED
        addRandomSuffix: false,
      });

      this.logger.log(`Successfully uploaded ${key} (attempt ${attempt})`);
      return { url: blob.url, key: blob.url };
      
    } catch (error: any) {
      lastError = error;
      
      const is503Error = 
        error.message?.includes('503') || 
        error.message?.includes('unavailable');

      if (is503Error && attempt < this.MAX_RETRIES) {
        // Exponential backoff with jitter
        const baseDelay = this.INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        const jitter = Math.random() * this.MAX_JITTER;
        const delay = baseDelay + jitter;
        
        this.logger.log(`Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1})...`);
        await this.sleep(delay);
        continue;
      }
      
      break;
    }
  }

  // All retries failed
  throw new Error(`Vercel Blob upload failed: ${lastError.message}`);
}
```

**Multipart Upload**:
- `multipart: true` → SDK divide arquivo em chunks se > 5MB
- Chunks são enviados em paralelo
- Vercel Blob combina chunks no servidor
- Mais rápido e confiável para arquivos grandes

### 8. Vercel Blob SDK

**Processo Interno** (quando `multipart: true`):

```typescript
// Pseudocódigo do SDK
async function put(key, data, options) {
  if (options.multipart && data.length > 5 * 1024 * 1024) {
    // File > 5MB: Use multipart upload
    
    // 1. Initiate multipart upload
    const uploadId = await initiateMultipartUpload(key);
    
    // 2. Split file into 5MB chunks
    const chunks = splitIntoChunks(data, 5 * 1024 * 1024);
    
    // 3. Upload chunks in parallel
    const uploadPromises = chunks.map((chunk, index) => 
      uploadPart(uploadId, index + 1, chunk)
    );
    const parts = await Promise.all(uploadPromises);
    
    // 4. Complete multipart upload
    const result = await completeMultipartUpload(uploadId, parts);
    
    return result;
  } else {
    // File < 5MB: Single PUT request
    return await singleUpload(key, data);
  }
}
```

**Vantagens do Multipart**:
- ✅ Uploads paralelos (mais rápido)
- ✅ Retry individual de chunks (mais confiável)
- ✅ Menos chance de timeout
- ✅ Melhor para conexões instáveis

---

## Exemplo Prático: Arquivo de 7.15 MB

### Fluxo Detalhado

1. **Cliente envia**: 7.15 MB PNG
2. **Multer recebe**: Buffer de 7.15 MB em memória
3. **Service processa**: 
   - Converte para WebP
   - Tamanho reduzido para ~3-4 MB
4. **Storage Provider**:
   - Detecta arquivo > 5MB (antes da conversão)
   - Usa multipart upload
   - Divide em 2 chunks (5MB + restante)
5. **Vercel Blob SDK**:
   - Upload chunk 1 (5MB) em paralelo
   - Upload chunk 2 (2.15MB) em paralelo
   - Combina chunks no servidor
6. **Resultado**: URL pública do arquivo

### Tempo Estimado

| Etapa | Tempo |
|-------|-------|
| Multer parse | ~100-200ms |
| Image processing (WebP) | ~500-1000ms |
| Multipart upload (2 chunks) | ~2-4s |
| Database save | ~50-100ms |
| **Total** | **~3-6s** |

---

## Configuração do Multipart

### Vercel Blob Provider

```typescript
const blob = await put(key, data, {
  access: 'public',
  contentType,
  token: this.token,
  multipart: true,  // ← Habilita multipart
  addRandomSuffix: false,
});
```

### Quando o Multipart é Usado

O SDK decide automaticamente:
- **Arquivo < 5MB**: Single PUT request
- **Arquivo ≥ 5MB**: Multipart upload (chunks de 5MB)

### Não é Necessário Configurar Chunk Size

O SDK gerencia automaticamente:
- Tamanho dos chunks (5MB)
- Número de chunks
- Upload paralelo
- Combinação no servidor

---

## Troubleshooting

### Problema: Upload lento para arquivos grandes

**Causa**: Multipart pode não estar habilitado  
**Solução**: Verificar `multipart: true` no provider

### Problema: Timeout em arquivos > 10MB

**Causa**: Timeout muito curto  
**Solução**: Já configurado para 10 minutos

### Problema: Erro "Cannot upload empty buffer"

**Causa**: Buffer vazio ou corrompido  
**Solução**: Validar arquivo no cliente antes de enviar

---

## Conclusão

O backend processa multipart uploads de forma eficiente:

- ✅ **Multer**: Parse multipart/form-data para buffer em memória
- ✅ **Service**: Validação e processamento de imagem
- ✅ **Provider**: Upload com retry e multipart automático
- ✅ **SDK**: Divide arquivos grandes em chunks e envia em paralelo
- ✅ **Vercel Blob**: Combina chunks e retorna URL pública

**Resultado**: Upload rápido, confiável e resiliente para arquivos até 50MB.

---

**Status**: Multipart upload configurado e funcionando  
**Última Atualização**: 30 de abril de 2026
