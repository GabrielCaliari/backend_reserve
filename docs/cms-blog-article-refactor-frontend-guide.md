# Guia de Integração Frontend - CMS Blog Article Refactoring

## Visão Geral

Este guia documenta as mudanças na API do CMS após a refatoração do sistema de blogs e artigos. O objetivo é facilitar a atualização das aplicações frontend que consomem esta API.

## Mudanças Principais

### 1. Blog - Remoção do Slug

**BREAKING CHANGE**: O campo `slug` foi removido da entidade Blog.

#### Antes
```json
{
  "id": 1,
  "name": "Tech Blog",
  "slug": "tech-blog",
  "description": "Blog sobre tecnologia",
  "tenant_id": 1,
  "active": true
}
```

#### Depois
```json
{
  "id": 1,
  "name": "Tech Blog",
  "description": "Blog sobre tecnologia",
  "tenant_id": 1,
  "active": true
}
```

**Ação Necessária**: 
- Remover referências a `blog.slug` no frontend
- Usar `blog.name` ou `blog.id` para identificação
- Atualizar rotas que dependiam de blog slug

---

### 2. Article - Novos Campos de SEO

**BREAKING CHANGE**: O campo `title` foi renomeado e novos campos foram adicionados.

#### Mapeamento de Campos

| Campo Antigo | Campo Novo | Descrição |
|--------------|------------|-----------|
| `title` | `meta_title` | Título para SEO (max 60 chars) |
| - | `display_title` | Título exibido no artigo |
| `description` | `meta_description` | Descrição para SEO (max 160 chars) |
| - | `focus_keyword` | Palavra-chave foco (opcional) |

#### Antes
```json
{
  "id": 1,
  "title": "Como usar TypeScript",
  "content": "...",
  "slug": "como-usar-typescript",
  "status": "published"
}
```

#### Depois
```json
{
  "id": 1,
  "display_title": "Como usar TypeScript",
  "meta_title": "TypeScript: Guia Completo 2026",
  "meta_description": "Aprenda TypeScript do zero com exemplos práticos e dicas avançadas.",
  "focus_keyword": "typescript",
  "content": "...",
  "slug": "como-usar-typescript",
  "status": "published",
  "cover_image_id": 42,
  "author_id": 5,
  "created_by": 1,
  "last_edited_by": 3,
  "published_at": "2026-02-18T10:00:00Z"
}
```

**Ação Necessária**:
- Atualizar formulários para incluir `display_title` e `meta_title` separadamente
- Adicionar campos opcionais `meta_description` e `focus_keyword`
- Usar `display_title` para exibição e `meta_title` para tags `<title>`

---

### 3. Article - Imagem de Capa (Cover Image)

**NOVA FUNCIONALIDADE**: Artigos agora possuem uma imagem de capa obrigatória para publicação.

#### Estrutura da Resposta com Cover Image

```json
{
  "id": 1,
  "display_title": "Como usar TypeScript",
  "cover_image_id": 42,
  "cover_image": {
    "id": 42,
    "url": "https://storage.example.com/images/typescript-cover.jpg",
    "storage_key": "article-images/2026/02/typescript-cover.jpg",
    "filename": "typescript-cover.jpg",
    "alt_text": "Logo do TypeScript",
    "width": 1200,
    "height": 630,
    "mime_type": "image/jpeg",
    "file_size": 245678
  }
}
```

**Ação Necessária**:
- Adicionar upload de imagem de capa no formulário de criação/edição
- Validar que artigos publicados possuem `cover_image_id`
- Exibir preview da imagem de capa
- Usar `cover_image.url` para renderizar a imagem

---

### 4. Article - Autor (Author)

**NOVA FUNCIONALIDADE**: Artigos agora possuem um autor obrigatório.

#### Estrutura da Entidade Author

```json
{
  "id": 5,
  "first_name": "João",
  "last_name": "Silva",
  "biography": "Desenvolvedor full-stack com 10 anos de experiência.",
  "avatar_id": 15,
  "avatar": {
    "id": 15,
    "url": "https://storage.example.com/avatars/joao-silva.jpg",
    "alt_text": "Foto de João Silva",
    "width": 400,
    "height": 400
  },
  "tenant_id": 1,
  "active": true
}
```

#### Resposta de Article com Author

```json
{
  "id": 1,
  "display_title": "Como usar TypeScript",
  "author_id": 5,
  "author": {
    "id": 5,
    "first_name": "João",
    "last_name": "Silva",
    "biography": "Desenvolvedor full-stack com 10 anos de experiência.",
    "avatar": {
      "url": "https://storage.example.com/avatars/joao-silva.jpg",
      "alt_text": "Foto de João Silva"
    }
  }
}
```

**Ação Necessária**:
- Adicionar seletor de autor no formulário de artigo
- Exibir informações do autor na página do artigo
- Criar interface para gerenciar autores (CRUD)
- Validar que o autor pertence ao mesmo tenant do blog

---

### 5. Article - Auditoria (Audit Trail)

**NOVA FUNCIONALIDADE**: Rastreamento de criação e edição por administradores.

#### Campos de Auditoria

```json
{
  "id": 1,
  "created_by": 1,
  "last_edited_by": 3,
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-02-18T15:30:00Z",
  "creator": {
    "id": 1,
    "name": "Admin Principal",
    "email": "admin@example.com"
  },
  "last_editor": {
    "id": 3,
    "name": "Editor Convidado",
    "email": "editor@example.com"
  }
}
```

**Ação Necessária**:
- Exibir informações de criador e último editor na interface
- Adicionar filtros por criador/editor em listagens
- Mostrar histórico de edições (se implementado)

---

### 6. Imagens no Conteúdo (Content Images)

**MUDANÇA**: Imagens no markdown agora referenciam MediaAssets.

#### Sintaxe Markdown Suportada

```markdown
<!-- Referência por storage_key -->
![Descrição da imagem](article-images/2026/02/exemplo.jpg)

<!-- Referência por URL completa -->
![Descrição da imagem](https://storage.example.com/images/exemplo.jpg)
```

#### Fluxo de Upload de Imagem

1. **Upload**: POST `/api/v2/media/upload`
```json
// Request (multipart/form-data)
{
  "file": <binary>,
  "collection_slug": "article-images",
  "alt_text": "Descrição da imagem"
}

// Response
{
  "id": 50,
  "url": "https://storage.example.com/images/exemplo.jpg",
  "storage_key": "article-images/2026/02/exemplo.jpg",
  "filename": "exemplo.jpg",
  "alt_text": "Descrição da imagem"
}
```

2. **Inserir no Markdown**:
```markdown
![Descrição da imagem](article-images/2026/02/exemplo.jpg)
```

**Ação Necessária**:
- Implementar upload de imagens via MediaAsset API
- Inserir `storage_key` ou `url` no editor markdown
- Validar referências de imagens antes de publicar
- Exibir preview de imagens no editor

---

## Endpoints da API

### Blog Endpoints

#### Listar Blogs
```http
GET /api/v2/blogs?tenant_id=1
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Tech Blog",
      "description": "Blog sobre tecnologia",
      "tenant_id": 1,
      "active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### Criar Blog
```http
POST /api/v2/blogs
Content-Type: application/json
Authorization: Bearer <token>
```

**Request**:
```json
{
  "name": "Tech Blog",
  "description": "Blog sobre tecnologia",
  "tenant_id": 1
}
```

**Response**: 201 Created
```json
{
  "id": 1,
  "name": "Tech Blog",
  "description": "Blog sobre tecnologia",
  "tenant_id": 1,
  "active": true,
  "created_at": "2026-02-18T10:00:00Z"
}
```

---

### Article Endpoints

#### Listar Artigos
```http
GET /api/v2/articles?blog_id=1&status=published
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "display_title": "Como usar TypeScript",
      "meta_title": "TypeScript: Guia Completo 2026",
      "slug": "como-usar-typescript",
      "status": "published",
      "cover_image": {
        "url": "https://storage.example.com/images/cover.jpg",
        "alt_text": "Logo TypeScript"
      },
      "author": {
        "id": 5,
        "first_name": "João",
        "last_name": "Silva"
      },
      "published_at": "2026-02-18T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

#### Obter Artigo por ID
```http
GET /api/v2/articles/1
```

**Response**:
```json
{
  "id": 1,
  "display_title": "Como usar TypeScript",
  "meta_title": "TypeScript: Guia Completo 2026",
  "meta_description": "Aprenda TypeScript do zero com exemplos práticos.",
  "focus_keyword": "typescript",
  "content": "# Introdução\n\n![Exemplo](article-images/2026/02/exemplo.jpg)\n\n...",
  "slug": "como-usar-typescript",
  "status": "published",
  "display_order": 0,
  "published_at": "2026-02-18T10:00:00Z",
  "cover_image_id": 42,
  "cover_image": {
    "id": 42,
    "url": "https://storage.example.com/images/cover.jpg",
    "storage_key": "article-images/2026/02/cover.jpg",
    "alt_text": "Logo TypeScript",
    "width": 1200,
    "height": 630
  },
  "author_id": 5,
  "author": {
    "id": 5,
    "first_name": "João",
    "last_name": "Silva",
    "biography": "Desenvolvedor full-stack.",
    "avatar": {
      "url": "https://storage.example.com/avatars/joao.jpg"
    }
  },
  "blog_id": 1,
  "created_by": 1,
  "last_edited_by": 3,
  "creator": {
    "id": 1,
    "name": "Admin Principal"
  },
  "last_editor": {
    "id": 3,
    "name": "Editor Convidado"
  },
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-02-18T15:30:00Z"
}
```

#### Criar Artigo (Draft)
```http
POST /api/v2/articles
Content-Type: application/json
Authorization: Bearer <token>
```

**Request**:
```json
{
  "display_title": "Como usar TypeScript",
  "meta_title": "TypeScript: Guia Completo 2026",
  "meta_description": "Aprenda TypeScript do zero.",
  "focus_keyword": "typescript",
  "content": "# Introdução\n\n...",
  "slug": "como-usar-typescript",
  "status": "draft",
  "author_id": 5,
  "blog_id": 1
}
```

**Response**: 201 Created
```json
{
  "id": 1,
  "display_title": "Como usar TypeScript",
  "status": "draft",
  "created_by": 1,
  "created_at": "2026-02-18T10:00:00Z"
}
```

#### Atualizar Artigo
```http
PUT /api/v2/articles/1
Content-Type: application/json
Authorization: Bearer <token>
```

**Request**:
```json
{
  "display_title": "Como usar TypeScript - Atualizado",
  "meta_description": "Guia completo e atualizado sobre TypeScript.",
  "cover_image_id": 42
}
```

**Response**: 200 OK

#### Publicar Artigo
```http
POST /api/v2/articles/1/publish
Authorization: Bearer <token>
```

**Response**: 200 OK
```json
{
  "id": 1,
  "status": "published",
  "published_at": "2026-02-18T10:00:00Z"
}
```

**Erro (campos obrigatórios faltando)**: 400 Bad Request
```json
{
  "code": "400:Article cannot be published: missing required fields",
  "message": "Article cannot be published",
  "details": {
    "missing_fields": ["cover_image_id", "meta_description"]
  }
}
```

---

### Author Endpoints

#### Listar Autores
```http
GET /api/v2/authors?tenant_id=1&active=true
```

**Response**:
```json
{
  "data": [
    {
      "id": 5,
      "first_name": "João",
      "last_name": "Silva",
      "biography": "Desenvolvedor full-stack.",
      "avatar": {
        "url": "https://storage.example.com/avatars/joao.jpg"
      },
      "tenant_id": 1,
      "active": true
    }
  ],
  "total": 1
}
```

#### Criar Autor
```http
POST /api/v2/authors
Content-Type: application/json
Authorization: Bearer <token>
```

**Request**:
```json
{
  "first_name": "João",
  "last_name": "Silva",
  "biography": "Desenvolvedor full-stack com 10 anos de experiência.",
  "tenant_id": 1
}
```

**Response**: 201 Created
```json
{
  "id": 5,
  "first_name": "João",
  "last_name": "Silva",
  "biography": "Desenvolvedor full-stack com 10 anos de experiência.",
  "avatar_id": null,
  "tenant_id": 1,
  "active": true,
  "created_at": "2026-02-18T10:00:00Z"
}
```

#### Atribuir Avatar ao Autor
```http
POST /api/v2/authors/5/avatar
Content-Type: application/json
Authorization: Bearer <token>
```

**Request**:
```json
{
  "avatar_id": 15
}
```

**Response**: 200 OK

---

## Validações e Regras de Negócio

### Validações de Artigo

| Campo | Regra | Mensagem de Erro |
|-------|-------|------------------|
| `display_title` | Obrigatório | "display_title is required" |
| `meta_title` | Obrigatório, max 60 chars | "meta_title cannot exceed 60 characters" |
| `meta_description` | Opcional, max 160 chars | "meta_description cannot exceed 160 characters" |
| `slug` | Obrigatório, URL-safe, único por blog | "slug must be URL-safe" / "slug already exists" |
| `cover_image_id` | Obrigatório para publicação | "cover_image_id is required for published articles" |
| `author_id` | Obrigatório | "author_id is required" |
| `content` | Obrigatório para publicação | "content is required for published articles" |

### Regras de Publicação

Para publicar um artigo (`status: published`), os seguintes campos são obrigatórios:
- `display_title`
- `meta_title`
- `cover_image_id`
- `author_id`
- `content` (não vazio)

Artigos em `draft` podem ter campos incompletos.

### Regras de Slug

- Slug deve conter apenas letras minúsculas, números e hífens
- Não pode ter hífens consecutivos ou no início/fim
- Deve ser único dentro do blog
- **Não pode ser alterado após publicação**

### Regras de Autor

- Autor deve pertencer ao mesmo tenant do blog
- Autor não pode ser deletado se tiver artigos publicados
- Avatar deve ser um MediaAsset válido da collection 'author-avatars'

---

## Migração de Dados

### Dados Existentes

Durante a migração, os seguintes dados foram transformados:

1. **Blog.slug**: Removido (use `blog.name` ou `blog.id`)
2. **Article.title**: Copiado para `meta_title` e `display_title`
3. **ArticleImage**: Migrado para MediaAsset + MediaAssetRelation
4. **Autores padrão**: Criado "System Author" para artigos existentes

### Verificação Pós-Migração

Após a migração, verifique:
- Todos os artigos possuem `author_id` válido
- Todos os artigos possuem `display_title` e `meta_title`
- Imagens antigas foram migradas para MediaAsset
- Referências de imagens no markdown estão corretas

---

## Exemplos de Integração

### React/Next.js - Formulário de Artigo

```typescript
interface ArticleFormData {
  display_title: string;
  meta_title: string;
  meta_description?: string;
  focus_keyword?: string;
  content: string;
  slug: string;
  cover_image_id?: number;
  author_id: number;
  blog_id: number;
  status: 'draft' | 'published';
}

const ArticleForm: React.FC = () => {
  const [formData, setFormData] = useState<ArticleFormData>({
    display_title: '',
    meta_title: '',
    content: '',
    slug: '',
    author_id: 0,
    blog_id: 0,
    status: 'draft'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/v2/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      const article = await response.json();
      console.log('Artigo criado:', article);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Título de Exibição"
        value={formData.display_title}
        onChange={(e) => setFormData({ ...formData, display_title: e.target.value })}
        required
      />
      
      <input
        type="text"
        placeholder="Meta Título (SEO)"
        value={formData.meta_title}
        onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
        maxLength={60}
        required
      />
      
      <textarea
        placeholder="Meta Descrição (SEO)"
        value={formData.meta_description}
        onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
        maxLength={160}
      />
      
      <input
        type="text"
        placeholder="Palavra-chave Foco"
        value={formData.focus_keyword}
        onChange={(e) => setFormData({ ...formData, focus_keyword: e.target.value })}
      />
      
      <CoverImageUpload
        onImageUploaded={(imageId) => setFormData({ ...formData, cover_image_id: imageId })}
      />
      
      <AuthorSelect
        value={formData.author_id}
        onChange={(authorId) => setFormData({ ...formData, author_id: authorId })}
      />
      
      <MarkdownEditor
        value={formData.content}
        onChange={(content) => setFormData({ ...formData, content })}
      />
      
      <button type="submit">Salvar Rascunho</button>
      <button type="button" onClick={() => publishArticle(article.id)}>
        Publicar
      </button>
    </form>
  );
};
```

### Upload de Imagem de Capa

```typescript
const CoverImageUpload: React.FC<{ onImageUploaded: (id: number) => void }> = ({ onImageUploaded }) => {
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_slug', 'article-images');
    formData.append('alt_text', file.name);

    const response = await fetch('/api/v2/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (response.ok) {
      const mediaAsset = await response.json();
      onImageUploaded(mediaAsset.id);
    }
  };

  return (
    <div>
      <label>Imagem de Capa</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
      />
    </div>
  );
};
```

### Exibição de Artigo

```typescript
interface Article {
  id: number;
  display_title: string;
  meta_title: string;
  meta_description?: string;
  content: string;
  cover_image?: {
    url: string;
    alt_text?: string;
  };
  author: {
    first_name: string;
    last_name: string;
    biography?: string;
    avatar?: {
      url: string;
    };
  };
  published_at: string;
}

const ArticlePage: React.FC<{ article: Article }> = ({ article }) => {
  return (
    <>
      <Head>
        <title>{article.meta_title}</title>
        <meta name="description" content={article.meta_description} />
      </Head>
      
      <article>
        {article.cover_image && (
          <img
            src={article.cover_image.url}
            alt={article.cover_image.alt_text || article.display_title}
            className="cover-image"
          />
        )}
        
        <h1>{article.display_title}</h1>
        
        <div className="author-info">
          {article.author.avatar && (
            <img src={article.author.avatar.url} alt={article.author.first_name} />
          )}
          <div>
            <p className="author-name">
              {article.author.first_name} {article.author.last_name}
            </p>
            <p className="publish-date">
              {new Date(article.published_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(article.content) }}
        />
      </article>
    </>
  );
};
```

---

## Checklist de Migração Frontend

### Fase 1: Atualização de Tipos
- [ ] Remover `slug` da interface `Blog`
- [ ] Renomear `title` para `meta_title` na interface `Article`
- [ ] Adicionar `display_title`, `meta_description`, `focus_keyword` em `Article`
- [ ] Adicionar `cover_image_id`, `author_id`, `created_by`, `last_edited_by` em `Article`
- [ ] Criar interface `Author` com todos os campos
- [ ] Atualizar tipos de resposta da API

### Fase 2: Atualização de Componentes
- [ ] Atualizar formulário de blog (remover campo slug)
- [ ] Atualizar formulário de artigo (adicionar novos campos)
- [ ] Criar componente de upload de imagem de capa
- [ ] Criar componente de seleção de autor
- [ ] Atualizar editor markdown para suportar MediaAsset
- [ ] Criar interface de gerenciamento de autores

### Fase 3: Atualização de Rotas
- [ ] Remover rotas baseadas em blog slug
- [ ] Manter rotas baseadas em article slug
- [ ] Adicionar rotas para gerenciamento de autores
- [ ] Atualizar breadcrumbs e navegação

### Fase 4: Validações
- [ ] Adicionar validação de meta_title (max 60 chars)
- [ ] Adicionar validação de meta_description (max 160 chars)
- [ ] Validar presença de cover_image antes de publicar
- [ ] Validar presença de autor antes de criar artigo
- [ ] Validar slug URL-safe
- [ ] Prevenir edição de slug em artigos publicados

### Fase 5: Testes
- [ ] Testar criação de artigo draft
- [ ] Testar publicação de artigo com validações
- [ ] Testar upload de imagem de capa
- [ ] Testar criação e atribuição de autor
- [ ] Testar edição de artigo existente
- [ ] Testar exibição de artigo no frontend público

---

## Suporte e Dúvidas

Para dúvidas sobre a integração, consulte:
- Documentação da API: `/api/docs` (Swagger)
- Repositório: [Link do repositório]
- Contato: [Email do time de backend]

---

**Última atualização**: 18 de fevereiro de 2026
