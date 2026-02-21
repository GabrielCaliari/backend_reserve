# UUID Migration - Swagger Documentation Update Guide

## Overview

This document provides instructions for updating Swagger/OpenAPI documentation to reflect the UUID migration changes in the CMS module.

**Target**: Backend developers maintaining API documentation  
**Swagger Version**: OpenAPI 3.0  
**Framework**: NestJS with @nestjs/swagger

---

## Summary of Changes

All CMS entity IDs have changed from `number` to `string` (12-character UUID format). This affects:

1. **Path Parameters**: All `:id` parameters now accept strings
2. **Request Bodies**: All ID fields in DTOs now use strings
3. **Response Schemas**: All ID fields in responses now return strings
4. **Examples**: All example values updated to show UUID format

---

## DTO Updates

### Blog DTOs

#### CreateBlogDto

**Before:**
```typescript
// No changes needed - doesn't include ID
export class CreateBlogDto {
  @ApiProperty({ example: 'Tech Blog' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Technology articles', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'my-secret-key' })
  @IsString()
  secret_key: string;
}
```

**After:**
```typescript
// No changes needed - doesn't include ID
export class CreateBlogDto {
  @ApiProperty({ example: 'Tech Blog' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Technology articles', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'my-secret-key' })
  @IsString()
  secret_key: string;
}
```

#### BlogResponseDto

**Before:**
```typescript
export class BlogResponseDto {
  @ApiProperty({ example: 123 })
  id: number;

  @ApiProperty({ example: 'Tech Blog' })
  name: string;

  @ApiProperty({ example: 'tech-blog' })
  slug: string;

  @ApiProperty({ example: 'Technology articles', nullable: true })
  description: string | null;

  @ApiProperty({ example: 1 })
  tenant_id: number;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  created_at: string;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  updated_at: string;
}
```

**After:**
```typescript
export class BlogResponseDto {
  @ApiProperty({ 
    example: 'ckl1234abcd5',
    description: '12-character UUID identifier'
  })
  id: string;  // Changed from number

  @ApiProperty({ example: 'Tech Blog' })
  name: string;

  // slug field removed

  @ApiProperty({ example: 'Technology articles', nullable: true })
  description: string | null;

  @ApiProperty({ example: 1 })
  tenant_id: number;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  created_at: string;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  updated_at: string;
}
```

---

### Article DTOs

#### CreateArticleDto

**Before:**
```typescript
export class CreateArticleDto {
  @ApiProperty({ example: 'Getting Started with TypeScript' })
  @IsString()
  display_title: string;

  @ApiProperty({ example: 'TypeScript Guide 2024' })
  @IsString()
  @MaxLength(60)
  meta_title: string;

  @ApiProperty({ example: 'Complete guide to TypeScript', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  meta_description?: string;

  @ApiProperty({ example: 'typescript', required: false })
  @IsOptional()
  @IsString()
  focus_keyword?: string;

  @ApiProperty({ example: '# Introduction\n\nTypeScript is...' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'getting-started-typescript' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 123 })
  @IsNumber()
  blog_id: number;

  @ApiProperty({ example: 456 })
  @IsNumber()
  author_id: number;

  @ApiProperty({ example: 789, required: false })
  @IsOptional()
  @IsNumber()
  cover_image_id?: number;

  @ApiProperty({ example: 'draft', enum: ['draft', 'published', 'archived'] })
  @IsEnum(['draft', 'published', 'archived'])
  status: string;
}
```

**After:**
```typescript
export class CreateArticleDto {
  @ApiProperty({ example: 'Getting Started with TypeScript' })
  @IsString()
  display_title: string;

  @ApiProperty({ example: 'TypeScript Guide 2024' })
  @IsString()
  @MaxLength(60)
  meta_title: string;

  @ApiProperty({ example: 'Complete guide to TypeScript', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  meta_description?: string;

  @ApiProperty({ example: 'typescript', required: false })
  @IsOptional()
  @IsString()
  focus_keyword?: string;

  @ApiProperty({ example: '# Introduction\n\nTypeScript is...' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'getting-started-typescript' })
  @IsString()
  slug: string;

  @ApiProperty({ 
    example: 'ckl1234abcd5',
    description: 'Blog UUID (12 characters)'
  })
  @IsString()
  @Matches(/^[a-z0-9]{12}$/i, { message: 'blog_id must be a valid 12-character UUID' })
  blog_id: string;  // Changed from number

  @ApiProperty({ 
    example: 'cklmnopqrst2',
    description: 'Author UUID (12 characters)'
  })
  @IsString()
  @Matches(/^[a-z0-9]{12}$/i, { message: 'author_id must be a valid 12-character UUID' })
  author_id: string;  // Changed from number

  @ApiProperty({ 
    example: 'cklabcdefgh1',
    description: 'Cover image UUID (12 characters)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]{12}$/i, { message: 'cover_image_id must be a valid 12-character UUID' })
  cover_image_id?: string;  // Changed from number

  @ApiProperty({ example: 'draft', enum: ['draft', 'published', 'archived'] })
  @IsEnum(['draft', 'published', 'archived'])
  status: string;
}
```

#### ArticleResponseDto

**Before:**
```typescript
export class ArticleResponseDto {
  @ApiProperty({ example: 456 })
  id: number;

  @ApiProperty({ example: 'Getting Started with TypeScript' })
  display_title: string;

  @ApiProperty({ example: 'TypeScript Guide 2024' })
  meta_title: string;

  @ApiProperty({ example: 'Complete guide to TypeScript', nullable: true })
  meta_description: string | null;

  @ApiProperty({ example: 'typescript', nullable: true })
  focus_keyword: string | null;

  @ApiProperty({ example: '# Introduction\n\nTypeScript is...' })
  content: string;

  @ApiProperty({ example: 'getting-started-typescript' })
  slug: string;

  @ApiProperty({ example: 'published' })
  status: string;

  @ApiProperty({ example: 1 })
  display_order: number;

  @ApiProperty({ example: '2024-01-20T14:30:00Z', nullable: true })
  published_at: string | null;

  @ApiProperty({ example: 789, nullable: true })
  cover_image_id: number | null;

  @ApiProperty({ example: 456 })
  author_id: number;

  @ApiProperty({ example: 123 })
  blog_id: number;

  @ApiProperty({ example: 1 })
  created_by: number;

  @ApiProperty({ example: 1, nullable: true })
  last_edited_by: number | null;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  created_at: string;

  @ApiProperty({ example: '2024-01-20T14:30:00Z' })
  updated_at: string;
}
```

**After:**
```typescript
export class ArticleResponseDto {
  @ApiProperty({ 
    example: 'ckl9012ijkl3',
    description: '12-character UUID identifier'
  })
  id: string;  // Changed from number

  @ApiProperty({ example: 'Getting Started with TypeScript' })
  display_title: string;

  @ApiProperty({ example: 'TypeScript Guide 2024' })
  meta_title: string;

  @ApiProperty({ example: 'Complete guide to TypeScript', nullable: true })
  meta_description: string | null;

  @ApiProperty({ example: 'typescript', nullable: true })
  focus_keyword: string | null;

  @ApiProperty({ example: '# Introduction\n\nTypeScript is...' })
  content: string;

  @ApiProperty({ example: 'getting-started-typescript' })
  slug: string;

  @ApiProperty({ example: 'published' })
  status: string;

  @ApiProperty({ example: 1 })
  display_order: number;

  @ApiProperty({ example: '2024-01-20T14:30:00Z', nullable: true })
  published_at: string | null;

  @ApiProperty({ 
    example: 'cklabcdefgh1',
    description: 'Cover image UUID',
    nullable: true 
  })
  cover_image_id: string | null;  // Changed from number

  @ApiProperty({ 
    example: 'cklmnopqrst2',
    description: 'Author UUID'
  })
  author_id: string;  // Changed from number

  @ApiProperty({ 
    example: 'ckl1234abcd5',
    description: 'Blog UUID'
  })
  blog_id: string;  // Changed from number

  @ApiProperty({ example: 1 })
  created_by: number;  // Remains number (Admin ID)

  @ApiProperty({ example: 1, nullable: true })
  last_edited_by: number | null;  // Remains number (Admin ID)

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  created_at: string;

  @ApiProperty({ example: '2024-01-20T14:30:00Z' })
  updated_at: string;
}
```

---

### Author DTOs

#### CreateAuthorDto

**Before:**
```typescript
export class CreateAuthorDto {
  @ApiProperty({ example: 'João' })
  @IsString()
  first_name: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  last_name: string;

  @ApiProperty({ example: 'Senior developer with 10 years experience', required: false })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiProperty({ example: 789, required: false })
  @IsOptional()
  @IsNumber()
  avatar_id?: number;
}
```

**After:**
```typescript
export class CreateAuthorDto {
  @ApiProperty({ example: 'João' })
  @IsString()
  first_name: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  last_name: string;

  @ApiProperty({ example: 'Senior developer with 10 years experience', required: false })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiProperty({ 
    example: 'cklabcdefgh1',
    description: 'Avatar image UUID (12 characters)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]{12}$/i, { message: 'avatar_id must be a valid 12-character UUID' })
  avatar_id?: string;  // Changed from number
}
```

---

### MediaAsset DTOs

#### UploadMediaAssetDto

**Before:**
```typescript
export class UploadMediaAssetDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ example: 10 })
  @IsNumber()
  collection_id: number;

  @ApiProperty({ example: 'Sample image', required: false })
  @IsOptional()
  @IsString()
  alt_text?: string;
}
```

**After:**
```typescript
export class UploadMediaAssetDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ 
    example: 'cklcollect99',
    description: 'Collection UUID (12 characters)'
  })
  @IsString()
  @Matches(/^[a-z0-9]{12}$/i, { message: 'collection_id must be a valid 12-character UUID' })
  collection_id: string;  // Changed from number

  @ApiProperty({ example: 'Sample image', required: false })
  @IsOptional()
  @IsString()
  alt_text?: string;
}
```

#### MediaAssetResponseDto

**Before:**
```typescript
export class MediaAssetResponseDto {
  @ApiProperty({ example: 789 })
  id: number;

  @ApiProperty({ example: 'https://s3.amazonaws.com/bucket/image.jpg' })
  url: string;

  @ApiProperty({ example: 'uploads/2024/01/image.jpg' })
  storage_key: string;

  @ApiProperty({ example: 'image.jpg' })
  filename: string;

  @ApiProperty({ example: 'image/jpeg' })
  mime_type: string;

  @ApiProperty({ example: 245678 })
  file_size: number;

  @ApiProperty({ example: 1920, nullable: true })
  width: number | null;

  @ApiProperty({ example: 1080, nullable: true })
  height: number | null;

  @ApiProperty({ example: 'Sample image', nullable: true })
  alt_text: string | null;

  @ApiProperty({ example: 'ready' })
  status: string;

  @ApiProperty({ example: 10 })
  collection_id: number;

  @ApiProperty({ example: 1 })
  tenant_id: number;

  @ApiProperty({ example: 1 })
  created_by: number;

  @ApiProperty({ example: '2024-01-15T11:00:00Z' })
  created_at: string;

  @ApiProperty({ example: '2024-01-15T11:00:00Z' })
  updated_at: string;
}
```

**After:**
```typescript
export class MediaAssetResponseDto {
  @ApiProperty({ 
    example: 'cklabcdefgh1',
    description: '12-character UUID identifier'
  })
  id: string;  // Changed from number

  @ApiProperty({ example: 'https://s3.amazonaws.com/bucket/image.jpg' })
  url: string;

  @ApiProperty({ example: 'uploads/2024/01/image.jpg' })
  storage_key: string;

  @ApiProperty({ example: 'image.jpg' })
  filename: string;

  @ApiProperty({ example: 'image/jpeg' })
  mime_type: string;

  @ApiProperty({ example: 245678 })
  file_size: number;

  @ApiProperty({ example: 1920, nullable: true })
  width: number | null;

  @ApiProperty({ example: 1080, nullable: true })
  height: number | null;

  @ApiProperty({ example: 'Sample image', nullable: true })
  alt_text: string | null;

  @ApiProperty({ example: 'ready' })
  status: string;

  @ApiProperty({ 
    example: 'cklcollect99',
    description: 'Collection UUID'
  })
  collection_id: string;  // Changed from number

  @ApiProperty({ example: 1 })
  tenant_id: number;

  @ApiProperty({ example: 1 })
  created_by: number;

  @ApiProperty({ example: '2024-01-15T11:00:00Z' })
  created_at: string;

  @ApiProperty({ example: '2024-01-15T11:00:00Z' })
  updated_at: string;
}
```

---

## Controller Updates

### Path Parameter Decorators

**Before:**
```typescript
@Get(':id')
@ApiOperation({ summary: 'Get blog by ID' })
@ApiParam({ name: 'id', type: 'number', example: 123 })
@ApiResponse({ status: 200, type: BlogResponseDto })
@ApiResponse({ status: 404, description: 'Blog not found' })
async findOne(@Param('id', ParseIntPipe) id: number) {
  return this.blogService.findById(id);
}
```

**After:**
```typescript
@Get(':id')
@ApiOperation({ summary: 'Get blog by ID' })
@ApiParam({ 
  name: 'id', 
  type: 'string', 
  example: 'ckl1234abcd5',
  description: '12-character UUID identifier'
})
@ApiResponse({ status: 200, type: BlogResponseDto })
@ApiResponse({ status: 404, description: 'Blog not found' })
@ApiResponse({ 
  status: 400, 
  description: 'Invalid UUID format',
  schema: {
    example: {
      statusCode: 400,
      message: 'Invalid UUID format for blog ID',
      error: 'Bad Request'
    }
  }
})
async findOne(@Param('id') id: string) {  // Remove ParseIntPipe, add UUID validation
  return this.blogService.findById(id);
}
```

### Query Parameter Decorators

**Before:**
```typescript
@Get()
@ApiOperation({ summary: 'List articles by blog' })
@ApiQuery({ name: 'blog_id', type: 'number', example: 123 })
@ApiQuery({ name: 'page', type: 'number', example: 1, required: false })
@ApiQuery({ name: 'limit', type: 'number', example: 10, required: false })
async findAll(
  @Query('blog_id', ParseIntPipe) blogId: number,
  @Query('page') page?: number,
  @Query('limit') limit?: number,
) {
  return this.articleService.findByBlogId(blogId, { page, limit });
}
```

**After:**
```typescript
@Get()
@ApiOperation({ summary: 'List articles by blog' })
@ApiQuery({ 
  name: 'blog_id', 
  type: 'string', 
  example: 'ckl1234abcd5',
  description: 'Blog UUID (12 characters)'
})
@ApiQuery({ name: 'page', type: 'number', example: 1, required: false })
@ApiQuery({ name: 'limit', type: 'number', example: 10, required: false })
async findAll(
  @Query('blog_id') blogId: string,  // Remove ParseIntPipe
  @Query('page') page?: number,
  @Query('limit') limit?: number,
) {
  return this.articleService.findByBlogId(blogId, { page, limit });
}
```

---

## Swagger Configuration Updates

### main.ts Updates

**Before:**
```typescript
const config = new DocumentBuilder()
  .setTitle('Zarp Admin API')
  .setDescription('API de gerenciamento e administração do sistema Zarp')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Event Notification (SMS)')
  .addTag('Lead Management')
  .addTag('Email Campaign')
  .addTag('Config (SMTP Server)')
  .build();
```

**After:**
```typescript
const config = new DocumentBuilder()
  .setTitle('Zarp Admin API')
  .setDescription(`
    API de gerenciamento e administração do sistema Zarp
    
    ## Módulos API
    - **CMS**: Sistema de gerenciamento de conteúdo (Blog, Article, Author)
    - **Media**: Gerenciamento de assets e coleções
    - **Event Notification (SMS)**: Gestão de notificações SMS
    - **Lead Management**: Gerenciamento de leads
    - **Email Campaign**: Campanhas de email marketing
    
    ## UUID Migration (v2.6.0)
    A partir da versão 2.6.0, todos os IDs de entidades CMS usam UUID (12 caracteres).
    
    **Formato UUID**: String de 12 caracteres alfanuméricos (ex: "ckl1234abcd5")
    
    **Entidades afetadas**:
    - Blog.id
    - Article.id, Article.blog_id, Article.author_id, Article.cover_image_id
    - Author.id, Author.avatar_id
    - MediaAsset.id, MediaAsset.collection_id
    - MediaCollection.id
    - MediaAssetRelation.id, MediaAssetRelation.asset_id
    
    **Documentação completa**: /docs/UUID-MIGRATION-API-CHANGES.md
  `)
  .setVersion('2.6.0')  // Update version
  .addBearerAuth()
  .addTag('CMS - Blog', 'Gerenciamento de blogs')
  .addTag('CMS - Article', 'Gerenciamento de artigos')
  .addTag('CMS - Author', 'Gerenciamento de autores')
  .addTag('Media - Asset', 'Gerenciamento de assets de mídia')
  .addTag('Media - Collection', 'Gerenciamento de coleções de mídia')
  .addTag('Event Notification (SMS)')
  .addTag('Lead Management')
  .addTag('Email Campaign')
  .build();
```

---

## Example Responses

### Blog Endpoints

#### GET /api/v2/cms/blogs/:id

**Example Request:**
```http
GET /api/v2/cms/blogs/ckl1234abcd5
Authorization: Bearer <token>
```

**Example Response (200):**
```json
{
  "id": "ckl1234abcd5",
  "name": "Tech Blog",
  "description": "Technology articles",
  "tenant_id": 1,
  "active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Example Response (404):**
```json
{
  "statusCode": 404,
  "message": "Blog not found",
  "error": "Not Found",
  "details": {
    "id": "cklnotfound1"
  }
}
```

**Example Response (400 - Invalid UUID):**
```json
{
  "statusCode": 400,
  "message": "Invalid UUID format for blog ID",
  "error": "Bad Request",
  "details": {
    "field": "id",
    "value": "123",
    "expected": "12-character UUID string (e.g., 'ckl1234abcd5')"
  }
}
```

---

## Validation Pipe for UUID

Create a custom validation pipe for UUID parameters:

```typescript
// common/pipes/uuid-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class UuidValidationPipe implements PipeTransform<string, string> {
  private readonly UUID_REGEX = /^[a-z0-9]{12}$/i;

  transform(value: string): string {
    if (!this.UUID_REGEX.test(value)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid UUID format',
        error: 'Bad Request',
        details: {
          value,
          expected: '12-character UUID string (e.g., "ckl1234abcd5")',
        },
      });
    }
    return value;
  }
}
```

**Usage in controllers:**
```typescript
@Get(':id')
async findOne(@Param('id', UuidValidationPipe) id: string) {
  return this.blogService.findById(id);
}
```

---

## Testing Swagger Documentation

### Manual Testing

1. Start the application:
```bash
pnpm start:dev
```

2. Open Swagger UI:
```
http://localhost:3000/api/docs
```

3. Verify:
   - [ ] All CMS endpoints show string type for ID parameters
   - [ ] Example values show UUID format (12 characters)
   - [ ] Request/response schemas show correct types
   - [ ] Error responses documented
   - [ ] Descriptions mention UUID format

### Automated Testing

```typescript
// test/swagger.e2e-spec.ts
describe('Swagger Documentation (e2e)', () => {
  it('should have UUID format in Blog schema', () => {
    const swaggerDoc = getSwaggerDocument();
    const blogSchema = swaggerDoc.components.schemas.BlogResponseDto;
    
    expect(blogSchema.properties.id.type).toBe('string');
    expect(blogSchema.properties.id.example).toMatch(/^[a-z0-9]{12}$/i);
  });

  it('should have UUID format in Article schema', () => {
    const swaggerDoc = getSwaggerDocument();
    const articleSchema = swaggerDoc.components.schemas.ArticleResponseDto;
    
    expect(articleSchema.properties.id.type).toBe('string');
    expect(articleSchema.properties.blog_id.type).toBe('string');
    expect(articleSchema.properties.author_id.type).toBe('string');
    expect(articleSchema.properties.cover_image_id.type).toBe('string');
  });
});
```

---

## Checklist

### DTOs
- [ ] Update all ID fields from `number` to `string`
- [ ] Update `@ApiProperty` examples to UUID format
- [ ] Add UUID validation with `@Matches` decorator
- [ ] Add descriptions mentioning UUID format
- [ ] Remove Blog.slug field from DTOs

### Controllers
- [ ] Update `@ApiParam` decorators to string type
- [ ] Update `@ApiQuery` decorators for ID parameters
- [ ] Add UUID validation pipes
- [ ] Update example values to UUID format
- [ ] Add 400 error responses for invalid UUID

### Swagger Config
- [ ] Update API description with UUID migration info
- [ ] Update version number
- [ ] Add CMS tags
- [ ] Add migration documentation link

### Testing
- [ ] Test Swagger UI manually
- [ ] Verify all examples show UUID format
- [ ] Verify error responses documented
- [ ] Run automated Swagger tests

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-25  
**Status**: Ready for Implementation
