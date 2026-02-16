import { Injectable } from '@nestjs/common';
import { S3, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  IStorageProvider,
  IUploadResult,
} from '../../domain/interfaces/storage.interface';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly s3Client: S3;
  private readonly bucketName: string;
  private readonly endpoint: string;

  constructor() {
    this.bucketName = process.env.CMS_BUCKET_NAME || '';
    this.endpoint = process.env.CMS_BUCKET_ENDPOINT || '';

    this.s3Client = new S3({
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: process.env.CMS_BUCKET_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CMS_BUCKET_SECRET_ACCESS_KEY || '',
      },
      region: process.env.CMS_BUCKET_REGION || 'us-east-1',
      forcePathStyle: true, // Required for DigitalOcean Spaces
    });
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    const url = this.getPublicUrl(key);

    return {
      url,
      key,
    };
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  getPublicUrl(key: string): string {
    // For DigitalOcean Spaces or S3-compatible services
    return `${this.endpoint}/${this.bucketName}/${key}`;
  }
}
