import { Injectable } from '@nestjs/common';
import { ProviderException } from '../exceptions';
import * as crypto from 'crypto';

export interface HashResult {
  salt: string;
  hash: string;
}

/**
 * Injectable PBKDF2 SHA-512 password hashing provider.
 * Replaces the legacy static `Encrypt` class from core.
 */
@Injectable()
export class HashProvider {
  private readonly ITERATIONS = 856;
  private readonly KEY_LENGTH = 64;
  private readonly DIGEST = 'sha512';

  private get privateKey(): string {
    const key = process.env.ENCRYPT_PRIVATE_KEY;
    if (!key) {
      throw new ProviderException(
        'Nao foi possivel encontrar a chave privada de seguranca.',
        'ENCRYPT_KEY_MISSING',
      );
    }
    return key;
  }

  hash(value: string): HashResult {
    try {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto
        .pbkdf2Sync(value, salt + this.privateKey, this.ITERATIONS, this.KEY_LENGTH, this.DIGEST)
        .toString('hex');

      return { salt, hash };
    } catch (error) {
      throw new ProviderException('Erro ao gerar um hash', 'HASH_ERROR', error);
    }
  }

  compare(value: string, salt: string, hash: string): boolean {
    try {
      const passwordHash = crypto
        .pbkdf2Sync(value, salt + this.privateKey, this.ITERATIONS, this.KEY_LENGTH, this.DIGEST)
        .toString('hex');

      return hash === passwordHash;
    } catch (error) {
      throw new ProviderException('Erro ao comparar um hash', 'HASH_COMPARE_ERROR', error);
    }
  }
}
