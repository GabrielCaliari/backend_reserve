import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AesEncryptionProvider } from '../../../reserve-client-portal/infrastructure/providers/aes-encryption.provider';
import {
  Beds24RateLimitError,
  MotorChannelAuthError,
  MotorChannelNotConnectedError,
} from '../../domain/errors/channel.errors';
import {
  Beds24AuthSetupResponse,
  Beds24TokenResponse,
} from '../../application/dtos/channel.dto';

export const BEDS24_BASE_URL = 'https://api.beds24.com/v2';

// Renova o access token com folga antes do expiresIn informado pelo Beds24.
const TOKEN_SAFETY_MARGIN_MS = 60_000;

interface CachedToken {
  token: string;
  expiresAtMs: number;
}

/**
 * Cliente HTTP do Beds24 (spec §3, wiki API_V2 "PMSs: How to connect").
 * Auth: invite code -> GET /authentication/setup -> refresh token de longa
 * duracao (cifrado por tenant via AesEncryptionProvider, NUNCA logado nem
 * devolvido) -> GET /authentication/token -> access token curto, cacheado
 * em memoria por tenant. Em 429 lanca Beds24RateLimitError tipado — o
 * chamador (fila de push) agenda o retry com backoff, nada e retentado aqui.
 */
@Injectable()
export class Beds24ApiProvider {
  private readonly logger = new Logger(Beds24ApiProvider.name);
  private readonly tokenCache = new Map<string, CachedToken>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesEncryptionProvider,
  ) {}

  /**
   * Troca o invite code por refresh token e grava o sync state do tenant.
   * O invite code NAO e persistido em lugar nenhum.
   */
  async connect(tenantId: string, inviteCode: string): Promise<void> {
    const response = await fetch(`${BEDS24_BASE_URL}/authentication/setup`, {
      method: 'GET',
      headers: { code: inviteCode },
    });
    if (response.status === 429) throw new Beds24RateLimitError(this.retryAfter(response));
    if (!response.ok) {
      throw new MotorChannelAuthError(`Beds24 recusou o invite code (HTTP ${response.status})`);
    }
    const body = (await response.json()) as Beds24AuthSetupResponse;
    if (!body?.refreshToken) {
      throw new MotorChannelAuthError('Beds24 nao devolveu refresh token no setup');
    }

    const encrypted = this.aes.encrypt(body.refreshToken);
    await this.prisma.motorChannelSyncState.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, refresh_token_encrypted: encrypted, status: 'OK' },
      update: { refresh_token_encrypted: encrypted, status: 'OK' },
    });
    // O setup ja devolve um access token valido — aproveita o cache.
    if (body.token && body.expiresIn) {
      this.cacheToken(tenantId, body.token, body.expiresIn);
    }
    this.logger.log(`Tenant ${tenantId} conectado ao Beds24`);
  }

  /** Access token do tenant: cache em memoria com TTL abaixo do expiresIn. */
  async getAccessToken(tenantId: string): Promise<string> {
    const cached = this.tokenCache.get(tenantId);
    if (cached && cached.expiresAtMs > Date.now()) return cached.token;

    const state = await this.prisma.motorChannelSyncState.findUnique({
      where: { tenant_id: tenantId },
    });
    if (!state?.refresh_token_encrypted) throw new MotorChannelNotConnectedError();
    const refreshToken = this.aes.decrypt(state.refresh_token_encrypted);

    const response = await fetch(`${BEDS24_BASE_URL}/authentication/token`, {
      method: 'GET',
      headers: { refreshToken },
    });
    if (response.status === 429) throw new Beds24RateLimitError(this.retryAfter(response));
    if (!response.ok) {
      throw new MotorChannelAuthError(`Beds24 recusou o refresh token (HTTP ${response.status})`);
    }
    const body = (await response.json()) as Beds24TokenResponse;
    if (!body?.token) throw new MotorChannelAuthError('Beds24 nao devolveu access token');
    this.cacheToken(tenantId, body.token, body.expiresIn ?? 3600);
    return body.token;
  }

  /**
   * Chamada autenticada generica. 429 vira Beds24RateLimitError com o
   * retry-after sugerido; outros nao-2xx viram Error comum (a fila trata
   * os dois com backoff).
   */
  async request<T = unknown>(
    tenantId: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getAccessToken(tenantId);
    const response = await fetch(`${BEDS24_BASE_URL}${path}`, {
      method,
      headers: { token, 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 429) throw new Beds24RateLimitError(this.retryAfter(response));
    if (!response.ok) {
      throw new Error(`Beds24 ${method} ${path} respondeu HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }

  /** Descarta o token cacheado (ex.: desconexao do canal). */
  clearToken(tenantId: string): void {
    this.tokenCache.delete(tenantId);
  }

  private cacheToken(tenantId: string, token: string, expiresInSeconds: number): void {
    this.tokenCache.set(tenantId, {
      token,
      expiresAtMs: Date.now() + Math.max(0, expiresInSeconds * 1000 - TOKEN_SAFETY_MARGIN_MS),
    });
  }

  private retryAfter(response: { headers: { get(name: string): string | null } }): number | null {
    const raw = response.headers?.get?.('retry-after');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }
}
