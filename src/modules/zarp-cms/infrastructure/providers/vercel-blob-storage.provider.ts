import { Injectable } from '@nestjs/common';
import { put, del } from '@vercel/blob';
import {
  IStorageProvider,
  IUploadResult,
} from '../../domain/interfaces/storage.interface';

@Injectable()
export class VercelBlobStorageProvider implements IStorageProvider {
  private readonly token: string;

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || '';
    
    if (!this.token) {
      console.warn('BLOB_READ_WRITE_TOKEN not configured. Vercel Blob Storage will not work.');
    }
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult> {
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    try {
      const blob = await put(key, data, {
        access: 'public',
        contentType,
        token: this.token,
      });

      return {
        url: blob.url,
        key: blob.pathname,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Vercel Blob upload error';
      throw new Error(`Vercel Blob upload failed: ${message}`);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    // Vercel Blob requires the full URL for deletion
    // We need to construct it from the key
    const url = this.getPublicUrl(key);

    try {
      await del(url, { token: this.token });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Vercel Blob delete error';
      throw new Error(`Vercel Blob delete failed: ${message}`);
    }
  }

  getPublicUrl(key: string): string {
    // Vercel Blob URLs are returned directly from the upload
    // This method is mainly for consistency with the interface
    // In practice, we store the full URL in the database
    return key.startsWith('http') ? key : `https://blob.vercel-storage.com/${key}`;
  }
}
