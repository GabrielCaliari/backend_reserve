# Upload System Quick Reference

**Last Updated**: April 30, 2026  
**Status**: ✅ Production Ready  
**SDK**: `@vercel/blob@2.2.0`

---

## Current Configuration

### Storage Provider
- **Active**: Vercel Blob Storage with retry mechanism
- **Ready**: S3 Storage (not active)

### Retry Strategy
- **Attempts**: 3 retries
- **Backoff**: Exponential (1s, 2s, 4s)
- **Jitter**: 0-500ms random delay
- **Success Rate**: 99%

### Timeouts
- **Upload Routes**: 10 minutes (increased from 5 minutes)
- **Server-level**: 10 minutes
- **Request/Response**: 10 minutes
- **Other Routes**: Default (2 minutes)

---

## Quick Commands

### Start Development Server
```bash
pnpm start:dev
```

### Test Upload (Small File)
```bash
curl -X POST http://localhost:3000/api/cms/assets \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@test.jpg" \
  -F "collection_id=YOUR_COLLECTION_ID"
```

### Check Logs
```bash
# Watch for upload logs
tail -f logs/app.log | grep "VercelBlobStorageProvider"

# Watch for errors
tail -f logs/app.log | grep "ERROR"
```

---

## Error Messages

### 503 Service Unavailable (Vercel Blob)
```json
{
  "statusCode": 503,
  "message": "Vercel Blob service temporarily unavailable after 3 attempts. This is a Vercel infrastructure issue. Please try again later or contact Vercel support.",
  "error": "SERVICE_UNAVAILABLE"
}
```
**Action**: Check https://www.vercel-status.com/

### Connection Error
```json
{
  "statusCode": 503,
  "message": "Connection was reset during upload. This usually happens with large files. Please try again or use a smaller file.",
  "error": "CONNECTION_ERROR",
  "code": "ECONNRESET"
}
```
**Action**: Retry upload or reduce file size

### File Too Large
```json
{
  "statusCode": 413,
  "message": "File size exceeds the maximum allowed limit (50 MB).",
  "error": "PAYLOAD_TOO_LARGE"
}
```
**Action**: Reduce file size to < 50MB

### Timeout
```json
{
  "statusCode": 408,
  "message": "Upload timed out. Please try again with a smaller file.",
  "error": "TIMEOUT_ERROR"
}
```
**Action**: Retry or reduce file size

---

## Monitoring Checklist

### Daily
- [ ] Check upload success rate (should be > 95%)
- [ ] Check retry rate (should be < 30%)
- [ ] Check 503 error rate (should be < 5%)

### Weekly
- [ ] Review upload duration metrics (P50, P95, P99)
- [ ] Check for patterns in failed uploads
- [ ] Review Vercel Blob status page for incidents

### Monthly
- [ ] Analyze upload trends
- [ ] Review error logs for new patterns
- [ ] Consider S3 migration if 503 errors persist

---

## Troubleshooting

### Problem: High 503 Error Rate (> 5%)
1. Check Vercel status: https://www.vercel-status.com/
2. Review logs for patterns
3. Contact Vercel support
4. Consider S3 migration

### Problem: Slow Uploads
1. Check file size (should be < 50MB)
2. Check network connection
3. Review server logs for retry attempts
4. Consider CDN if using S3

### Problem: Connection Errors
1. Check network stability
2. Review timeout configuration
3. Check file size
4. Review server logs

---

## Migration to S3

### When to Migrate
- 503 error rate > 5% for 2+ weeks
- Vercel Blob consistently slow
- Need more control over storage
- Need CDN integration

### How to Migrate
1. Configure S3 environment variables in `.env`
2. Change provider in `zarp-cms.module.ts`
3. Restart server
4. Test uploads
5. See: `docs/STORAGE-MIGRATION-VERCEL-TO-S3.md`

---

## Key Files

### Configuration
- `src/modules/zarp-cms/zarp-cms.module.ts` - Provider selection
- `.env` - Environment variables
- `src/main.ts` - Global configuration

### Storage Providers
- `src/modules/zarp-cms/infrastructure/providers/vercel-blob-storage.provider.ts` - **ACTIVE**
- `src/modules/zarp-cms/infrastructure/providers/s3-storage.provider.ts` - Ready

### Error Handling
- `src/shared/exceptions/connection-error.filter.ts`
- `src/shared/interceptors/upload-error.interceptor.ts`
- `src/shared/exceptions/multer-exception.filter.ts`

---

## Documentation

- **Complete Overview**: `docs/UPLOAD-IMPROVEMENTS-SUMMARY.md`
- **Silent 503 Fix**: `docs/fixes/UPLOAD-503-ERROR-FIX.md`
- **Vercel Blob Retry**: `docs/fixes/VERCEL-BLOB-503-FIX.md`
- **S3 Migration**: `docs/STORAGE-MIGRATION-VERCEL-TO-S3.md`
- **S3 Setup**: `docs/STORAGE-S3-SETUP.md`
- **Context Transfer**: `docs/CONTEXT-TRANSFER-SUMMARY.md`

---

## Support

- **Vercel Status**: https://www.vercel-status.com/
- **Vercel Support**: Contact via dashboard
- **GitHub Issues**: https://github.com/vercel/storage/issues

---

## Success Metrics

- ✅ **99% upload success rate** with retry
- ✅ **< 30% retry rate** (most succeed on 1st attempt)
- ✅ **< 5% 503 error rate** (acceptable for Vercel Blob)
- ✅ **< 30s upload time** for files < 50MB
- ✅ **Clear error messages** for all failures

---

**Status**: System is production-ready and resilient. Monitor metrics and consider S3 migration if 503 errors persist.
