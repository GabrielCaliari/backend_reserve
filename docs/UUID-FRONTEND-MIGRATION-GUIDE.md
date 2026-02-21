# UUID Migration - Frontend Developer Guide

## Overview

This guide helps frontend developers migrate their applications to work with the new UUID-based CMS API. All entity IDs have changed from integers to 12-character UUID strings.

**Target Audience**: Frontend developers, mobile app developers, API consumers  
**Estimated Migration Time**: 2-4 hours per application  
**Testing Required**: Yes (staging environment available)

---

## Quick Start Checklist

- [ ] Update all ID type definitions from `number` to `string`
- [ ] Update API request URLs to use UUID strings
- [ ] Update form validations to accept UUID format
- [ ] Update local storage/cache keys if using IDs
- [ ] Update routing parameters to handle UUID strings
- [ ] Test all CRUD operations in staging
- [ ] Update unit and integration tests
- [ ] Deploy to production after backend migration

---

## Type Definition Changes

### TypeScript/JavaScript

#### Before Migration

```typescript
// types/cms.ts
interface Blog {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  tenant_id: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Article {
  id: number;
  blog_id: number;
  author_id: number;
  cover_image_id: number | null;
  display_title: string;
  meta_title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  // ... other fields
}

interface Author {
  id: number;
  avatar_id: number | null;
  first_name: string;
  last_name: string;
  // ... other fields
}

interface MediaAsset {
  id: number;
  collection_id: number;
  url: string;
  storage_key: string;
  // ... other fields
}
```

#### After Migration

```typescript
// types/cms.ts
interface Blog {
  id: string;              // Changed to string
  name: string;
  // slug field removed
  description: string | null;
  tenant_id: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Article {
  id: string;              // Changed to string
  blog_id: string;         // Changed to string
  author_id: string;       // Changed to string
  cover_image_id: string | null;  // Changed to string
  display_title: string;
  meta_title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  // ... other fields
}

interface Author {
  id: string;              // Changed to string
  avatar_id: string | null;  // Changed to string
  first_name: string;
  last_name: string;
  // ... other fields
}

interface MediaAsset {
  id: string;              // Changed to string
  collection_id: string;   // Changed to string
  url: string;
  storage_key: string;
  // ... other fields
}

interface MediaAssetRelation {
  id: string;              // Changed to string
  asset_id: string;        // Changed to string
  entity_id: string;       // Polymorphic
  entity_id_type: 'int' | 'uuid';  // NEW field
  entity_type: string;
  relation_type: string;
  // ... other fields
}
```

---

## API Request Changes

### React/Next.js Example

#### Before Migration

```typescript
// services/articleService.ts
export const getArticle = async (id: number): Promise<Article> => {
  const response = await fetch(`/api/v2/cms/articles/${id}`);
  return response.json();
};

export const createArticle = async (data: CreateArticleDto): Promise<Article> => {
  const response = await fetch('/api/v2/cms/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      blog_id: 123,
      author_id: 456,
      cover_image_id: 789,
    }),
  });
  return response.json();
};
```

#### After Migration

```typescript
// services/articleService.ts
export const getArticle = async (id: string): Promise<Article> => {
  const response = await fetch(`/api/v2/cms/articles/${id}`);
  return response.json();
};

export const createArticle = async (data: CreateArticleDto): Promise<Article> => {
  const response = await fetch('/api/v2/cms/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      blog_id: 'ckl1234abcd5',
      author_id: 'cklmnopqrst2',
      cover_image_id: 'cklabcdefgh1',
    }),
  });
  return response.json();
};
```

---

## Routing Changes

### React Router

#### Before Migration

```typescript
// routes.tsx
<Route path="/blogs/:blogId" element={<BlogDetail />} />
<Route path="/articles/:articleId" element={<ArticleDetail />} />

// BlogDetail.tsx
const BlogDetail = () => {
  const { blogId } = useParams<{ blogId: string }>();
  const numericId = parseInt(blogId!, 10);
  
  const { data: blog } = useQuery(['blog', numericId], () => 
    getBlog(numericId)
  );
  
  return <div>{blog?.name}</div>;
};
```

#### After Migration

```typescript
// routes.tsx
<Route path="/blogs/:blogId" element={<BlogDetail />} />
<Route path="/articles/:articleId" element={<ArticleDetail />} />

// BlogDetail.tsx
const BlogDetail = () => {
  const { blogId } = useParams<{ blogId: string }>();
  // No need to parse - already a string
  
  const { data: blog } = useQuery(['blog', blogId], () => 
    getBlog(blogId!)
  );
  
  return <div>{blog?.name}</div>;
};
```

### Next.js App Router

#### Before Migration

```typescript
// app/blogs/[blogId]/page.tsx
export default async function BlogPage({ 
  params 
}: { 
  params: { blogId: string } 
}) {
  const blogId = parseInt(params.blogId, 10);
  const blog = await getBlog(blogId);
  
  return <div>{blog.name}</div>;
}
```

#### After Migration

```typescript
// app/blogs/[blogId]/page.tsx
export default async function BlogPage({ 
  params 
}: { 
  params: { blogId: string } 
}) {
  // Use directly as string
  const blog = await getBlog(params.blogId);
  
  return <div>{blog.name}</div>;
}
```

---

## Form Handling Changes

### React Hook Form Example

#### Before Migration

```typescript
// components/ArticleForm.tsx
import { useForm } from 'react-hook-form';

interface ArticleFormData {
  display_title: string;
  meta_title: string;
  content: string;
  slug: string;
  blog_id: number;
  author_id: number;
  cover_image_id: number | null;
}

const ArticleForm = () => {
  const { register, handleSubmit } = useForm<ArticleFormData>();
  
  const onSubmit = async (data: ArticleFormData) => {
    await createArticle(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register('blog_id', { valueAsNumber: true })}>
        <option value={123}>Tech Blog</option>
        <option value={124}>News Blog</option>
      </select>
      
      <select {...register('author_id', { valueAsNumber: true })}>
        <option value={456}>John Doe</option>
        <option value={457}>Jane Smith</option>
      </select>
      
      {/* Other fields */}
    </form>
  );
};
```

#### After Migration

```typescript
// components/ArticleForm.tsx
import { useForm } from 'react-hook-form';

interface ArticleFormData {
  display_title: string;
  meta_title: string;
  content: string;
  slug: string;
  blog_id: string;         // Changed to string
  author_id: string;       // Changed to string
  cover_image_id: string | null;  // Changed to string
}

const ArticleForm = () => {
  const { register, handleSubmit } = useForm<ArticleFormData>();
  
  const onSubmit = async (data: ArticleFormData) => {
    await createArticle(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register('blog_id')}>
        <option value="ckl1234abcd5">Tech Blog</option>
        <option value="ckl5678efgh9">News Blog</option>
      </select>
      
      <select {...register('author_id')}>
        <option value="cklmnopqrst2">John Doe</option>
        <option value="ckluvwxyz123">Jane Smith</option>
      </select>
      
      {/* Other fields */}
    </form>
  );
};
```

---

## State Management Changes

### Redux/Zustand Example

#### Before Migration

```typescript
// store/articlesSlice.ts
interface ArticlesState {
  articles: Record<number, Article>;
  selectedArticleId: number | null;
}

const articlesSlice = createSlice({
  name: 'articles',
  initialState: {
    articles: {},
    selectedArticleId: null,
  } as ArticlesState,
  reducers: {
    setArticle: (state, action: PayloadAction<Article>) => {
      state.articles[action.payload.id] = action.payload;
    },
    selectArticle: (state, action: PayloadAction<number>) => {
      state.selectedArticleId = action.payload;
    },
  },
});
```

#### After Migration

```typescript
// store/articlesSlice.ts
interface ArticlesState {
  articles: Record<string, Article>;  // Changed key type
  selectedArticleId: string | null;   // Changed to string
}

const articlesSlice = createSlice({
  name: 'articles',
  initialState: {
    articles: {},
    selectedArticleId: null,
  } as ArticlesState,
  reducers: {
    setArticle: (state, action: PayloadAction<Article>) => {
      state.articles[action.payload.id] = action.payload;
    },
    selectArticle: (state, action: PayloadAction<string>) => {  // Changed type
      state.selectedArticleId = action.payload;
    },
  },
});
```

---

## Local Storage / Cache Changes

### Before Migration

```typescript
// utils/cache.ts
const CACHE_KEY_PREFIX = 'article_';

export const cacheArticle = (article: Article) => {
  localStorage.setItem(
    `${CACHE_KEY_PREFIX}${article.id}`,
    JSON.stringify(article)
  );
};

export const getCachedArticle = (id: number): Article | null => {
  const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${id}`);
  return cached ? JSON.parse(cached) : null;
};
```

### After Migration

```typescript
// utils/cache.ts
const CACHE_KEY_PREFIX = 'article_';

export const cacheArticle = (article: Article) => {
  localStorage.setItem(
    `${CACHE_KEY_PREFIX}${article.id}`,
    JSON.stringify(article)
  );
};

export const getCachedArticle = (id: string): Article | null => {  // Changed type
  const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${id}`);
  return cached ? JSON.parse(cached) : null;
};
```

**Note**: Existing cached data with integer keys will become invalid. Consider clearing cache on app update:

```typescript
// Clear old cache on migration
export const clearLegacyCache = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      // Check if value contains old integer ID format
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (typeof parsed.id === 'number') {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Invalid JSON, remove it
          localStorage.removeItem(key);
        }
      }
    }
  });
};
```

---

## Validation Changes

### UUID Format Validation

Add UUID validation for user inputs:

```typescript
// utils/validation.ts
export const isValidUUID = (value: string): boolean => {
  return /^[a-z0-9]{12}$/i.test(value);
};

export const validateUUID = (value: string, fieldName: string): string | null => {
  if (!value) {
    return `${fieldName} is required`;
  }
  
  if (!isValidUUID(value)) {
    return `${fieldName} must be a valid 12-character UUID`;
  }
  
  return null;
};

// Usage in React Hook Form
const ArticleForm = () => {
  const { register, formState: { errors } } = useForm<ArticleFormData>();
  
  return (
    <form>
      <input
        {...register('blog_id', {
          validate: (value) => validateUUID(value, 'Blog ID'),
        })}
      />
      {errors.blog_id && <span>{errors.blog_id.message}</span>}
    </form>
  );
};
```

---

## URL Building Changes

### Before Migration

```typescript
// utils/urls.ts
export const getArticleUrl = (blogId: number, articleSlug: string): string => {
  return `/blogs/${blogId}/articles/${articleSlug}`;
};

export const getArticleEditUrl = (articleId: number): string => {
  return `/admin/articles/${articleId}/edit`;
};
```

### After Migration

```typescript
// utils/urls.ts
export const getArticleUrl = (blogId: string, articleSlug: string): string => {
  return `/blogs/${blogId}/articles/${articleSlug}`;
};

export const getArticleEditUrl = (articleId: string): string => {
  return `/admin/articles/${articleId}/edit`;
};
```

---

## Query Parameter Handling

### React Query / SWR

#### Before Migration

```typescript
// hooks/useArticles.ts
import { useQuery } from '@tanstack/react-query';

export const useArticles = (blogId: number) => {
  return useQuery({
    queryKey: ['articles', blogId],
    queryFn: () => getArticlesByBlog(blogId),
  });
};

export const useArticle = (articleId: number) => {
  return useQuery({
    queryKey: ['article', articleId],
    queryFn: () => getArticle(articleId),
    enabled: articleId > 0,
  });
};
```

#### After Migration

```typescript
// hooks/useArticles.ts
import { useQuery } from '@tanstack/react-query';

export const useArticles = (blogId: string) => {
  return useQuery({
    queryKey: ['articles', blogId],
    queryFn: () => getArticlesByBlog(blogId),
  });
};

export const useArticle = (articleId: string) => {
  return useQuery({
    queryKey: ['article', articleId],
    queryFn: () => getArticle(articleId),
    enabled: !!articleId && isValidUUID(articleId),  // Updated validation
  });
};
```

---

## Testing Changes

### Unit Tests

#### Before Migration

```typescript
// __tests__/articleService.test.ts
describe('Article Service', () => {
  it('should fetch article by ID', async () => {
    const articleId = 456;
    const mockArticle = {
      id: 456,
      blog_id: 123,
      display_title: 'Test Article',
      // ...
    };
    
    fetchMock.mockResponseOnce(JSON.stringify(mockArticle));
    
    const article = await getArticle(articleId);
    
    expect(article.id).toBe(456);
    expect(typeof article.id).toBe('number');
  });
});
```

#### After Migration

```typescript
// __tests__/articleService.test.ts
describe('Article Service', () => {
  it('should fetch article by ID', async () => {
    const articleId = 'ckl9012ijkl3';
    const mockArticle = {
      id: 'ckl9012ijkl3',
      blog_id: 'ckl1234abcd5',
      display_title: 'Test Article',
      // ...
    };
    
    fetchMock.mockResponseOnce(JSON.stringify(mockArticle));
    
    const article = await getArticle(articleId);
    
    expect(article.id).toBe('ckl9012ijkl3');
    expect(typeof article.id).toBe('string');
    expect(article.id).toMatch(/^[a-z0-9]{12}$/i);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/articles.test.ts
describe('Articles Integration', () => {
  it('should create and retrieve article', async () => {
    // Create article
    const createData = {
      display_title: 'New Article',
      meta_title: 'New Article SEO',
      content: 'Content...',
      slug: 'new-article',
      blog_id: 'ckl1234abcd5',      // UUID
      author_id: 'cklmnopqrst2',    // UUID
      cover_image_id: 'cklabcdefgh1', // UUID
      status: 'draft',
    };
    
    const created = await createArticle(createData);
    
    expect(typeof created.id).toBe('string');
    expect(created.id).toMatch(/^[a-z0-9]{12}$/i);
    
    // Retrieve article
    const retrieved = await getArticle(created.id);
    
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.blog_id).toBe('ckl1234abcd5');
  });
});
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Comparing IDs with ===

**Problem:**
```typescript
// This will fail if one is string and one is number
if (article.blog_id === selectedBlogId) {
  // ...
}
```

**Solution:**
```typescript
// Ensure both are strings
if (article.blog_id === String(selectedBlogId)) {
  // ...
}

// Or use type-safe comparison
if (article.blog_id === selectedBlogId && typeof selectedBlogId === 'string') {
  // ...
}
```

### Pitfall 2: Sorting by ID

**Problem:**
```typescript
// Numeric sort won't work with UUIDs
articles.sort((a, b) => a.id - b.id);  // Type error!
```

**Solution:**
```typescript
// Use string comparison or sort by created_at
articles.sort((a, b) => a.created_at.localeCompare(b.created_at));

// Or use display_order field
articles.sort((a, b) => a.display_order - b.display_order);
```

### Pitfall 3: URL Parameters

**Problem:**
```typescript
// parseInt will return NaN for UUID
const id = parseInt(params.id, 10);  // NaN for "ckl1234abcd5"
```

**Solution:**
```typescript
// Use string directly
const id = params.id;

// Validate if needed
if (!isValidUUID(id)) {
  throw new Error('Invalid article ID');
}
```

### Pitfall 4: Database Queries (if using local DB)

**Problem:**
```typescript
// SQL query with integer comparison
SELECT * FROM articles WHERE id = 456;
```

**Solution:**
```typescript
// Use string comparison
SELECT * FROM articles WHERE id = 'ckl9012ijkl3';
```

---

## Migration Checklist by Framework

### React

- [ ] Update all interface/type definitions
- [ ] Update API service functions
- [ ] Update React Router params handling
- [ ] Update form handling (React Hook Form, Formik)
- [ ] Update state management (Redux, Zustand, Context)
- [ ] Update React Query/SWR hooks
- [ ] Clear local storage cache
- [ ] Update all tests
- [ ] Test in staging environment

### Next.js

- [ ] Update all interface/type definitions
- [ ] Update API routes (if using Next.js API routes)
- [ ] Update dynamic route params
- [ ] Update Server Components data fetching
- [ ] Update Client Components
- [ ] Update form actions
- [ ] Clear cache (localStorage, sessionStorage)
- [ ] Update all tests
- [ ] Test in staging environment

### Vue.js

- [ ] Update all interface/type definitions
- [ ] Update API service functions
- [ ] Update Vue Router params handling
- [ ] Update Pinia/Vuex stores
- [ ] Update composables
- [ ] Clear local storage cache
- [ ] Update all tests
- [ ] Test in staging environment

### Angular

- [ ] Update all interface/type definitions
- [ ] Update services
- [ ] Update route params handling
- [ ] Update NgRx stores (if using)
- [ ] Update forms (Reactive/Template-driven)
- [ ] Clear local storage cache
- [ ] Update all tests
- [ ] Test in staging environment

---

## Staging Environment

### Access

- **URL**: `https://staging-api.pppi.com.br`
- **Credentials**: [Contact your team lead]

### Test Data

Pre-populated test data with UUIDs:

```typescript
// Test Blog IDs
const TEST_BLOG_1 = 'ckltestblog1';
const TEST_BLOG_2 = 'ckltestblog2';

// Test Article IDs
const TEST_ARTICLE_1 = 'ckltestart01';
const TEST_ARTICLE_2 = 'ckltestart02';

// Test Author IDs
const TEST_AUTHOR_1 = 'ckltestauth1';
const TEST_AUTHOR_2 = 'ckltestauth2';
```

---

## Deployment Strategy

### Recommended Approach

1. **Week 1**: Development and testing
   - Update code in feature branch
   - Test locally with mocked UUID data
   - Create PR for review

2. **Week 2**: Staging deployment
   - Deploy to staging environment
   - Test with real migrated data
   - Fix any issues found

3. **Week 3**: Production deployment
   - Coordinate with backend team
   - Deploy frontend and backend simultaneously
   - Monitor for issues

### Rollback Plan

If issues are found after deployment:

1. Backend team can rollback database migration (48-hour window)
2. Frontend can rollback to previous version
3. Both must rollback together

---

## FAQ

### Q: Can I support both integer and UUID IDs during migration?

**A**: No. This is a breaking change with no backward compatibility. All clients must update simultaneously with the API migration.

### Q: What happens to my cached data?

**A**: Cached data with integer IDs will become invalid. Implement cache clearing on app update (see Local Storage section).

### Q: How do I test my changes before production?

**A**: Use the staging environment with pre-migrated data. Contact your team lead for access.

### Q: What if I find a bug after migration?

**A**: Report immediately to the backend team. There is a 48-hour rollback window.

### Q: Do I need to update my mobile app?

**A**: Yes. Mobile apps must be updated before or simultaneously with the API migration.

### Q: Can I use the old Blog.slug field?

**A**: No. The `slug` field has been removed from the Blog entity. Use the Blog `name` or Article `slug` instead.

---

## Support

### Resources

- API Changes Documentation: `docs/UUID-MIGRATION-API-CHANGES.md`
- Swagger Documentation: `/api/docs`
- Rollback Procedures: `docs/UUID-MIGRATION-API-CHANGES.md#rollback-procedures`

### Contact

- **Technical Questions**: [Your team contact]
- **Migration Issues**: [Support channel]
- **Staging Access**: [Team lead]

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-25  
**Status**: Ready for Review
