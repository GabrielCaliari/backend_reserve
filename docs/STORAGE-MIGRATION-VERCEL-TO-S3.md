# Storage Migration: Vercel Blob → AWS S3

## Overview

This document describes the migration from Vercel Blob Storage to AWS S3 (or S3-compatible services) for the CMS module.

## Why Migrate?

- **Cost Control**: S3 offers more predictable pricing and better cost optimization
- **Flexibility**: Works with AWS S3, DigitalOcean Spaces, MinIO, and other S3-compatible services
- **CDN Support**: Easy integration with CloudFront, CloudFlare, or custom CDNs
- **Better Performance**: Multipart upload support for large files (>5MB)
- **No Vendor Lock-in**: Standard S3 API works across multiple providers

## Changes Made

### 1. Enhanced S3StorageProvider

**File**: `src/modules/reserve-cms/infrastructure/providers/s3-storage.provider.ts`

**New Features**:
- ✅ Multipart upload for files > 5MB (prevents 503 errors)
- ✅ Automatic chunking (5MB chunks)
- ✅ CDN support via `CMS_BUCKET_CDN_URL`
- ✅ Comprehensive error handling and logging
- ✅ Automatic abort on failed multipart uploads
- ✅ Cache-Control headers (1 year cache)

**Upload Strategy**:
```typescript
// Files < 5MB: Simple upload (single request)
// Files ≥ 5MB: Multipart upload (chunked, parallel-safe)
```

### 2. Module Configuration

**File**: `src/modules/reserve-cms/reserve-cms.module.ts`

Changed from:
```typescript
{
  provide: STORAGE_PROVIDER,
  useClass: VercelBlobStorageProvider,
}
```

To:
```typescript
{
  provide: STORAGE_PROVIDER,
  useClass: S3StorageProvider,
}
```

### 3. Environment Variables

**Required Variables**:
```bash
# S3 Bucket Configuration
CMS_BUCKET_NAME=your-cms-bucket-name
CMS_BUCKET_ENDPOINT=https://nyc3.digitaloceanspaces.com
CMS_BUCKET_ACCESS_KEY_ID=your_s3_access_key
CMS_BUCKET_SECRET_ACCESS_KEY=your_s3_secret_key
CMS_BUCKET_REGION=us-east-1

# Optional: CDN URL for public access
CMS_BUCKET_CDN_URL=https://cdn.example.com
```

**Old Variables (can be removed)**:
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## Migration Steps

### Step 1: Set Up S3 Bucket

#### Option A: AWS S3
```bash
# Create bucket
aws s3 mb s3://your-cms-bucket-name --region us-east-1

# Set public read policy
aws s3api put-bucket-policy --bucket your-cms-bucket-name --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::your-cms-bucket-name/*"
  }]
}'

# Enable CORS
aws s3api put-bucket-cors --bucket your-cms-bucket-name --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
```

#### Option B: DigitalOcean Spaces
1. Go to DigitalOcean Console → Spaces
2. Create a new Space
3. Set Files Listing to "Public"
4. Generate API Keys (Spaces access keys)
5. Note the endpoint (e.g., `https://nyc3.digitaloceanspaces.com`)

#### Option C: MinIO (Self-hosted)
```bash
# Start MinIO
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=password \
  minio/minio server /data --console-address ":9001"

# Create bucket via MinIO Console or CLI
mc alias set myminio http://localhost:9000 admin password
mc mb myminio/cms-bucket
mc anonymous set public myminio/cms-bucket
```

### Step 2: Update Environment Variables

Edit your `.env` file:

```bash
# Remove Vercel Blob token
# BLOB_READ_WRITE_TOKEN=...

# Add S3 configuration
CMS_BUCKET_NAME=your-cms-bucket-name
CMS_BUCKET_ENDPOINT=https://nyc3.digitaloceanspaces.com
CMS_BUCKET_ACCESS_KEY_ID=your_access_key
CMS_BUCKET_SECRET_ACCESS_KEY=your_secret_key
CMS_BUCKET_REGION=us-east-1

# Optional: Add CDN URL
# CMS_BUCKET_CDN_URL=https://cdn.example.com
```

### Step 3: Migrate Existing Files (Optional)

If you have existing files in Vercel Blob, you need to migrate them:

#### Option 1: Manual Migration Script

Create `scripts/migrate-storage.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { S3 } from '@aws-sdk/client-s3';
import axios from 'axios';

const prisma = new PrismaClient();
const s3 = new S3({
  endpoint: process.env.CMS_BUCKET_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CMS_BUCKET_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CMS_BUCKET_SECRET_ACCESS_KEY!,
  },
  region: process.env.CMS_BUCKET_REGION || 'us-east-1',
  forcePathStyle: true,
});

async function migrateAssets() {
  const assets = await prisma.mediaAsset.findMany({
    where: {
      storage_url: {
        contains: 'vercel-storage.com',
      },
    },
  });

  console.log(`Found ${assets.length} assets to migrate`);

  for (const asset of assets) {
    try {
      // Download from Vercel Blob
      const response = await axios.get(asset.storage_url, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data);

      // Upload to S3
      const key = `media/${asset.id}${asset.file_extension}`;
      await s3.putObject({
        Bucket: process.env.CMS_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: asset.mime_type,
        ACL: 'public-read',
      });

      // Update database
      const newUrl = `${process.env.CMS_BUCKET_ENDPOINT}/${process.env.CMS_BUCKET_NAME}/${key}`;
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          storage_url: newUrl,
          storage_key: key,
        },
      });

      console.log(`✓ Migrated ${asset.id}`);
    } catch (error) {
      console.error(`✗ Failed to migrate ${asset.id}:`, error);
    }
  }

  console.log('Migration complete!');
}

migrateAssets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run migration:
```bash
pnpm exec ts-node scripts/migrate-storage.ts
```

#### Option 2: Gradual Migration

Keep both providers active and migrate on-demand:

1. New uploads go to S3
2. Old files remain on Vercel Blob
3. Migrate files as they're accessed/updated
4. Eventually clean up Vercel Blob

### Step 4: Test Upload Functionality

```bash
# Start the server
pnpm start:dev

# Test upload via API
curl -X POST http://localhost:3000/api/cms/assets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "file=@test-image.jpg" \
  -F "collection_id=YOUR_COLLECTION_ID"
```

### Step 5: Verify and Monitor

Check logs for:
- ✅ "S3 Storage initialized" message on startup
- ✅ "Successfully uploaded [key] to S3" on uploads
- ✅ "Using multipart upload" for large files (>5MB)
- ❌ Any S3-related errors

## Performance Comparison

| Feature | Vercel Blob | S3 (Enhanced) |
|---------|-------------|---------------|
| Small files (<5MB) | Fast | Fast |
| Large files (>5MB) | Prone to 503 | Multipart (reliable) |
| Max file size | 50MB | 5TB (S3 limit) |
| CDN support | Built-in | Configurable |
| Cost (1GB storage) | $0.15/month | $0.023/month (S3) |
| Cost (1GB transfer) | $0.10 | $0.09 (S3) |
| Vendor lock-in | Yes | No (S3 API standard) |

## Rollback Plan

If you need to rollback to Vercel Blob:

1. Revert module configuration:
```typescript
{
  provide: STORAGE_PROVIDER,
  useClass: VercelBlobStorageProvider,
}
```

2. Restore environment variable:
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

3. Restart server:
```bash
pnpm start:dev
```

## CDN Configuration (Optional)

### CloudFront (AWS)

1. Create CloudFront distribution
2. Set origin to S3 bucket
3. Update environment:
```bash
CMS_BUCKET_CDN_URL=https://d1234567890.cloudfront.net
```

### CloudFlare

1. Add CNAME record pointing to S3 endpoint
2. Enable CloudFlare proxy
3. Update environment:
```bash
CMS_BUCKET_CDN_URL=https://cdn.yourdomain.com
```

## Troubleshooting

### Error: "S3 Storage not configured"

**Cause**: Missing environment variables

**Solution**: Verify all required variables are set:
```bash
echo $CMS_BUCKET_NAME
echo $CMS_BUCKET_ENDPOINT
echo $CMS_BUCKET_ACCESS_KEY_ID
```

### Error: "Access Denied"

**Cause**: Incorrect credentials or bucket policy

**Solution**: 
1. Verify access keys are correct
2. Check bucket policy allows public read
3. Verify IAM user has `s3:PutObject` permission

### Error: "Multipart upload failed"

**Cause**: Network interruption or timeout

**Solution**: 
- Check network stability
- Increase timeout in main.ts (already set to 5 minutes)
- Verify S3 endpoint is accessible

### Files not accessible after upload

**Cause**: Bucket not public or wrong URL

**Solution**:
1. Verify bucket has public read policy
2. Check `getPublicUrl()` returns correct URL
3. Test URL directly in browser

## Monitoring

Add to your monitoring dashboard:

```typescript
// Log S3 operations
logger.log('S3 Upload', {
  key,
  size: data.length,
  contentType,
  multipart: data.length > MULTIPART_THRESHOLD,
  duration: Date.now() - startTime,
});
```

## Security Considerations

1. **Access Keys**: Store in environment variables, never commit to git
2. **Bucket Policy**: Only allow public read, not write
3. **CORS**: Restrict to your domain in production
4. **Encryption**: Enable S3 server-side encryption (SSE-S3)
5. **Versioning**: Enable S3 versioning for backup/recovery

## Cost Optimization

1. **Lifecycle Policies**: Archive old files to Glacier
2. **Intelligent Tiering**: Auto-move infrequently accessed files
3. **CDN**: Reduce S3 transfer costs with CloudFront/CloudFlare
4. **Compression**: Compress images before upload (already done with Sharp)

## Support

For issues or questions:
- Check logs: `pnpm start:dev` (look for S3-related messages)
- Review S3 provider: `src/modules/reserve-cms/infrastructure/providers/s3-storage.provider.ts`
- Test connection: Use AWS CLI or S3 browser to verify bucket access
