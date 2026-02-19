# Guia de Autenticação Frontend - Blog API (Tenant Read-Only)

## Visão Geral

Este guia explica como um frontend de tenant (apenas leitura) pode consumir os endpoints públicos do blog e autenticar usando a secret key.

## Conceitos Básicos

- **Blog**: Cada tenant pode ter um ou mais blogs
- **Secret Key**: Chave de autenticação única por blog, gerada automaticamente
- **Endpoints Públicos**: APIs de leitura que não requerem autenticação de usuário, apenas a secret key do blog

## Fluxo de Autenticação

### 1. Obter a Secret Key

A secret key é gerada automaticamente quando um blog é criado e só é exibida uma vez. O administrador do tenant deve:

1. Criar um blog via painel administrativo (endpoint `/api/cms/blogs`)
2. Copiar a `secret_key` retornada na resposta
3. Armazenar de forma segura (variável de ambiente no frontend)

**Importante**: A secret key só é retornada na criação ou regeneração. Não é possível recuperá-la depois.

### 2. Fazer Requisições Autenticadas

Todas as requisições aos endpoints públicos devem incluir o header `x-blog-secret-key`:

```typescript
const response = await fetch('https://api.example.com/api/cms/public/articles', {
  headers: {
    'x-blog-secret-key': 'sua-secret-key-aqui'
  }
});
```

## Endpoints Disponíveis

### Base URL
```
/api/cms/public
```

### 1. Listar Artigos Publicados

**Endpoint**: `GET /articles`

**Headers Obrigatórios**:
```
x-blog-secret-key: <sua-secret-key>
```

**Query Parameters**:
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Artigos por página, máximo 50 (padrão: 10)

**Exemplo de Requisição**:
```typescript
const response = await fetch(
  'https://api.example.com/api/cms/public/articles?page=1&limit=10',
  {
    headers: {
      'x-blog-secret-key': process.env.BLOG_SECRET_KEY
    }
  }
);

const data = await response.json();
```

**Resposta de Sucesso (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Título do Artigo",
      "slug": "titulo-do-artigo",
      "content": "Conteúdo completo...",
      "published_at": "2026-02-18T10:00:00Z",
      "display_order": 1,
      "images": [
        {
          "id": 1,
          "url": "https://storage.example.com/image.jpg",
          "alt_text": "Descrição da imagem",
          "display_order": 1
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

### 2. Obter Artigo por Slug

**Endpoint**: `GET /articles/:slug`

**Headers Obrigatórios**:
```
x-blog-secret-key: <sua-secret-key>
```

**Exemplo de Requisição**:
```typescript
const response = await fetch(
  'https://api.example.com/api/cms/public/articles/meu-artigo',
  {
    headers: {
      'x-blog-secret-key': process.env.BLOG_SECRET_KEY
    }
  }
);

const article = await response.json();
```

**Resposta de Sucesso (200)**:
```json
{
  "id": 1,
  "title": "Título do Artigo",
  "slug": "meu-artigo",
  "content": "Conteúdo completo do artigo...",
  "status": "published",
  "published_at": "2026-02-18T10:00:00Z",
  "images": [
    {
      "id": 1,
      "url": "https://storage.example.com/image.jpg",
      "alt_text": "Descrição da imagem",
      "display_order": 1
    }
  ],
  "created_at": "2026-02-15T08:00:00Z",
  "updated_at": "2026-02-18T09:30:00Z"
}
```

## Códigos de Resposta

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 401 | Secret key ausente ou inválida |
| 404 | Blog ou artigo não encontrado |

## Exemplo de Implementação (Next.js)

### Configuração de Ambiente

```env
# .env.local
BLOG_SECRET_KEY=sua-secret-key-de-64-caracteres-aqui
NEXT_PUBLIC_API_URL=https://api.example.com
```

### Service Layer

```typescript
// lib/blog-api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SECRET_KEY = process.env.BLOG_SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error('BLOG_SECRET_KEY não configurada');
}

const headers = {
  'x-blog-secret-key': SECRET_KEY,
  'Content-Type': 'application/json',
};

export async function getArticles(page = 1, limit = 10) {
  const response = await fetch(
    `${API_URL}/api/cms/public/articles?page=${page}&limit=${limit}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Erro ao buscar artigos: ${response.status}`);
  }

  return response.json();
}

export async function getArticleBySlug(slug: string) {
  const response = await fetch(
    `${API_URL}/api/cms/public/articles/${slug}`,
    { headers }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Erro ao buscar artigo: ${response.status}`);
  }

  return response.json();
}
```

### Server Component (Next.js 16)

```typescript
// app/blog/page.tsx
import { getArticles } from '@/lib/blog-api';

export default async function BlogPage() {
  const { data: articles, meta } = await getArticles(1, 10);

  return (
    <div>
      <h1>Blog</h1>
      {articles.map((article) => (
        <article key={article.id}>
          <h2>{article.title}</h2>
          <p>{article.content.substring(0, 200)}...</p>
          <a href={`/blog/${article.slug}`}>Ler mais</a>
        </article>
      ))}
    </div>
  );
}
```

### Dynamic Route

```typescript
// app/blog/[slug]/page.tsx
import { getArticleBySlug } from '@/lib/blog-api';
import { notFound } from 'next/navigation';

export default async function ArticlePage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  const article = await getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <article>
      <h1>{article.title}</h1>
      {article.images.map((img) => (
        <img 
          key={img.id} 
          src={img.url} 
          alt={img.alt_text} 
        />
      ))}
      <div dangerouslySetInnerHTML={{ __html: article.content }} />
    </article>
  );
}
```

## Segurança

### Boas Práticas

1. **Nunca exponha a secret key no frontend público**
   - Use apenas em Server Components ou API Routes
   - Nunca inclua em código client-side

2. **Armazene a secret key de forma segura**
   - Use variáveis de ambiente
   - Não commite no Git
   - Rotacione periodicamente

3. **Regeneração de Secret Key**
   - Se a chave for comprometida, regenere imediatamente
   - Endpoint: `POST /api/cms/blogs/:id/regenerate-key` (requer autenticação admin)

### Exemplo de API Route (Next.js)

Se precisar expor dados para o client-side:

```typescript
// app/api/blog/articles/route.ts
import { NextResponse } from 'next/server';
import { getArticles } from '@/lib/blog-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const data = await getArticles(page, limit);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar artigos' },
      { status: 500 }
    );
  }
}
```

## Tratamento de Erros

```typescript
// lib/blog-api.ts
export class BlogAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'BlogAPIError';
  }
}

export async function getArticles(page = 1, limit = 10) {
  const response = await fetch(
    `${API_URL}/api/cms/public/articles?page=${page}&limit=${limit}`,
    { headers }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new BlogAPIError(
        'Secret key inválida ou ausente',
        401,
        'INVALID_SECRET_KEY'
      );
    }
    throw new BlogAPIError(
      'Erro ao buscar artigos',
      response.status
    );
  }

  return response.json();
}
```

## Limitações

- **Apenas leitura**: Estes endpoints são read-only
- **Apenas artigos publicados**: Artigos em draft ou arquivados não são retornados
- **Rate limiting**: Pode haver limites de requisições (verificar com administrador)
- **Cache**: Considere implementar cache no frontend para melhor performance

## Suporte

Para obter ou regenerar a secret key, entre em contato com o administrador do tenant ou acesse o painel administrativo em `/api/cms/blogs`.
