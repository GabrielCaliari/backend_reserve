# Guia de Integração - Módulo CMS Frontend

## Visão Geral

Este guia documenta a integração do módulo CMS no frontend Next.js 16, seguindo os princípios de usabilidade de Nielsen Norman e a arquitetura do projeto.

**Base URL da API**: `/api/cms`

---

## 1. Gestão de Blogs

### Endpoints

| Método | Endpoint | Autenticação | Papel Mínimo |
|--------|----------|--------------|--------------|
| POST | `/blogs` | Admin JWT | Manager |
| GET | `/blogs` | Admin JWT | Viewer |
| PUT | `/blogs/:blogId` | Admin JWT | Editor |
| DELETE | `/blogs/:blogId` | Admin JWT | Manager |
| POST | `/blogs/:blogId/regenerate-key` | Admin JWT | Owner |

### Interface Recomendada

**Página**: `src/presentation/pages/cms/blogs-list.view.tsx`

**Jornada do Usuário**:
1. Admin acessa lista de blogs do tenant
2. Visualiza cards com nome, descrição e status (ativo/inativo)
3. Pode criar novo blog (botão primário no topo)
4. Pode editar metadados (nome, descrição)
5. Pode deletar blog (confirmação modal)
6. Pode regenerar chave secreta (confirmação modal + aviso de segurança)

**Componentes Sugeridos**:
```
organisms/cms/
├── blog-list-table.tsx          # Tabela de blogs
├── blog-create-modal.tsx        # Modal de criação
├── blog-edit-modal.tsx          # Modal de edição
└── blog-secret-key-display.tsx  # Exibição única da chave
```

**Princípios Nielsen Norman Aplicados**:
- **Visibilidade do status**: Indicador visual de blog ativo/inativo
- **Prevenção de erros**: Confirmação antes de deletar ou regenerar chave
- **Reconhecimento vs. Lembrança**: Chave secreta exibida apenas uma vez com aviso claro
- **Flexibilidade**: Filtros por status e busca por nome

**Exemplo de Chamada**:
```typescript
// src/server/actions/cms/blog-actions.ts
'use server';

export async function createBlog(data: CreateBlogDTO) {
  const response = await fetch(`${API_BASE}/cms/blogs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAdminToken()}`,
      'x-tenant-id': getTenantId(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
}
```

---

## 2. Gestão de Artigos

### Endpoints

| Método | Endpoint | Autenticação | Papel Mínimo |
|--------|----------|--------------|--------------|
| POST | `/articles` | Admin JWT | Editor |
| GET | `/articles?blogId={id}` | Admin JWT | Viewer |
| GET | `/articles/:id` | Admin JWT | Viewer |
| PUT | `/articles/:id` | Admin JWT | Editor |
| DELETE | `/articles/:id` | Admin JWT | Editor |
| POST | `/articles/:id/publish` | Admin JWT | Editor |
| POST | `/articles/:articleId/archive` | Admin JWT | Editor |
| PUT | `/articles/reorder` | Admin JWT | Editor |

### Interface Recomendada

**Páginas**:
- `src/presentation/pages/cms/articles-list.view.tsx` - Lista de artigos
- `src/presentation/pages/cms/article-editor.view.tsx` - Editor de artigo

**Jornada do Usuário - Lista**:
1. Admin seleciona um blog
2. Visualiza lista de artigos com status (draft, published, archived)
3. Filtra por status
4. Pode criar novo artigo (botão primário)
5. Pode editar artigo existente
6. Pode deletar artigo (confirmação)
7. Pode reordenar artigos (drag & drop)

**Jornada do Usuário - Editor**:
1. Admin cria/edita artigo
2. Preenche título, slug, conteúdo (rich text editor)
3. Adiciona imagens (upload ou seleção)
4. Seleciona autor
5. Salva como rascunho (auto-save a cada 30s)
6. Publica artigo (validação de campos obrigatórios)
7. Pode arquivar artigo publicado

**Componentes Sugeridos**:
```
organisms/cms/
├── article-list-table.tsx       # Tabela com filtros
├── article-status-badge.tsx     # Badge de status
├── article-editor-form.tsx      # Formulário principal
├── article-rich-editor.tsx      # Editor de texto rico
├── article-image-manager.tsx    # Gerenciador de imagens
└── article-publish-modal.tsx    # Modal de publicação
```

**Princípios Nielsen Norman Aplicados**:
- **Controle do usuário**: Auto-save + botão manual de salvar
- **Consistência**: Status badges com cores padronizadas (draft=amarelo, published=verde, archived=cinza)
- **Prevenção de erros**: Validação antes de publicar (título, conteúdo, imagens)
- **Feedback**: Notificação de sucesso/erro em cada ação
- **Eficiência**: Atalhos de teclado (Ctrl+S para salvar, Ctrl+P para publicar)

**Estados do Artigo**:
```typescript
enum ArticleStatus {
  draft = 0,      // Rascunho - editável
  published = 1,  // Publicado - slug imutável
  archived = 2,   // Arquivado - não editável
}
```

---

## 3. Gestão de Imagens de Artigos

### Endpoints

| Método | Endpoint | Autenticação | Papel Mínimo |
|--------|----------|--------------|--------------|
| POST | `/articles/:articleId/images` | Admin JWT | Editor |
| GET | `/articles/:articleId/images` | Admin JWT | Viewer |
| DELETE | `/articles/:articleId/images/:imageId` | Admin JWT | Editor |
| PUT | `/articles/:articleId/images/reorder` | Admin JWT | Editor |

### Interface Recomendada

**Componente**: Integrado no editor de artigos

**Jornada do Usuário**:
1. Admin está editando artigo
2. Clica em "Adicionar Imagem"
3. Faz upload de arquivo (drag & drop ou seleção)
4. Visualiza preview imediato
5. Adiciona texto alternativo (acessibilidade)
6. Pode reordenar imagens (drag & drop)
7. Pode deletar imagem (confirmação)

**Validações**:
- Formatos aceitos: JPEG, PNG, GIF, WebP, AVIF
- Tamanho máximo: 10 MB
- Limite: 20 imagens por artigo
- Alt text: máximo 255 caracteres

---

## 4. Gestão de Autores

### Endpoints

| Método | Endpoint | Autenticação | Papel Mínimo |
|--------|----------|--------------|--------------|
| POST | `/authors` | Admin JWT | Editor |
| GET | `/authors?tenantId={id}` | Admin JWT | Viewer |
| GET | `/authors/:id` | Admin JWT | Viewer |
| PUT | `/authors/:id` | Admin JWT | Editor |
| DELETE | `/authors/:id` | Admin JWT | Editor |
| POST | `/authors/:id/avatar` | Admin JWT | Editor |

### Interface Recomendada

**Página**: `src/presentation/pages/cms/authors-list.view.tsx`

**Jornada do Usuário**:
1. Admin acessa lista de autores
2. Visualiza cards com avatar, nome, bio e status
3. Pode criar novo autor (modal)
4. Pode editar autor (modal ou página dedicada)
5. Pode fazer upload de avatar
6. Pode deletar autor (apenas se não tiver artigos publicados)

---

## 5. Sistema de Armazenamento Genérico (Media Assets)

### Endpoints - Collections

| Método | Endpoint | Autenticação | Papel Mínimo |
|--------|----------|--------------|--------------|
| POST | `/cms/collections` | Admin JWT | Editor |
| GET | `/cms/collections` | Admin JWT | Viewer |
| GET | `/cms/collections/:id` | Admin JWT | Viewer |
| GET | `/cms/collections/:id/assets` | Admin JWT | Viewer |
| PUT | `/cms/collections/:id` | Admin JWT | Editor |
| DELETE | `/cms/collections/:id` | Admin JWT | Editor |

### Endpoints - Assets

| Método | Endpoint | Autenticação | Papel Mínimo |
|--------|----------|--------------|--------------|
| POST | `/cms/assets` | Admin JWT | Editor |
| GET | `/cms/assets` | Admin JWT | Viewer |
| GET | `/cms/assets/:id` | Admin JWT | Viewer |
| PATCH | `/cms/assets/:id` | Admin JWT | Editor |
| DELETE | `/cms/assets/:id` | Admin JWT | Editor |

### Interface Recomendada

**Páginas**:
- `src/presentation/pages/cms/media-library.view.tsx` - Biblioteca de mídia
- `src/presentation/pages/cms/collections-manager.view.tsx` - Gerenciador de coleções

**Jornada do Usuário - Biblioteca de Mídia**:
1. Admin acessa biblioteca de mídia
2. Seleciona uma coleção (sidebar)
3. Visualiza grid de assets
4. Filtra por tipo MIME ou status
5. Faz upload de novos assets (drag & drop)
6. Edita metadados de asset (alt text, metadata)
7. Deleta assets não utilizados

**Tipos de Coleção**:
```typescript
enum CollectionType {
  image = 'image',      // Apenas imagens
  document = 'document', // PDFs, docs
  video = 'video',      // Vídeos
  audio = 'audio',      // Áudios
  mixed = 'mixed',      // Qualquer tipo
}
```

---

## 6. API Pública (Consumo Frontend Público)

### Endpoints

| Método | Endpoint | Autenticação | Descrição |
|--------|----------|--------------|-----------|
| GET | `/public/articles` | Blog Secret Key | Lista artigos publicados |
| GET | `/public/articles/:slug` | Blog Secret Key | Artigo por slug |

### Interface Recomendada

**Páginas Públicas**:
- `src/presentation/pages/blog/[slug]/index.view.tsx` - Página do blog
- `src/presentation/pages/blog/[slug]/[articleSlug].view.tsx` - Página do artigo

**Jornada do Usuário - Blog Público**:
1. Visitante acessa URL do blog
2. Visualiza lista de artigos publicados
3. Artigos ordenados por display_order
4. Paginação (10 artigos por página)
5. Clica em artigo para ler
6. Visualiza artigo completo com imagens

**Exemplo de Chamada (Server Component)**:
```typescript
// src/presentation/pages/blog/[slug]/index.view.tsx
import { headers } from 'next/headers';

async function getPublicArticles(blogSecretKey: string, page: number = 1) {
  const response = await fetch(
    `${API_BASE}/cms/public/articles?page=${page}&limit=10`,
    {
      headers: {
        'x-blog-secret-key': blogSecretKey,
      },
      next: { revalidate: 300 }, // Cache por 5 minutos
    }
  );
  
  return response.json();
}
```

---

## 7. Estrutura de Pastas Recomendada

```
src/
├── presentation/
│   ├── pages/
│   │   └── cms/
│   │       ├── blogs-list.view.tsx
│   │       ├── articles-list.view.tsx
│   │       ├── article-editor.view.tsx
│   │       ├── authors-list.view.tsx
│   │       ├── media-library.view.tsx
│   │       └── collections-manager.view.tsx
│   │
│   └── components/
│       ├── organisms/
│       │   └── cms/
│       │       ├── blog-list-table.tsx
│       │       ├── article-editor-form.tsx
│       │       ├── article-image-manager.tsx
│       │       ├── author-list-grid.tsx
│       │       ├── media-library-grid.tsx
│       │       └── collection-rules-form.tsx
│       │
│       └── molecules/
│           └── cms/
│               ├── article-status-badge.tsx
│               ├── image-upload-zone.tsx
│               ├── image-preview-card.tsx
│               └── media-asset-card.tsx
│
├── server/
│   └── actions/
│       └── cms/
│           ├── blog-actions.ts
│           ├── article-actions.ts
│           ├── image-actions.ts
│           ├── author-actions.ts
│           └── media-actions.ts
│
└── types/
    └── cms/
        ├── blog.type.ts
        ├── article.type.ts
        ├── author.type.ts
        └── media.type.ts
```

---

## 8. Padrões de UX/UI

### Cores de Status

```typescript
const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
  active: 'bg-blue-100 text-blue-800',
  inactive: 'bg-red-100 text-red-800',
};
```

### Feedback de Ações

```typescript
// Usar toast notifications
toast.success('Artigo publicado com sucesso');
toast.error('Erro ao publicar artigo');
toast.warning('Artigo salvo como rascunho');
toast.info('Auto-save ativado');
```

---

## 9. Checklist de Implementação

### Blog Management
- [ ] Página de lista de blogs
- [ ] Modal de criação de blog
- [ ] Modal de edição de blog
- [ ] Modal de confirmação de deleção
- [ ] Modal de regeneração de chave secreta
- [ ] Exibição única da chave secreta

### Article Management
- [ ] Página de lista de artigos
- [ ] Filtros por status
- [ ] Página de editor de artigos
- [ ] Rich text editor integrado
- [ ] Auto-save a cada 30s
- [ ] Validação antes de publicar
- [ ] Drag & drop para reordenação

### Image Management
- [ ] Componente de upload drag & drop
- [ ] Preview de imagens
- [ ] Campo de texto alternativo
- [ ] Validação de formato e tamanho
- [ ] Drag & drop para reordenação

### Author Management
- [ ] Página de lista de autores
- [ ] Grid de cards de autores
- [ ] Modal de criação de autor
- [ ] Upload de avatar
- [ ] Validação de deleção

### Media Library
- [ ] Página de biblioteca de mídia
- [ ] Sidebar de coleções
- [ ] Grid de assets
- [ ] Upload drag & drop
- [ ] Filtros por tipo e status

### Public API
- [ ] Página pública de blog
- [ ] Lista de artigos publicados
- [ ] Paginação
- [ ] Página de artigo individual
- [ ] SEO metadata

---

## 10. Considerações de Performance

### Caching
- Cache de artigos públicos: 5 minutos (revalidate: 300)
- Cache de imagens: CDN com cache infinito
- ETag para validação de cache

### Otimização de Imagens
- Next.js Image component para otimização automática
- Lazy loading de imagens
- Responsive images (srcset)
- WebP/AVIF quando suportado

