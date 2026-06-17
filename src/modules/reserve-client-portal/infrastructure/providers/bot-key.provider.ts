import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const PBKDF2_ITERATIONS = 856;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

/**
 * Hash/verify for BotIntegrationConfig's per-tenant N8N key. Same PBKDF2-SHA512
 * parameters as TenantKeyGuard's "new format" branch (reserve-leads) — no
 * legacy SHA-256 fallback needed since this is a brand new table.
 */
@Injectable()
export class BotKeyProvider {
  constructor(private readonly configService: ConfigService) {}

  hash(rawKey: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = this.derive(rawKey, salt);
    return { hash, salt };
  }

  /** Timing-safe compare — never leak match/no-match via response latency. */
  verify(rawKey: string, hash: string, salt: string): boolean {
    const candidate = Buffer.from(this.derive(rawKey, salt), 'hex');
    const expected = Buffer.from(hash, 'hex');
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  }

  private derive(rawKey: string, salt: string): string {
    const privateKey = this.configService.get<string>('ENCRYPT_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('ENCRYPT_PRIVATE_KEY not configured');
    }
    return crypto
      .pbkdf2Sync(rawKey, salt + privateKey, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString('hex');
  }
}
