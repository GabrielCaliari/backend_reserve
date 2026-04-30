# Quick Start: S3 Storage Setup

## TL;DR

The CMS module now uses AWS S3 (or S3-compatible services) instead of Vercel Blob Storage.

## Required Environment Variables

Add to your `.env` file:

```bash
# S3 Configuration
CMS_BUCKET_NAME=your-bucket-name
CMS_BUCKET_ENDPOINT=https://s3.amazonaws.com
CMS_BUCKET_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
CMS_BUCKET_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
CMS_BUCKET_REGION=us-east-1

# Optional: CDN URL
CMS_BUCKET_CDN_URL=https://cdn.example.com
```

## Provider Examples

### AWS S3
```bash
CMS_BUCKET_NAME=my-cms-bucket
CMS_BUCKET_ENDPOINT=https://s3.amazonaws.com
CMS_BUCKET_REGION=us-east-1
```

### DigitalOcean Spaces
```bash
CMS_BUCKET_NAME=my-space-name
CMS_BUCKET_ENDPOINT=https://nyc3.digitaloceanspaces.com
CMS_BUCKET_REGION=us-east-1
```

### MinIO (Self-hosted)
```bash
CMS_BUCKET_NAME=cms-bucket
CMS_BUCKET_ENDPOINT=http://localhost:9000
CMS_BUCKET_REGION=us-east-1
```

## Features

✅ **Multipart Upload**: Files > 5MB are automatically chunked (prevents 503 errors)  
✅ **CDN Support**: Optional CDN URL for faster delivery  
✅ **Error Handling**: Comprehensive logging and error messages  
✅ **Cache Headers**: 1-year cache for optimal performance  
✅ **S3-Compatible**: Works with AWS S3, DigitalOcean Spaces, MinIO, etc.

## Quick Test

```bash
# Start server
pnpm start:dev

# Upload test file
curl -X POST http://localhost:3000/api/cms/assets \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@test.jpg" \
  -F "collection_id=YOUR_COLLECTION_ID"
```

## Logs to Watch

```
✓ S3 Storage initialized: bucket=my-bucket, region=us-east-1
✓ Successfully uploaded media/abc123.jpg to S3
✓ Using multipart upload for large-file.jpg (12.5 MB)
✓ Completed multipart upload for large-file.jpg (3 parts)
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| "S3 Storage not configured" | Check environment variables are set |
| "Access Denied" | Verify access keys and bucket policy |
| "Multipart upload failed" | Check network and S3 endpoint accessibility |

## Need Help?

See full migration guide: `docs/STORAGE-MIGRATION-VERCEL-TO-S3.md`
