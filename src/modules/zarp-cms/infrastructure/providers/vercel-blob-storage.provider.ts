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

    if (!data || data.length === 0) {
      throw new Error('Cannot upload empty buffer to Vercel Blob');
    }

    try {
      const blob = await put(key, data, {
        access: 'public',
        contentType,
        token: this.token,
      });

      return {
        url: blob.url,
        key: blob.url,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Vercel Blob upload error';
      throw new Error(`Vercel Blob upload failed: ${message}`);
    }
  }

  async delete(urlOrKey: string): Promise<void> {
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    // Vercel Blob requires the full URL for deletion
    // Both url and storage_key stored in db are the full Vercel URL after upload fix
    const url = urlOrKey.startsWith('http')
      ? urlOrKey
      : `https://blob.vercel-storage.com/${urlOrKey}`;

    try {
      await del(url, { token: this.token });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Vercel Blob delete error';
      throw new Error(`Vercel Blob delete failed: ${message}`);
    }
  }

  getPublicUrl(urlOrKey: string): string {
    return urlOrKey.startsWith('http')
      ? urlOrKey
      : `https://blob.vercel-storage.com/${urlOrKey}`;
  }
}
