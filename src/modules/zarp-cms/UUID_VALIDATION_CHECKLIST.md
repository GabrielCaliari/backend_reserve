# UUID Validation Implementation Checklist

This document tracks where UUID validation needs to be applied across the CMS module as part of the UUID migration (Requirements 18.4, 18.5).

## Validation Utilities Created ✅

- [x] `isValidUUID()` helper function - `src/modules/zarp-cms/domain/utils/uuid.util.ts`
- [x] `validateUUID()` helper function - `src/modules/zarp-cms/domain/utils/uuid.util.ts`
- [x] `UuidValidationPipe` - `src/modules/zarp-cms/infrastructure/pipes/uuid-validation.pipe.ts`
- [x] Unit tests for utilities
- [x] Documentation

## Entities Using UUID (12-character cuid)

Based on requirements-uuid-expansion.md, the following entities use UUID:

1. **Blog** (Requirement 1)
   - `Blog.id` - String UUID

2. **Article** (Requirement 13)
   - `Article.id` - String UUID
   - `Article.blog_id` - Foreign key to Blog UUID

3. **Author** (Requirement 14)
   - `Author.id` - String UUID
   - `Article.author_id` - Foreign key to Author UUID

4. **MediaAsset** (Requirement 15)
   - `MediaAsset.id` - String UUID
   - `Article.cover_image_id` - Foreign key to MediaAsset UUID
   - `Author.avatar_id` - Foreign key to MediaAsset UUID

5. **MediaCollection** (Requirement 16)
   - `MediaCollection.id` - String UUID
   - `MediaAsset.collection_id` - Foreign key to MediaCollection UUID

6. **MediaAssetRelation** (Requirement 17)
   - `MediaAssetRelation.id` - String UUID
   - `MediaAssetRelation.asset_id` - Foreign key to MediaAsset UUID
   - `MediaAssetRelation.entity_id` - Polymorphic (can be Int or UUID)

## Where to Apply UUID Validation

### Blog Controller
- [ ] `GET /blogs/:id` - Validate `id` parameter
- [ ] `PUT /blogs/:id` - Validate `id` parameter
- [ ] `DELETE /blogs/:id` - Validate `id` parameter
- [ ] `GET /blogs/:id/articles` - Validate `id` parameter

### Article Controller
- [ ] `GET /articles/:id` - Validate `id` parameter
- [ ] `PUT /articles/:id` - Validate `id` parameter
- [ ] `DELETE /articles/:id` - Validate `id` parameter
- [ ] `GET /blogs/:blogId/articles` - Validate `blogId` parameter
- [ ] `POST /blogs/:blogId/articles` - Validate `blogId` parameter
- [ ] `GET /blogs/:blogId/articles/:articleId` - Validate both IDs
- [ ] Query parameters: `blogId`, `authorId` when used for filtering

### Author Controller
- [ ] `GET /authors/:id` - Validate `id` parameter
- [ ] `PUT /authors/:id` - Validate `id` parameter
- [ ] `DELETE /authors/:id` - Validate `id` parameter
- [ ] Query parameters: `avatarId` when used

### MediaAsset Controller
- [ ] `GET /media-assets/:id` - Validate `id` parameter
- [ ] `PUT /media-assets/:id` - Validate `id` parameter
- [ ] `DELETE /media-assets/:id` - Validate `id` parameter
- [ ] `GET /collections/:collectionId/assets` - Validate `collectionId` parameter
- [ ] Query parameters: `collectionId` when used for filtering

### MediaCollection Controller
- [ ] `GET /collections/:id` - Validate `id` parameter
- [ ] `PUT /collections/:id` - Validate `id` parameter
- [ ] `DELETE /collections/:id` - Validate `id` parameter

### DTOs (Data Transfer Objects)
- [ ] `CreateArticleDTO` - Validate `blog_id`, `author_id`, `cover_image_id`
- [ ] `UpdateArticleDTO` - Validate `author_id`, `cover_image_id` if provided
- [ ] `CreateAuthorDTO` - Validate `avatar_id` if provided
- [ ] `UpdateAuthorDTO` - Validate `avatar_id` if provided
- [ ] `CreateMediaAssetDTO` - Validate `collection_id`
- [ ] `UpdateMediaAssetDTO` - Validate `collection_id` if provided

## Implementation Pattern

### Controller Route Parameters

```typescript
import { UuidValidationPipe } from '../infrastructure/pipes';

@Get(':id')
async findOne(@Param('id', UuidValidationPipe) id: string) {
  // id is validated automatically
}

@Get(':blogId/articles/:articleId')
async findArticle(
  @Param('blogId', UuidValidationPipe) blogId: string,
  @Param('articleId', UuidValidationPipe) articleId: string,
) {
  // Both IDs are validated
}
```

### DTO Validation

```typescript
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleDTO {
  @ApiProperty({ 
    description: 'Blog UUID',
    example: 'ckl1234abcd5',
    pattern: '^[a-z0-9]{12}$'
  })
  @IsString()
  @Matches(/^[a-z0-9]{12}$/i, {
    message: 'blog_id must be a valid 12-character UUID'
  })
  blog_id: string;

  @ApiProperty({ 
    description: 'Author UUID',
    example: 'ckl5678efgh9',
    pattern: '^[a-z0-9]{12}$'
  })
  @IsString()
  @Matches(/^[a-z0-9]{12}$/i, {
    message: 'author_id must be a valid 12-character UUID'
  })
  author_id: string;
}
```

### Service Layer Validation

```typescript
import { validateUUID } from '../domain/utils/uuid.util';

async findById(id: string): Promise<Article | null> {
  // Validate before database query
  validateUUID(id, 'articleId');
  
  return this.articleRepo.findById(id);
}
```

## Testing Requirements

Each controller endpoint with UUID parameters should have tests for:
- ✅ Valid UUID format (12 characters, alphanumeric)
- ✅ Invalid UUID format (wrong length, special characters)
- ✅ Empty string
- ✅ Non-string values
- ✅ Error message clarity

## Next Steps

1. Apply `UuidValidationPipe` to all controller route parameters
2. Add UUID validation to DTOs using `@Matches()` decorator
3. Update service layer to validate UUIDs before database operations
4. Update API documentation (Swagger) with UUID format examples
5. Create integration tests for UUID validation
6. Update frontend documentation with UUID format requirements

## References

- **Requirements**: 18.4, 18.5 in requirements-uuid-expansion.md
- **Utility Functions**: `src/modules/zarp-cms/domain/utils/uuid.util.ts`
- **Validation Pipe**: `src/modules/zarp-cms/infrastructure/pipes/uuid-validation.pipe.ts`
- **Documentation**: `src/modules/zarp-cms/domain/utils/README.md`
