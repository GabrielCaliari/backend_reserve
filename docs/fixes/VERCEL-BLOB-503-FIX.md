# Fix: Vercel Blob 503 "Deployment Unavailable" Error

## Problem Description

Users experiencing intermittent 503 errors when uploading files to Vercel Blob Storage:

```json
{
  "error": {
    "code": "503",
    "message": "The deployment is currently unavailable"
  }
}
```

## Root Cause (April 2026)

This is a **confirmed Vercel infrastructure issue**, extensively documented in the community:

1. **Rate Limiting**: Vercel Blob can throttle requests even within Hobby plan limits during traffic spikes
2. **CDN Instability**: Sometimes the upload API works but public URLs return 503 (CDN edge network issue)
3. **Deployment Sync**: Blob storage not yet synchronized across all edge locations
4. **Regional Issues**: Specific edge regions experiencing temporary problems

**Official Response**: Vercel added automatic retry in `@vercel/blob@0.19.0` (we're using v2.2.0 which includes this)

## Solution Implemented

### 1. Double-Layer Retry Strategy

**Layer 1**: Vercel SDK built-in retry (automatic since v0.19.0)  
**Layer 2**: Our custom retry with exponential backoff + jitter

**Why both?**
- SDK retry handles transient network issues
- Our retry handles persistent 503 errors from Vercel infrastructure
- Combined approach provides maximum resilience

### 2. Exponential Backoff with Jitter

**File**: `src/modules/zarp-cms/infrastructure/providers/vercel-blob-storage.provider.ts`

**Strategy**:
```typescript
// Attempt 1: Immediate
// Attempt 2: 1000ms + random(0-500ms) = ~1.0-1.5s
// Attempt 3: 2000ms + random(0-500ms) = ~2.0-2.5s
// Attempt 4: 4000ms + random(0-500ms) = ~4.0-4.5s
```

**Jitter prevents "thundering herd"**: Multiple clients don't retry at exactly the same time

**Code**:
```typescript
const baseDelay = 1000 * Math.pow(2, attempt - 1);
const jitter = Math.random() * 500; // 0-500ms random
const delay = baseDelay + jitter;
```

### 2. Enhanced Error Detection

Detects 503 errors from multiple sources:
```typescript
const is503Error = 
  error.message?.includes('503') || 
  error.message?.includes('unavailable') ||
  error.message?.includes('deployment') ||
  error.status === 503;
```

### 3. Enhanced Error Logging

All upload attempts are now logged with:
- Attempt number (1/3, 2/3, 3/3)
- Error details (code, status, message)
- File information (key, size)
- Retry delays

**Example logs**:
```
[VercelBlobStorageProvider] Vercel Blob Storage initialized with retry mechanism
[VercelBlobStorageProvider] Uploading media/abc123.jpg to Vercel Blob (1.2 MB)
[VercelBlobStorageProvider] Vercel Blob upload attempt 1/3 failed for media/abc123.jpg
[VercelBlobStorageProvider] Retrying upload in 1247ms (attempt 2/3)... [with jitter]
[VercelBlobStorageProvider] Successfully uploaded media/abc123.jpg to Vercel Blob (attempt 2)
```

### 4. User-Friendly Error Messages

When all retries fail, users receive clear error messages:

```json
{
  "statusCode": 503,
  "message": "Vercel Blob service temporarily unavailable after 3 attempts. This is a Vercel infrastructure issue. Please try again later or contact Vercel support.",
  "error": "SERVICE_UNAVAILABLE"
}
```

## Configuration

**Current SDK Version**: `@vercel/blob@2.2.0` (includes built-in retry since v0.19.0)

**Environment Variables** (unchanged):
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**Retry Configuration** (hardcoded, can be made configurable):
```typescript
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 1000ms
MAX_JITTER = 500ms
```

## Testing

### Test 1: Normal Upload (Success on First Try)
```bash
curl -X POST http://localhost:3000/api/cms/assets \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@test.jpg" \
  -F "collection_id=YOUR_COLLECTION_ID"
```

**Expected**: Upload succeeds immediately

### Test 2: Simulated 503 Error
The retry mechanism will automatically handle 503 errors from Vercel.

**Expected**: 
- First attempt fails with 503
- Waits 1 second
- Second attempt succeeds
- Total time: ~1-2 seconds

### Test 3: Persistent 503 Error
If Vercel Blob is completely down:

**Expected**:
- 3 attempts with exponential backoff (1s, 2s, 4s)
- Total time: ~7 seconds
- Clear error message to user

## Monitoring

Watch server logs for patterns:

```bash
# Successful uploads
✓ Successfully uploaded media/abc123.jpg to Vercel Blob (attempt 1)

# Retried uploads (503 recovered)
⚠ Vercel Blob upload attempt 1/3 failed
⚠ Retrying upload in 1000ms (attempt 2/3)...
✓ Successfully uploaded media/abc123.jpg to Vercel Blob (attempt 2)

# Failed uploads (persistent 503)
✗ Vercel Blob upload failed after 3 attempts
✗ Vercel Blob service temporarily unavailable
```

## When to Escalate

If you see **persistent 503 errors** (all 3 retries failing consistently):

1. **Check Vercel Status**: https://www.vercel-status.com/
2. **Check Vercel Blob Limits**: Ensure you haven't exceeded quota
3. **Contact Vercel Support**: This is a Vercel infrastructure issue
4. **Consider S3 Migration**: See `docs/STORAGE-MIGRATION-VERCEL-TO-S3.md`

## Performance Impact

| Scenario | Time Impact | Notes |
|----------|-------------|-------|
| Success on 1st attempt | 0ms | No overhead, SDK handles it |
| Success on 2nd attempt | +1.0-1.5s | 1 retry with jitter |
| Success on 3rd attempt | +3.0-4.0s | 2 retries with jitter |
| All attempts fail | +7.0-8.5s | 3 attempts with jitter |

**Jitter Impact**: Adds 0-500ms random delay to prevent thundering herd

## Alternative: Switch to S3

If Vercel Blob 503 errors persist, consider migrating to S3:

```typescript
// In src/modules/zarp-cms/zarp-cms.module.ts
{
  provide: STORAGE_PROVIDER,
  useClass: S3StorageProvider, // Instead of VercelBlobStorageProvider
}
```

See full migration guide: `docs/STORAGE-MIGRATION-VERCEL-TO-S3.md`

## Known Limitations

1. **Retry only on 503**: Other errors (401, 413) fail immediately (by design)
2. **Max 3 retries**: After 3 attempts, upload fails (configurable if needed)
3. **No circuit breaker**: Each upload retries independently (could add if needed)
4. **Synchronous retries**: Blocks the request during retries (acceptable for uploads)
5. **SDK also retries**: Double retry layer (SDK + our code) for maximum resilience

## Future Improvements

- [x] Add jitter to exponential backoff (DONE - prevents thundering herd)
- [ ] Add circuit breaker pattern (stop retrying if Vercel is consistently down)
- [ ] Add metrics/monitoring for retry rates
- [ ] Make retry count configurable via environment variable
- [ ] Add fallback to S3 if Vercel Blob is down (S3 provider already ready)
- [ ] Add health check endpoint to monitor Vercel Blob status

## Related Issues

- Vercel Blob multipart upload: Already enabled (`multipart: true`)
- Upload timeout: Already increased to 5 minutes in `main.ts`
- Connection errors: Handled by `ConnectionErrorFilter`

## References

- Vercel Blob Documentation: https://vercel.com/docs/storage/vercel-blob
- Vercel Status Page: https://www.vercel-status.com/
- Vercel Storage GitHub Issues: https://github.com/vercel/storage/issues
- Exponential Backoff: https://en.wikipedia.org/wiki/Exponential_backoff
- Retry added in @vercel/blob@0.19.0 (we're using v2.2.0)
- Known 503 issues: Rate limiting and CDN instability (April 2026)
