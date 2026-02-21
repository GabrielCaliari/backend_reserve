import { Injectable } from '@nestjs/common';
import { ProviderException } from '../exceptions';
import * as crypto from 'crypto';

export interface EncryptedData {
  hash: string;
  salt: Buffer;
}

@Injectable()
export class EncryptProvider {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly SALT_LENGTH = 32;
  private readonly IV_LENGTH = 12;
  private readonly KEY_LENGTH = 32;
  private readonly ITERATIONS = 100000;

  private deriveKey(privateKey: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(privateKey, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
  }

  encrypt(value: string, privateKey: string): EncryptedData {
    try {
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const key = this.deriveKey(privateKey, salt);

      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      let encrypted = cipher.update(value, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      return {
        hash: Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'base64')]).toString('base64'),
        salt,
      };
    } catch (error) {
      throw new ProviderException('Encrypt: error generating AES hash', 'AES_ENCRYPT_ERROR', error);
    }
  }

  decrypt(hash: string, privateKey: string): string {
    try {
      const encryptedBuffer = Buffer.from(hash, 'base64');

      const salt = encryptedBuffer.subarray(0, this.SALT_LENGTH);
      const iv = encryptedBuffer.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const authTag = encryptedBuffer.subarray(
        this.SALT_LENGTH + this.IV_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH + 16,
      );
      const encryptedText = encryptedBuffer.subarray(this.SALT_LENGTH + this.IV_LENGTH + 16);

      const key = this.deriveKey(privateKey, salt);

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = decipher.update(encryptedText);
      const finalBuffer = decipher.final();
      const result = Buffer.concat([decrypted, finalBuffer]).toString('utf8');

      return result;
    } catch (error) {
      throw new ProviderException('Encrypt: error decrypting AES hash', 'AES_DECRYPT_ERROR', error);
    }
  }
}
