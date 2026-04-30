# Fix: Silent 503 Error on Large File Uploads

## Problem Description

Users were experiencing silent 503 errors when uploading certain JPG files around 1MB. Some files would upload successfully while others of similar size would fail without any error message in the response.

## Root Cause Analysis

The issue was caused by multiple factors:

1. **Connection Timeouts**: Express/NestJS default timeouts were too short for larger file uploads
2. **Unhandled Connection Errors**: Connection errors (ECONNRESET, EPIPE, ETIMEDOUT) were not being caught by the existing exception filters
3. **Silent Failures**: When connections were interrupted, the server would return a 503 status without a response body
4. **Missing Error Context**: No logging or detailed error messages to help diagnose upload failures

## Solution Implemented

### 1. Connection Error Filter (`src/shared/exceptions/connection-error.filter.ts`)

Created a global exception filter to catch connection-related errors that occur during uploads:

- Catches `ECONNRESET`, `EPIPE`, `ECONNABORTED`, `ETIMEDOUT` errors
- Provides user-friendly error messages explaining the issue
- Logs errors with context (URL, method, content-length) for debugging
- Returns proper JSON response instead of silent 503

### 2. Enhanced Multer Exception Filter (`src/shared/exceptions/multer-exception.filter.ts`)

Improved the existing Multer filter:

- Added logging for all Multer errors
- Enhanced error messages with more context
- Added handling for connection errors within Multer
- Prevents duplicate responses with `headersSent` check
- Includes timestamp and path in error responses

### 3. Upload Error Interceptor (`src/shared/interceptors/upload-error.interceptor.ts`)

Created a specialized interceptor for upload endpoints:

- Adds error handlers to request/response streams
- Categorizes errors (connection, timeout, payload size)
- Provides specific error messages for each error type
- Logs detailed context for debugging
- Applied to all upload controllers

### 4. Timeout Configuration (`src/main.ts`)

Enhanced server configuration:

- Increased timeout to 5 minutes for upload routes
- Added stream error handlers for requests and responses
- Detects upload routes automatically (paths with `/upload`, `/assets`, `/images`, or POST to `/articles/`)
- Proper TypeScript typing for Express middleware

### 5. Controller Updates

Updated all upload controllers to use the new interceptor:

- `article-image.controller.ts`
- `media-asset.controller.ts`
- `blog.controller.ts`

## Technical Details

### Error Handling Flow

```
1. Request arrives → Timeout middleware sets 5min timeout
2. Multer processes file → FileInterceptor (50MB limit)
3. Upload Error Interceptor → Catches stream errors
4. Controller logic → Processes upload
5. If error occurs:
   - Connection Error Filter (ECONNRESET, EPIPE, etc.)
   - Multer Exception Filter (LIMIT_FILE_SIZE, etc.)
   - Returns proper JSON response with error details
```

### Filter Order (Important!)

```typescript
app.useGlobalFilters(
  new ConnectionErrorFilter(),  // Must be first - catches connection errors
  new DomainExceptionFilter(),  // Domain-specific errors
  new MulterExceptionFilter()   // File upload errors
);
```

### Interceptor Usage

```typescript
@UseInterceptors(
  UploadErrorInterceptor,  // Must be before FileInterceptor
  FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 },
  }),
)
```

## Error Messages

Users now receive clear error messages:

| Error Type | Status | Message |
|------------|--------|---------|
| Connection Reset | 503 | "Connection was reset during upload. This usually happens with large files. Please try again or use a smaller file." |
| Broken Pipe | 503 | "Connection was closed unexpectedly. Please check your network and try again." |
| Timeout | 408 | "Upload timed out. Please try again with a smaller file." |
| File Too Large | 413 | "File size exceeds the maximum allowed limit (50 MB)." |

## Testing Recommendations

1. **Small files (< 1MB)**: Should upload instantly
2. **Medium files (1-10MB)**: Should upload within 30 seconds
3. **Large files (10-50MB)**: Should upload within 2-3 minutes
4. **Network interruption**: Should return clear error message
5. **Files > 50MB**: Should return 413 Payload Too Large

## Monitoring

All upload errors are now logged with context:

```typescript
{
  error: 'Connection reset',
  code: 'ECONNRESET',
  url: '/api/cms/articles/abc123/images',
  method: 'POST',
  contentLength: '1048576'
}
```

## Related Files

- `src/main.ts` - Timeout configuration
- `src/shared/exceptions/connection-error.filter.ts` - Connection error handling
- `src/shared/exceptions/multer-exception.filter.ts` - Enhanced Multer errors
- `src/shared/interceptors/upload-error.interceptor.ts` - Upload-specific interceptor
- `src/modules/zarp-cms/infrastructure/controllers/article-image.controller.ts`
- `src/modules/zarp-cms/infrastructure/controllers/media-asset.controller.ts`
- `src/modules/zarp-cms/infrastructure/controllers/blog.controller.ts`

## Notes

- The Vercel Blob provider already uses `multipart: true` to prevent 503 errors on their side
- The 50MB limit is a "network ceiling" - actual limits are enforced by media collection rules
- Timeouts are only applied to upload routes to avoid affecting other endpoints
- All changes are backward compatible with existing upload functionality
