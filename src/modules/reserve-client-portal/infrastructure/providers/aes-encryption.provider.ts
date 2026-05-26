import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class AesEncryptionProvider {
  private readonly logger = new Logger(AesEncryptionProvider.name);
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.AES_ENCRYPTION_KEY;
    if (!rawKey || rawKey.length !== 32) {
      this.logger.error(
        'AES_ENCRYPTION_KEY must be exactly 32 characters. Encryption will be unavailable.',
      );
      this.key = Buffer.alloc(32);
    } else {
      this.key = Buffer.from(rawKey, 'utf8');
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns a base64-encoded string in the format: iv:authTag:ciphertext
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  /**
   * Decrypts a base64-encoded string produced by `encrypt`.
   */
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivB64, authTagB64, ciphertextB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
