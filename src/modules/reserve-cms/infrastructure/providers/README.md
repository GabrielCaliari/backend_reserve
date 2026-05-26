# Storage Providers

Este diretório contém implementações de diferentes provedores de armazenamento para o módulo CMS.

## Providers Disponíveis

### 1. VercelBlobStorageProvider (Padrão)
Usa o Vercel Blob Storage para armazenar imagens.

**Variáveis de Ambiente:**
```env
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

**Características:**
- Armazenamento serverless otimizado
- CDN global automático
- Fácil integração com Vercel
- URLs públicas automáticas

### 2. S3StorageProvider
Usa AWS S3 ou serviços compatíveis (DigitalOcean Spaces, MinIO, etc.).

**Variáveis de Ambiente:**
```env
CMS_BUCKET_ENDPOINT=https://your-endpoint.com
CMS_BUCKET_ACCESS_KEY_ID=your_access_key
CMS_BUCKET_SECRET_ACCESS_KEY=your_secret_key
CMS_BUCKET_REGION=us-east-1
CMS_BUCKET_NAME=your-bucket-name
```

**Características:**
- Compatível com AWS S3 e alternativas
- Controle total sobre configuração
- Suporte a diferentes regiões
- ACL configurável

## Como Trocar de Provider

Para trocar o provider de armazenamento, edite o arquivo `src/modules/reserve-cms/reserve-cms.module.ts`:

```typescript
{
  provide: STORAGE_PROVIDER,
  useClass: VercelBlobStorageProvider, // Troque para S3StorageProvider se necessário
}
```

## Criando um Novo Provider

Para criar um novo provider de armazenamento:

1. Crie uma nova classe que implemente `IStorageProvider`
2. Implemente os métodos:
   - `upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult>`
   - `delete(key: string): Promise<void>`
   - `getPublicUrl(key: string): string`
3. Registre o provider no módulo

**Exemplo:**

```typescript
import { Injectable } from '@nestjs/common';
import { IStorageProvider, IUploadResult } from '../../domain/interfaces/storage.interface';

@Injectable()
export class MyCustomStorageProvider implements IStorageProvider {
  async upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult> {
    // Sua implementação aqui
  }

  async delete(key: string): Promise<void> {
    // Sua implementação aqui
  }

  getPublicUrl(key: string): string {
    // Sua implementação aqui
  }
}
```

## Interface IStorageProvider

```typescript
export interface IUploadResult {
  url: string;  // URL pública do arquivo
  key: string;  // Chave/caminho do arquivo no storage
}

export interface IStorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
```

## Notas Importantes

- Todos os providers devem retornar URLs públicas acessíveis
- As imagens são sempre convertidas para `.webp` antes do upload
- O `key` deve ser único para evitar sobrescrever arquivos existentes
- Implemente tratamento de erros apropriado em cada provider
