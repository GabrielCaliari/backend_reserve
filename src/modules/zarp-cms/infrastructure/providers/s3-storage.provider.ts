import { Injectable, Logger } from '@nestjs/common';
import { 
  S3, 
  PutObjectCommand, 
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import {
  IStorageProvider,
  IUploadResult,
} from '../../domain/interfaces/storage.interface';

/**
 * S3StorageProvider
 * 
 * AWS S3 or S3-compatible storage provider (DigitalOcean Spaces, MinIO, etc.)
 * Supports both simple uploads and multipart uploads for large files.
 * 
 * Environment Variables:
 * - CMS_BUCKET_NAME: S3 bucket name
 * - CMS_BUCKET_ENDPOINT: S3 endpoint URL (e.g., https://nyc3.digitaloceanspaces.com)
 * - CMS_BUCKET_ACCESS_KEY_ID: S3 access key
 * - CMS_BUCKET_SECRET_ACCESS_KEY: S3 secret key
 * - CMS_BUCKET_REGION: S3 region (default: us-east-1)
 * - CMS_BUCKET_CDN_URL: Optional CDN URL for public access
 */
@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly cdnUrl?: string;
  private readonly region: string;
  
  // Multipart upload threshold: 5MB
  private readonly MULTIPART_THRESHOLD = 5 * 1024 * 1024;
  // Chunk size for multipart: 5MB (minimum allowed by S3)
  private readonly CHUNK_SIZE = 5 * 1024 * 1024;

  constructor() {
    this.bucketName = process.env.CMS_BUCKET_NAME || '';
    this.endpoint = process.env.CMS_BUCKET_ENDPOINT || '';
    this.cdnUrl = process.env.CMS_BUCKET_CDN_URL;
    this.region = process.env.CMS_BUCKET_REGION || 'us-east-1';

    if (!this.bucketName || !this.endpoint) {
      this.logger.warn('CMS_BUCKET_NAME or CMS_BUCKET_ENDPOINT not configured. S3 Storage will not work.');
    }

    this.s3Client = new S3({
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: process.env.CMS_BUCKET_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CMS_BUCKET_SECRET_ACCESS_KEY || '',
      },
      region: this.region,
      forcePathStyle: true, // Required for DigitalOcean Spaces and some S3-compatible services
    });

    this.logger.log(`S3 Storage initialized: bucket=${this.bucketName}, region=${this.region}`);
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult> {
    if (!this.bucketName || !this.endpoint) {
      throw new Error('S3 Storage not configured. Check CMS_BUCKET_NAME and CMS_BUCKET_ENDPOINT environment variables.');
    }

    if (!data || data.length === 0) {
      throw new Error('Cannot upload empty buffer to S3');
    }

    try {
      // Use multipart upload for files larger than threshold
      if (data.length > this.MULTIPART_THRESHOLD) {
        this.logger.log(`Using multipart upload for ${key} (${(data.length / 1024 / 1024).toFixed(2)} MB)`);
        await this.multipartUpload(key, data, contentType);
      } else {
        await this.simpleUpload(key, data, contentType);
      }

      const url = this.getPublicUrl(key);

      this.logger.log(`Successfully uploaded ${key} to S3`);

      return {
        url,
        key,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown S3 upload error';
      this.logger.error(`S3 upload failed for ${key}: ${message}`, error instanceof Error ? error.stack : undefined);
      throw new Error(`S3 upload failed: ${message}`);
    }
  }

  private async simpleUpload(key: string, data: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000', // 1 year cache
    });

    await this.s3Client.send(command);
  }

  private async multipartUpload(key: string, data: Buffer, contentType: string): Promise<void> {
    let uploadId: string | undefined;

    try {
      // 1. Initiate multipart upload
      const createCommand = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000',
      });

      const createResponse = await this.s3Client.send(createCommand);
      uploadId = createResponse.UploadId;

      if (!uploadId) {
        throw new Error('Failed to initiate multipart upload');
      }

      // 2. Upload parts
      const parts: { ETag: string; PartNumber: number }[] = [];
      const totalParts = Math.ceil(data.length / this.CHUNK_SIZE);

      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        const start = (partNumber - 1) * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, data.length);
        const chunk = data.subarray(start, end);

        const uploadPartCommand = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: chunk,
        });

        const uploadPartResponse = await this.s3Client.send(uploadPartCommand);

        if (!uploadPartResponse.ETag) {
          throw new Error(`Failed to upload part ${partNumber}`);
        }

        parts.push({
          ETag: uploadPartResponse.ETag,
          PartNumber: partNumber,
        });

        this.logger.debug(`Uploaded part ${partNumber}/${totalParts} for ${key}`);
      }

      // 3. Complete multipart upload
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      });

      await this.s3Client.send(completeCommand);
      this.logger.log(`Completed multipart upload for ${key} (${totalParts} parts)`);

    } catch (error) {
      // Abort multipart upload on error
      if (uploadId) {
        try {
          const abortCommand = new AbortMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
          });
          await this.s3Client.send(abortCommand);
          this.logger.warn(`Aborted multipart upload for ${key}`);
        } catch (abortError) {
          this.logger.error(`Failed to abort multipart upload for ${key}`, abortError);
        }
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.bucketName) {
      throw new Error('S3 Storage not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Successfully deleted ${key} from S3`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown S3 delete error';
      this.logger.error(`S3 delete failed for ${key}: ${message}`);
      throw new Error(`S3 delete failed: ${message}`);
    }
  }

  getPublicUrl(key: string): string {
    // Use CDN URL if configured, otherwise use direct S3 URL
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    
    // For DigitalOcean Spaces or S3-compatible services
    return `${this.endpoint}/${this.bucketName}/${key}`;
  }
}
