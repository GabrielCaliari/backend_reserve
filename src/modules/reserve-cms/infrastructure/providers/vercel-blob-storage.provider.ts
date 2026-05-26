import { Injectable, Logger } from '@nestjs/common';
import { put, del } from '@vercel/blob';
import {
  IStorageProvider,
  IUploadResult,
} from '../../domain/interfaces/storage.interface';

/**
 * VercelBlobStorageProvider
 * 
 * Vercel Blob Storage provider with retry logic for 503 errors.
 * 
 * Known Issues (April 2026):
 * - Vercel Blob can return 503 "deployment unavailable" errors intermittently
 * - This is a Vercel infrastructure issue related to rate limiting and CDN instability
 * - The @vercel/blob SDK (v0.19.0+) includes automatic retry, but we add extra layer
 * - Sometimes the upload API works but public URLs return 503 (CDN issue)
 * 
 * Configuration:
 * - BLOB_READ_WRITE_TOKEN: Vercel Blob read/write token
 * 
 * Features:
 * - Multipart upload for large files (prevents 503 on large uploads)
 * - Automatic retry on 503 errors (3 attempts with exponential backoff)
 * - Exponential backoff with jitter (1s, 2s, 4s + random jitter)
 * - Detailed error logging for debugging
 * - SDK v2.2.0+ includes built-in retry (this adds extra resilience)
 * 
 * References:
 * - https://github.com/vercel/storage/issues (503 errors are known)
 * - Retry added in @vercel/blob@0.19.0
 * - Rate limiting can cause 503 even within Hobby plan limits
 */
@Injectable()
export class VercelBlobStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(VercelBlobStorageProvider.name);
  private readonly token: string;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_JITTER = 500; // 500ms random jitter

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || '';
    
    if (!this.token) {
      this.logger.warn('BLOB_READ_WRITE_TOKEN not configured. Vercel Blob Storage will not work.');
    } else {
      this.logger.log('Vercel Blob Storage initialized with retry mechanism');
    }
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<IUploadResult> {
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    if (!data || data.length === 0) {
      throw new Error('Cannot upload empty buffer to Vercel Blob');
    }

    const fileSizeMB = (data.length / 1024 / 1024).toFixed(2);
    this.logger.log(`Uploading ${key} to Vercel Blob (${fileSizeMB} MB)`);

    // Retry logic for 503 errors
    let lastError: any;
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const blob = await put(key, data, {
          access: 'public',
          contentType,
          token: this.token,
          // multipart splits large files into chunks, preventing intermittent
          // 503 errors from Vercel Blob when uploading bigger images
          multipart: true,
          addRandomSuffix: false, // Keep the exact key we provide
        });

        this.logger.log(`Successfully uploaded ${key} to Vercel Blob: ${blob.url} (attempt ${attempt})`);

        return {
          url: blob.url,
          key: blob.url,
        };
      } catch (error: any) {
        lastError = error;

        const is503Error = 
          error.message?.includes('503') || 
          error.message?.includes('unavailable') ||
          error.message?.includes('deployment') ||
          error.status === 503;

        // Log the error
        this.logger.warn(`Vercel Blob upload attempt ${attempt}/${this.MAX_RETRIES} failed for ${key}`, {
          error: error.message,
          code: error.code,
          status: error.status,
          is503: is503Error,
        });

        // If it's a 503 error and we have retries left, wait and retry
        if (is503Error && attempt < this.MAX_RETRIES) {
          // Exponential backoff with jitter to prevent thundering herd
          const baseDelay = this.INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          const jitter = Math.random() * this.MAX_JITTER;
          const delay = baseDelay + jitter;
          
          this.logger.log(`Retrying upload in ${Math.round(delay)}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})...`);
          await this.sleep(delay);
          continue;
        }

        // If it's not a 503 or we're out of retries, throw immediately
        if (!is503Error || attempt === this.MAX_RETRIES) {
          break;
        }
      }
    }

    // All retries failed, throw detailed error
    this.logger.error(`Vercel Blob upload failed after ${this.MAX_RETRIES} attempts for ${key}`, {
      error: lastError.message,
      code: lastError.code,
      status: lastError.status,
      response: lastError.response?.data,
    });

    // Check for specific Vercel Blob errors
    if (lastError.message?.includes('503') || lastError.message?.includes('unavailable')) {
      throw new Error(
        `Vercel Blob service temporarily unavailable after ${this.MAX_RETRIES} attempts. ` +
        `This is a Vercel infrastructure issue. Please try again later or contact Vercel support. ` +
        `Original error: ${lastError.message}`
      );
    }

    if (lastError.message?.includes('401') || lastError.message?.includes('unauthorized')) {
      throw new Error(
        `Vercel Blob authentication failed. Check BLOB_READ_WRITE_TOKEN environment variable. ` +
        `Original error: ${lastError.message}`
      );
    }

    if (lastError.message?.includes('413') || lastError.message?.includes('too large')) {
      throw new Error(
        `File too large for Vercel Blob. Maximum size is 50MB. ` +
        `File size: ${fileSizeMB} MB. Original error: ${lastError.message}`
      );
    }

    const message = lastError instanceof Error ? lastError.message : 'Unknown Vercel Blob upload error';
    throw new Error(`Vercel Blob upload failed: ${message}`);
  }

  async delete(urlOrKey: string): Promise<void> {
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    // Vercel Blob requires the full URL for deletion
    const url = urlOrKey.startsWith('http')
      ? urlOrKey
      : `https://blob.vercel-storage.com/${urlOrKey}`;

    this.logger.log(`Deleting from Vercel Blob: ${url}`);

    try {
      await del(url, { token: this.token });
      this.logger.log(`Successfully deleted from Vercel Blob: ${url}`);
    } catch (error: any) {
      this.logger.error(`Vercel Blob delete failed for ${url}`, {
        error: error.message,
        code: error.code,
        status: error.status,
      });

      const message = error instanceof Error ? error.message : 'Unknown Vercel Blob delete error';
      throw new Error(`Vercel Blob delete failed: ${message}`);
    }
  }

  getPublicUrl(urlOrKey: string): string {
    return urlOrKey.startsWith('http')
      ? urlOrKey
      : `https://blob.vercel-storage.com/${urlOrKey}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
