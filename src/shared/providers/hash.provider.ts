import { Injectable } from '@nestjs/common';
import { ProviderException } from '../exceptions';
import * as crypto from 'crypto';

export interface HashResult {
  salt: string;
  hash: string;
  version: 2;
}

export type HashVersion = 1 | 2;

/**
 * PBKDF2 SHA-512 versionado.
 * v1 = 856 iterações (legado, muito abaixo da recomendação OWASP — mantido
 * apenas para validar hashes já existentes até serem re-hasheados no próximo
 * login bem-sucedido).
 * v2 = 210.000 iterações (piso recomendado pela OWASP para PBKDF2-SHA512).
 * hash() sempre produz v2; compare() aceita a versão armazenada para que as
 * linhas legadas continuem validando durante a janela de re-hash.
 */
@Injectable()
export class HashProvider {
  private readonly ITERATIONS_V1 = 856;
  private readonly ITERATIONS_V2 = 210_000;
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

  private iterationsFor(version: HashVersion): number {
    return version === 1 ? this.ITERATIONS_V1 : this.ITERATIONS_V2;
  }

  hash(value: string): HashResult {
    const { salt, hash } = this.hashWithIterations(value, this.ITERATIONS_V2);
    return { salt, hash, version: 2 };
  }

  compare(value: string, salt: string, hash: string, version: HashVersion = 2): boolean {
    try {
      const { hash: computed } = this.hashWithIterations(value, this.iterationsFor(version), salt);

      const storedBuffer = Buffer.from(hash, 'hex');
      const computedBuffer = Buffer.from(computed, 'hex');

      // timingSafeEqual lança se os tamanhos diferem; comparar antes evita
      // trocar um retorno false por uma exceção.
      if (storedBuffer.length !== computedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(storedBuffer, computedBuffer);
    } catch (error) {
      throw new ProviderException('Erro ao comparar um hash', 'HASH_COMPARE_ERROR', error);
    }
  }

  private hashWithIterations(
    value: string,
    iterations: number,
    existingSalt?: string,
  ): { salt: string; hash: string } {
    try {
      const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
      const hash = crypto
        .pbkdf2Sync(value, salt + this.privateKey, iterations, this.KEY_LENGTH, this.DIGEST)
        .toString('hex');

      return { salt, hash };
    } catch (error) {
      throw new ProviderException('Erro ao gerar um hash', 'HASH_ERROR', error);
    }
  }
}
