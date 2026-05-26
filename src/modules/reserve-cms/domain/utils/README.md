# UUID Validation Utilities

This directory contains utilities for validating UUID format used in the CMS module.

## UUID Format

The CMS module uses **cuid** format for UUIDs:
- **Length**: 12 characters
- **Characters**: Alphanumeric (a-z, A-Z, 0-9)
- **Case**: Case-insensitive
- **Example**: `ckl1234abcd5`

## Available Functions

### `isValidUUID(id: string): boolean`

Validates whether a string matches the UUID format.

**Parameters:**
- `id` - The UUID string to validate

**Returns:**
- `true` if valid UUID format
- `false` otherwise

**Example:**
```typescript
import { isValidUUID } from './uuid.util';

if (isValidUUID('ckl1234abcd5')) {
  console.log('Valid UUID');
}

if (!isValidUUID('invalid')) {
  console.log('Invalid UUID');
}
```

### `validateUUID(id: string, fieldName?: string): void`

Validates a UUID and throws an error if invalid.

**Parameters:**
- `id` - The UUID string to validate
- `fieldName` - Optional field name for error messages (defaults to "ID")

**Throws:**
- `Error` if UUID format is invalid

**Example:**
```typescript
import { validateUUID } from './uuid.util';

try {
  validateUUID('ckl1234abcd5', 'blogId');
  // Continues if valid
} catch (error) {
  console.error(error.message); // "Invalid UUID format for blogId: ..."
}
```

## Usage in Controllers

For automatic validation in NestJS controllers, use the `UuidValidationPipe`:

```typescript
import { UuidValidationPipe } from '../../infrastructure/pipes';

@Controller('blogs')
export class BlogController {
  // Validate route parameter
  @Get(':id')
  async findOne(@Param('id', UuidValidationPipe) id: string) {
    // id is guaranteed to be valid UUID format
  }

  // Validate query parameter
  @Get()
  async findByBlog(@Query('blogId', UuidValidationPipe) blogId: string) {
    // blogId is guaranteed to be valid UUID format
  }

  // Validate multiple parameters
  @Get(':blogId/articles/:articleId')
  async findArticle(
    @Param('blogId', UuidValidationPipe) blogId: string,
    @Param('articleId', UuidValidationPipe) articleId: string,
  ) {
    // Both IDs are validated
  }
}
```

## Error Handling

When validation fails, the pipe throws a `BadRequestException` with a descriptive message:

```
Invalid UUID format for blogId: invalid. Expected 12-character alphanumeric string (cuid format).
```

This provides clear feedback to API consumers about the expected format.

## Testing

Both utilities have comprehensive unit tests:
- `uuid.util.spec.ts` - Tests for utility functions
- `uuid-validation.pipe.spec.ts` - Tests for the validation pipe

Run tests with:
```bash
pnpm test uuid.util.spec
pnpm test uuid-validation.pipe.spec
```
