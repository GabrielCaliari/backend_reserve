# Guia de Implementação UI - CMS Media Storage

## Visão Geral

Este guia explica como implementar as interfaces de usuário para o sistema de armazenamento de mídia do CMS usando Next.js 16, React Query (TanStack Query), e NextUI (Hero UI).

## Índice

1. [Conceitos e Arquitetura](#conceitos-e-arquitetura)
2. [Configuração Inicial](#configuração-inicial)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [API Client e Types](#api-client-e-types)
5. [React Query Hooks](#react-query-hooks)
6. [Componentes UI](#componentes-ui)
7. [Páginas e Fluxos](#páginas-e-fluxos)
8. [Exemplos Completos](#exemplos-completos)

---

## Conceitos e Arquitetura

### Entidades Principais

1. **Media Collection**: Agrupamento lógico de assets com regras de validação
   - Define tipos de arquivo permitidos (MIME types)
   - Define tamanho máximo de arquivo
   - Define limite de itens na coleção
   - Organiza assets por contexto (ex: "blog-images", "product-photos")

2. **Media Asset**: Arquivo individual armazenado
   - URL pública do arquivo
   - Metadados (dimensões, tamanho, tipo)
   - Alt text para acessibilidade
   - Metadata customizada (JSON)

3. **Media Relation**: Vínculo polimórfico entre asset e entidade
   - Permite anexar assets a qualquer entidade (artigos, produtos, etc.)
   - Suporta ordenação
   - Mantém histórico de anexos

### Fluxo de Dados

```
┌─────────────────┐
│  Collection     │
│  Management     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Asset Upload   │─────▶│  Vercel Blob │
│  & Management   │      │  Storage     │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│  Attach to      │
│  Entities       │
└─────────────────┘
```

---

## Configuração Inicial

### 1. Instalar Dependências

```bash
pnpm add @tanstack/react-query @nextui-org/react framer-motion
pnpm add axios
pnpm add -D @tanstack/react-query-devtools
```

### 2. Configurar Variáveis de Ambiente

```env
# .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_API_VERSION=v2
```

### 3. Configurar React Query Provider

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NextUIProvider } from '@nextui-org/react';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NextUIProvider>
        {children}
      </NextUIProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── (private)/
│   │   └── cms/
│   │       ├── media/
│   │       │   ├── page.tsx              # Lista de assets
│   │       │   ├── upload/
│   │       │   │   └── page.tsx          # Upload de assets
│   │       │   └── [id]/
│   │       │       └── page.tsx          # Detalhes do asset
│   │       └── collections/
│   │           ├── page.tsx              # Lista de collections
│   │           ├── new/
│   │           │   └── page.tsx          # Criar collection
│   │           └── [id]/
│   │               └── page.tsx          # Editar collection
│   ├── providers.tsx
│   └── layout.tsx
│
├── presentation/
│   ├── components/
│   │   └── organisms/
│   │       └── cms/
│   │           ├── asset-grid.view.tsx
│   │           ├── asset-upload.view.tsx
│   │           ├── collection-form.view.tsx
│   │           └── media-picker.view.tsx
│   └── pages/
│       └── cms/
│           ├── media-list.view.tsx
│           └── collection-list.view.tsx
│
├── server/
│   ├── api/
│   │   └── cms-client.ts                 # Axios instance
│   └── services/
│       ├── media-asset.service.ts
│       ├── media-collection.service.ts
│       └── media-relation.service.ts
│
├── lib/
│   └── hooks/
│       └── cms/
│           ├── use-assets.ts
│           ├── use-collections.ts
│           └── use-relations.ts
│
└── types/
    └── cms.type.ts
```

---

## API Client e Types

### Types Definition

```typescript
// types/cms.type.ts

export enum EAssetStatus {
  active = 'active',
  archived = 'archived',
  failed = 'failed',
}

export enum ECollectionType {
  images = 'images',
  documents = 'documents',
  videos = 'videos',
  mixed = 'mixed',
}

export interface MediaAsset {
  id: number;
  url: string;
  storage_key: string;
  filename: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  alt_text?: string;
  metadata?: Record<string, any>;
  status: EAssetStatus;
  collection_id: number;
  tenant_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface MediaCollection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: ECollectionType;
  allowed_mime_types: string[];
  max_file_size: number;
  max_items?: number;
  tenant_id: number;
  created_at: string;
  updated_at: string;
}

export interface MediaRelation {
  id: number;
  asset_id: number;
  entity_type: string;
  entity_id: number;
  display_order: number;
  metadata?: Record<string, any>;
  tenant_id: number;
  created_at: string;
  asset?: MediaAsset;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface UploadAssetDTO {
  file: File;
  collection_id: number;
  alt_text?: string;
  metadata?: Record<string, any>;
}

export interface CreateCollectionDTO {
  name: string;
  description?: string;
  type: ECollectionType;
  allowed_mime_types: string[];
  max_file_size: number;
  max_items?: number;
}

export interface AttachMediaDTO {
  asset_id: number;
  entity_type: string;
  entity_id: number;
  display_order?: number;
  metadata?: Record<string, any>;
}
```

### API Client

```typescript
// server/api/cms-client.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v2';

export const cmsClient = axios.create({
  baseURL: `${API_URL}/api/cms`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para adicionar token
cmsClient.interceptors.request.use(
  (config) => {
    // Assumindo que o token está no localStorage ou cookie
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor para tratamento de erros
cmsClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Redirecionar para login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## React Query Hooks

### Assets Hooks

```typescript
// lib/hooks/cms/use-assets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cmsClient } from '@/server/api/cms-client';
import type {
  MediaAsset,
  PaginatedResponse,
  UploadAssetDTO,
  EAssetStatus,
} from '@/types/cms.type';

// Query Keys
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: AssetFilters) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: number) => [...assetKeys.details(), id] as const,
};

interface AssetFilters {
  collection_id?: number;
  status?: EAssetStatus;
  mime_type?: string;
  page?: number;
  limit?: number;
}

// List Assets
export function useAssets(filters: AssetFilters = {}) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.collection_id) params.append('collection_id', String(filters.collection_id));
      if (filters.status) params.append('status', filters.status);
      if (filters.mime_type) params.append('mime_type', filters.mime_type);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const response = await cmsClient.get<PaginatedResponse<MediaAsset>>(
        `/assets?${params.toString()}`
      );
      return response.data;
    },
  });
}

// Get Asset by ID
export function useAsset(id: number) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: async () => {
      const response = await cmsClient.get<{ data: MediaAsset }>(`/assets/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

// Upload Asset
export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadAssetDTO) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('collection_id', String(data.collection_id));
      if (data.alt_text) formData.append('alt_text', data.alt_text);
      if (data.metadata) formData.append('metadata', JSON.stringify(data.metadata));

      const response = await cmsClient.post<{ data: MediaAsset }>('/assets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

// Update Asset
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      alt_text,
      metadata,
    }: {
      id: number;
      alt_text?: string;
      metadata?: Record<string, any>;
    }) => {
      const response = await cmsClient.patch<{ data: MediaAsset }>(`/assets/${id}`, {
        alt_text,
        metadata,
      });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

// Delete Asset
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await cmsClient.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}
```

### Collections Hooks

```typescript
// lib/hooks/cms/use-collections.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cmsClient } from '@/server/api/cms-client';
import type {
  MediaCollection,
  PaginatedResponse,
  CreateCollectionDTO,
  ECollectionType,
} from '@/types/cms.type';

// Query Keys
export const collectionKeys = {
  all: ['collections'] as const,
  lists: () => [...collectionKeys.all, 'list'] as const,
  list: (filters: CollectionFilters) => [...collectionKeys.lists(), filters] as const,
  details: () => [...collectionKeys.all, 'detail'] as const,
  detail: (id: number) => [...collectionKeys.details(), id] as const,
};

interface CollectionFilters {
  type?: ECollectionType;
  page?: number;
  limit?: number;
}

// List Collections
export function useCollections(filters: CollectionFilters = {}) {
  return useQuery({
    queryKey: collectionKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const response = await cmsClient.get<PaginatedResponse<MediaCollection>>(
        `/collections?${params.toString()}`
      );
      return response.data;
    },
  });
}

// Get Collection by ID
export function useCollection(id: number) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: async () => {
      const response = await cmsClient.get<{ data: MediaCollection }>(`/collections/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

// Create Collection
export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCollectionDTO) => {
      const response = await cmsClient.post<{ data: MediaCollection }>('/collections', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() });
    },
  });
}

// Update Collection
export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateCollectionDTO>;
    }) => {
      const response = await cmsClient.patch<{ data: MediaCollection }>(
        `/collections/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() });
    },
  });
}

// Delete Collection
export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await cmsClient.delete(`/collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() });
    },
  });
}
```



### Relations Hooks

```typescript
// lib/hooks/cms/use-relations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cmsClient } from '@/server/api/cms-client';
import type { MediaRelation, AttachMediaDTO } from '@/types/cms.type';

// Query Keys
export const relationKeys = {
  all: ['relations'] as const,
  lists: () => [...relationKeys.all, 'list'] as const,
  list: (entityType: string, entityId: number) =>
    [...relationKeys.lists(), entityType, entityId] as const,
};

// List Relations for Entity
export function useEntityRelations(entityType: string, entityId: number) {
  return useQuery({
    queryKey: relationKeys.list(entityType, entityId),
    queryFn: async () => {
      const response = await cmsClient.get<{ data: MediaRelation[] }>(
        `/relations?entity_type=${entityType}&entity_id=${entityId}`
      );
      return response.data.data;
    },
    enabled: !!entityType && !!entityId,
  });
}

// Attach Media to Entity
export function useAttachMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AttachMediaDTO) => {
      const response = await cmsClient.post<{ data: MediaRelation }>('/relations', data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: relationKeys.list(variables.entity_type, variables.entity_id),
      });
    },
  });
}

// Detach Media from Entity
export function useDetachMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationId: number) => {
      await cmsClient.delete(`/relations/${relationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationKeys.lists() });
    },
  });
}

// Reorder Media Relations
export function useReorderMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { relation_ids: number[] }) => {
      await cmsClient.patch('/relations/reorder', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: relationKeys.lists() });
    },
  });
}
```

---

## Componentes UI

### Asset Grid Component

```typescript
// presentation/components/organisms/cms/asset-grid.view.tsx
'use client';

import { Card, CardBody, Image, Button, Chip, Spinner } from '@nextui-org/react';
import { Trash2, Edit, Download } from 'lucide-react';
import type { MediaAsset } from '@/types/cms.type';

interface AssetGridProps {
  assets: MediaAsset[];
  isLoading?: boolean;
  onSelect?: (asset: MediaAsset) => void;
  onDelete?: (id: number) => void;
  onEdit?: (asset: MediaAsset) => void;
  selectable?: boolean;
  selectedIds?: number[];
}

export function AssetGrid({
  assets,
  isLoading,
  onSelect,
  onDelete,
  onEdit,
  selectable = false,
  selectedIds = [],
}: AssetGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum asset encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {assets.map((asset) => {
        const isSelected = selectedIds.includes(asset.id);
        const isImage = asset.mime_type.startsWith('image/');

        return (
          <Card
            key={asset.id}
            isPressable={selectable}
            isHoverable
            className={`${isSelected ? 'ring-2 ring-primary' : ''}`}
            onPress={() => selectable && onSelect?.(asset)}
          >
            <CardBody className="p-0">
              {/* Preview */}
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {isImage ? (
                  <Image
                    src={asset.url}
                    alt={asset.alt_text || asset.filename}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-4xl text-gray-400">📄</span>
                  </div>
                )}

                {/* Status Badge */}
                {asset.status !== 'active' && (
                  <Chip
                    size="sm"
                    color={asset.status === 'failed' ? 'danger' : 'warning'}
                    className="absolute top-2 right-2"
                  >
                    {asset.status}
                  </Chip>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium truncate" title={asset.filename}>
                  {asset.filename}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {formatFileSize(asset.file_size)}
                  </span>
                  {asset.width && asset.height && (
                    <span className="text-xs text-gray-500">
                      {asset.width}×{asset.height}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {!selectable && (
                  <div className="flex gap-2 mt-3">
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="flat"
                        isIconOnly
                        onPress={() => onEdit(asset)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="flat"
                      isIconOnly
                      as="a"
                      href={asset.url}
                      download
                      target="_blank"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {onDelete && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        isIconOnly
                        onPress={() => onDelete(asset.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
```

### Asset Upload Component

```typescript
// presentation/components/organisms/cms/asset-upload.view.tsx
'use client';

import { useState, useCallback } from 'react';
import { Card, CardBody, Button, Progress, Select, SelectItem, Input } from '@nextui-org/react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useUploadAsset } from '@/lib/hooks/cms/use-assets';
import { useCollections } from '@/lib/hooks/cms/use-collections';
import type { MediaCollection } from '@/types/cms.type';

interface UploadFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  altText?: string;
}

interface AssetUploadProps {
  collectionId?: number;
  onSuccess?: () => void;
}

export function AssetUpload({ collectionId: initialCollectionId, onSuccess }: AssetUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | undefined>(
    initialCollectionId
  );

  const { data: collectionsData } = useCollections({ limit: 100 });
  const uploadMutation = useUploadAsset();

  const selectedCollection = collectionsData?.data.find(
    (c) => c.id === selectedCollectionId
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: selectedCollection
      ? selectedCollection.allowed_mime_types.reduce((acc, type) => {
          acc[type] = [];
          return acc;
        }, {} as Record<string, string[]>)
      : undefined,
    maxSize: selectedCollection?.max_file_size,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateAltText = (index: number, altText: string) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles[index].altText = altText;
      return newFiles;
    });
  };

  const uploadAll = async () => {
    if (!selectedCollectionId) {
      alert('Selecione uma coleção');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      if (fileData.status !== 'pending') continue;

      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[i].status = 'uploading';
        return newFiles;
      });

      try {
        await uploadMutation.mutateAsync({
          file: fileData.file,
          collection_id: selectedCollectionId,
          alt_text: fileData.altText,
        });

        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[i].status = 'success';
          newFiles[i].progress = 100;
          return newFiles;
        });
      } catch (error: any) {
        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[i].status = 'error';
          newFiles[i].error = error.response?.data?.message || 'Erro ao fazer upload';
          return newFiles;
        });
      }
    }

    onSuccess?.();
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Collection Selector */}
      <Select
        label="Coleção"
        placeholder="Selecione uma coleção"
        selectedKeys={selectedCollectionId ? [String(selectedCollectionId)] : []}
        onChange={(e) => setSelectedCollectionId(Number(e.target.value))}
        isRequired
      >
        {collectionsData?.data.map((collection) => (
          <SelectItem key={collection.id} value={collection.id}>
            {collection.name}
          </SelectItem>
        ))}
      </Select>

      {/* Collection Info */}
      {selectedCollection && (
        <Card>
          <CardBody>
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Tipos permitidos:</span>{' '}
                {selectedCollection.allowed_mime_types.join(', ')}
              </p>
              <p>
                <span className="font-medium">Tamanho máximo:</span>{' '}
                {formatFileSize(selectedCollection.max_file_size)}
              </p>
              {selectedCollection.max_items && (
                <p>
                  <span className="font-medium">Limite de itens:</span>{' '}
                  {selectedCollection.max_items}
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${!selectedCollectionId ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={!selectedCollectionId} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg">Solte os arquivos aqui...</p>
        ) : (
          <div>
            <p className="text-lg mb-2">Arraste arquivos aqui ou clique para selecionar</p>
            <p className="text-sm text-gray-500">
              {selectedCollection
                ? `Aceita: ${selectedCollection.allowed_mime_types.join(', ')}`
                : 'Selecione uma coleção primeiro'}
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Arquivos ({files.length}) - {successCount} enviados
            </h3>
            {pendingCount > 0 && (
              <Button color="primary" onPress={uploadAll} isLoading={uploadMutation.isPending}>
                Enviar Todos ({pendingCount})
              </Button>
            )}
          </div>

          {files.map((fileData, index) => (
            <Card key={index}>
              <CardBody>
                <div className="flex gap-4">
                  {/* Preview */}
                  <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                    {fileData.file.type.startsWith('image/') ? (
                      <img
                        src={fileData.preview}
                        alt={fileData.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-2xl">📄</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fileData.file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(fileData.file.size)}
                        </p>
                      </div>

                      {/* Status Icon */}
                      <div>
                        {fileData.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                        {fileData.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-danger" />
                        )}
                        {fileData.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            onPress={() => removeFile(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Alt Text Input */}
                    {fileData.status === 'pending' && fileData.file.type.startsWith('image/') && (
                      <Input
                        size="sm"
                        placeholder="Texto alternativo (opcional)"
                        value={fileData.altText || ''}
                        onChange={(e) => updateAltText(index, e.target.value)}
                        className="mt-2"
                      />
                    )}

                    {/* Progress */}
                    {fileData.status === 'uploading' && (
                      <Progress value={fileData.progress} className="mt-2" />
                    )}

                    {/* Error */}
                    {fileData.status === 'error' && (
                      <p className="text-sm text-danger mt-2">{fileData.error}</p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
```



### Media Picker Component (Modal)

```typescript
// presentation/components/organisms/cms/media-picker.view.tsx
'use client';

import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Tabs,
  Tab,
  Select,
  SelectItem,
  Input,
} from '@nextui-org/react';
import { Search } from 'lucide-react';
import { AssetGrid } from './asset-grid.view';
import { AssetUpload } from './asset-upload.view';
import { useAssets } from '@/lib/hooks/cms/use-assets';
import { useCollections } from '@/lib/hooks/cms/use-collections';
import type { MediaAsset, EAssetStatus } from '@/types/cms.type';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assets: MediaAsset[]) => void;
  multiple?: boolean;
  collectionId?: number;
  mimeTypeFilter?: string;
}

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  collectionId,
  mimeTypeFilter,
}: MediaPickerProps) {
  const [selectedTab, setSelectedTab] = useState<'browse' | 'upload'>('browse');
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [filters, setFilters] = useState({
    collection_id: collectionId,
    mime_type: mimeTypeFilter,
    search: '',
    page: 1,
  });

  const { data: assetsData, isLoading } = useAssets({
    ...filters,
    limit: 20,
  });

  const { data: collectionsData } = useCollections({ limit: 100 });

  const handleSelectAsset = (asset: MediaAsset) => {
    if (multiple) {
      setSelectedAssets((prev) => {
        const exists = prev.find((a) => a.id === asset.id);
        if (exists) {
          return prev.filter((a) => a.id !== asset.id);
        }
        return [...prev, asset];
      });
    } else {
      setSelectedAssets([asset]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedAssets);
    setSelectedAssets([]);
    onClose();
  };

  const handleUploadSuccess = () => {
    setSelectedTab('browse');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[90vh]',
      }}
    >
      <ModalContent>
        <ModalHeader>
          <h2 className="text-xl font-semibold">
            Selecionar Mídia {multiple && `(${selectedAssets.length} selecionados)`}
          </h2>
        </ModalHeader>

        <ModalBody>
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as 'browse' | 'upload')}
          >
            <Tab key="browse" title="Navegar">
              <div className="space-y-4 py-4">
                {/* Filters */}
                <div className="flex gap-4">
                  <Input
                    placeholder="Buscar por nome..."
                    startContent={<Search className="w-4 h-4" />}
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
                    }
                    className="flex-1"
                  />

                  <Select
                    placeholder="Todas as coleções"
                    selectedKeys={filters.collection_id ? [String(filters.collection_id)] : []}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        collection_id: e.target.value ? Number(e.target.value) : undefined,
                        page: 1,
                      }))
                    }
                    className="w-64"
                  >
                    <SelectItem key="" value="">
                      Todas as coleções
                    </SelectItem>
                    {collectionsData?.data.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Asset Grid */}
                <AssetGrid
                  assets={assetsData?.data || []}
                  isLoading={isLoading}
                  selectable
                  selectedIds={selectedAssets.map((a) => a.id)}
                  onSelect={handleSelectAsset}
                />

                {/* Pagination */}
                {assetsData && assetsData.meta.total_pages > 1 && (
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      isDisabled={filters.page === 1}
                      onPress={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-4">
                      Página {filters.page} de {assetsData.meta.total_pages}
                    </span>
                    <Button
                      size="sm"
                      isDisabled={filters.page === assetsData.meta.total_pages}
                      onPress={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="upload" title="Upload">
              <div className="py-4">
                <AssetUpload
                  collectionId={collectionId}
                  onSuccess={handleUploadSuccess}
                />
              </div>
            </Tab>
          </Tabs>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            color="primary"
            onPress={handleConfirm}
            isDisabled={selectedAssets.length === 0}
          >
            Selecionar {selectedAssets.length > 0 && `(${selectedAssets.length})`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

### Collection Form Component

```typescript
// presentation/components/organisms/cms/collection-form.view.tsx
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Input,
  Textarea,
  Select,
  SelectItem,
  Button,
  Chip,
  Card,
  CardBody,
} from '@nextui-org/react';
import { X } from 'lucide-react';
import { ECollectionType } from '@/types/cms.type';
import type { CreateCollectionDTO } from '@/types/cms.type';

const collectionSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  type: z.nativeEnum(ECollectionType),
  allowed_mime_types: z.array(z.string()).min(1, 'Adicione pelo menos um tipo de arquivo'),
  max_file_size: z.number().min(1024, 'Tamanho mínimo: 1KB').max(52428800, 'Tamanho máximo: 50MB'),
  max_items: z.number().optional(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

interface CollectionFormProps {
  initialData?: Partial<CreateCollectionDTO>;
  onSubmit: (data: CreateCollectionDTO) => void;
  isLoading?: boolean;
}

const COMMON_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime'],
};

export function CollectionForm({ initialData, onSubmit, isLoading }: CollectionFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      type: initialData?.type || ECollectionType.mixed,
      allowed_mime_types: initialData?.allowed_mime_types || [],
      max_file_size: initialData?.max_file_size || 10485760, // 10MB default
      max_items: initialData?.max_items,
    },
  });

  const selectedType = watch('type');
  const allowedMimeTypes = watch('allowed_mime_types');

  const addMimeType = (mimeType: string) => {
    if (!allowedMimeTypes.includes(mimeType)) {
      setValue('allowed_mime_types', [...allowedMimeTypes, mimeType]);
    }
  };

  const removeMimeType = (mimeType: string) => {
    setValue(
      'allowed_mime_types',
      allowedMimeTypes.filter((t) => t !== mimeType)
    );
  };

  const addCommonTypes = () => {
    const types = COMMON_MIME_TYPES[selectedType as keyof typeof COMMON_MIME_TYPES] || [];
    const newTypes = [...new Set([...allowedMimeTypes, ...types])];
    setValue('allowed_mime_types', newTypes);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Nome da Coleção"
            placeholder="Ex: Imagens do Blog"
            isRequired
            isInvalid={!!errors.name}
            errorMessage={errors.name?.message}
          />
        )}
      />

      {/* Description */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            label="Descrição"
            placeholder="Descreva o propósito desta coleção..."
            minRows={3}
          />
        )}
      />

      {/* Type */}
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <Select
            {...field}
            label="Tipo de Coleção"
            placeholder="Selecione o tipo"
            isRequired
            selectedKeys={[field.value]}
            onChange={(e) => field.onChange(e.target.value)}
          >
            <SelectItem key={ECollectionType.images} value={ECollectionType.images}>
              Imagens
            </SelectItem>
            <SelectItem key={ECollectionType.documents} value={ECollectionType.documents}>
              Documentos
            </SelectItem>
            <SelectItem key={ECollectionType.videos} value={ECollectionType.videos}>
              Vídeos
            </SelectItem>
            <SelectItem key={ECollectionType.mixed} value={ECollectionType.mixed}>
              Misto
            </SelectItem>
          </Select>
        )}
      />

      {/* Allowed MIME Types */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Tipos de Arquivo Permitidos *
        </label>

        <div className="space-y-3">
          <Button size="sm" variant="flat" onPress={addCommonTypes}>
            Adicionar tipos comuns para {selectedType}
          </Button>

          <Card>
            <CardBody>
              {allowedMimeTypes.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum tipo adicionado</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allowedMimeTypes.map((type) => (
                    <Chip
                      key={type}
                      onClose={() => removeMimeType(type)}
                      variant="flat"
                    >
                      {type}
                    </Chip>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Input
            placeholder="Ex: image/jpeg"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.currentTarget;
                if (input.value) {
                  addMimeType(input.value);
                  input.value = '';
                }
              }
            }}
            description="Digite um MIME type e pressione Enter"
          />
        </div>

        {errors.allowed_mime_types && (
          <p className="text-sm text-danger mt-1">{errors.allowed_mime_types.message}</p>
        )}
      </div>

      {/* Max File Size */}
      <Controller
        name="max_file_size"
        control={control}
        render={({ field }) => (
          <div>
            <Input
              {...field}
              type="number"
              label="Tamanho Máximo do Arquivo (bytes)"
              placeholder="10485760"
              isRequired
              isInvalid={!!errors.max_file_size}
              errorMessage={errors.max_file_size?.message}
              onChange={(e) => field.onChange(Number(e.target.value))}
              value={String(field.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              Atual: {formatFileSize(field.value)}
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="flat" onPress={() => field.onChange(5242880)}>
                5 MB
              </Button>
              <Button size="sm" variant="flat" onPress={() => field.onChange(10485760)}>
                10 MB
              </Button>
              <Button size="sm" variant="flat" onPress={() => field.onChange(52428800)}>
                50 MB
              </Button>
            </div>
          </div>
        )}
      />

      {/* Max Items */}
      <Controller
        name="max_items"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type="number"
            label="Limite de Itens (opcional)"
            placeholder="Deixe vazio para ilimitado"
            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
            value={field.value ? String(field.value) : ''}
          />
        )}
      />

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" color="primary" isLoading={isLoading}>
          {initialData ? 'Atualizar' : 'Criar'} Coleção
        </Button>
      </div>
    </form>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
```

---

## Páginas e Fluxos

### Media List Page

```typescript
// app/(private)/cms/media/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Select,
  SelectItem,
  Input,
  Pagination,
  Card,
  CardBody,
} from '@nextui-org/react';
import { Upload, Search, Filter } from 'lucide-react';
import { AssetGrid } from '@/presentation/components/organisms/cms/asset-grid.view';
import { useAssets, useDeleteAsset } from '@/lib/hooks/cms/use-assets';
import { useCollections } from '@/lib/hooks/cms/use-collections';
import { EAssetStatus } from '@/types/cms.type';

export default function MediaListPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    collection_id: undefined as number | undefined,
    status: undefined as EAssetStatus | undefined,
    search: '',
    page: 1,
    limit: 20,
  });

  const { data: assetsData, isLoading } = useAssets(filters);
  const { data: collectionsData } = useCollections({ limit: 100 });
  const deleteMutation = useDeleteAsset();

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este asset?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca de Mídia</h1>
          <p className="text-gray-600 mt-1">
            Gerencie seus arquivos e imagens
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Upload className="w-4 h-4" />}
          onPress={() => router.push('/cms/media/upload')}
        >
          Upload
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por nome..."
              startContent={<Search className="w-4 h-4" />}
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
              }
              className="flex-1"
            />

            <Select
              placeholder="Todas as coleções"
              startContent={<Filter className="w-4 h-4" />}
              selectedKeys={filters.collection_id ? [String(filters.collection_id)] : []}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  collection_id: e.target.value ? Number(e.target.value) : undefined,
                  page: 1,
                }))
              }
              className="w-64"
            >
              <SelectItem key="" value="">
                Todas as coleções
              </SelectItem>
              {collectionsData?.data.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              placeholder="Todos os status"
              selectedKeys={filters.status ? [filters.status] : []}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as EAssetStatus | undefined,
                  page: 1,
                }))
              }
              className="w-48"
            >
              <SelectItem key="" value="">
                Todos os status
              </SelectItem>
              <SelectItem key={EAssetStatus.active} value={EAssetStatus.active}>
                Ativo
              </SelectItem>
              <SelectItem key={EAssetStatus.archived} value={EAssetStatus.archived}>
                Arquivado
              </SelectItem>
              <SelectItem key={EAssetStatus.failed} value={EAssetStatus.failed}>
                Falhou
              </SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      {assetsData && (
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Mostrando {assetsData.data.length} de {assetsData.meta.total} assets
          </p>
        </div>
      )}

      {/* Asset Grid */}
      <AssetGrid
        assets={assetsData?.data || []}
        isLoading={isLoading}
        onDelete={handleDelete}
        onEdit={(asset) => router.push(`/cms/media/${asset.id}`)}
      />

      {/* Pagination */}
      {assetsData && assetsData.meta.total_pages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination
            total={assetsData.meta.total_pages}
            page={filters.page}
            onChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          />
        </div>
      )}
    </div>
  );
}
```



### Upload Page

```typescript
// app/(private)/cms/media/upload/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, CardBody } from '@nextui-org/react';
import { ArrowLeft } from 'lucide-react';
import { AssetUpload } from '@/presentation/components/organisms/cms/asset-upload.view';

export default function UploadPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/cms/media');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="light"
          startContent={<ArrowLeft className="w-4 h-4" />}
          onPress={() => router.back()}
          className="mb-4"
        >
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Upload de Mídia</h1>
        <p className="text-gray-600 mt-1">
          Envie arquivos para sua biblioteca de mídia
        </p>
      </div>

      {/* Upload Component */}
      <Card>
        <CardBody className="p-6">
          <AssetUpload onSuccess={handleSuccess} />
        </CardBody>
      </Card>
    </div>
  );
}
```

### Collection List Page

```typescript
// app/(private)/cms/collections/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@nextui-org/react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useCollections, useDeleteCollection } from '@/lib/hooks/cms/use-collections';

export default function CollectionsPage() {
  const router = useRouter();
  const { data: collectionsData, isLoading } = useCollections({ limit: 100 });
  const deleteMutation = useDeleteCollection();

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta coleção?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Coleções de Mídia</h1>
          <p className="text-gray-600 mt-1">
            Organize seus assets em coleções com regras específicas
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={() => router.push('/cms/collections/new')}
        >
          Nova Coleção
        </Button>
      </div>

      {/* Collections Table */}
      <Card>
        <CardBody>
          <Table aria-label="Coleções de mídia">
            <TableHeader>
              <TableColumn>NOME</TableColumn>
              <TableColum