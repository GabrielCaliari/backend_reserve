import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const TENANT_CACHE_TTL_MS = 5 * 60 * 1000;
const TENANT_CACHE_RETRY_MS = 30 * 1000;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Builds a matcher for "https://" + value + optional subdomains, e.g. hotelacme.com -> https://hotelacme.com and https://app.hotelacme.com. */
function buildScopedDomainMatcher(value: string): RegExp {
  const escaped = escapeRegExp(value);
  return new RegExp(`^https://([a-z0-9-]+\\.)*${escaped}$`, 'i');
}

/**
 * CORS allowlist = static platform origins (CORS_ORIGINS env) + dynamic tenant
 * domains (TenantDomain, active rows of active tenants only), cached in process
 * memory. Writes to TenantDomain MUST call invalidate(); the TTL is only a
 * fallback for a missed invalidation.
 *
 * Two matcher kinds per TenantDomain.type:
 * - 'domain': auto-scoped to the value and all its subdomains, https only.
 * - 'regex': the stored value is compiled and matched against Origin verbatim.
 *   A malformed stored pattern is logged and skipped, never thrown.
 *
 * Requests with no Origin header are NOT this service's problem — the callback
 * in shared/cors/cors-origin.callback.ts short-circuits them before we get here.
 */
@Injectable()
export class CorsOriginService {
  private readonly logger = new Logger(CorsOriginService.name);
  private readonly envOrigins: Set<string>;
  private tenantDomainMatchers: RegExp[] = [];
  private tenantRegexMatchers: RegExp[] = [];
  private expiresAt = 0;
  private refreshing: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.envOrigins = new Set(
      (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean),
    );
  }

  /** Call after any write to TenantDomain (the list may have changed). */
  invalidate(): void {
    this.expiresAt = 0;
  }

  async isAllowed(origin: string): Promise<boolean> {
    const normalized = origin.replace(/\/$/, '');
    if (this.envOrigins.has(normalized)) return true;
    if (Date.now() >= this.expiresAt) await this.refresh();
    return (
      this.tenantDomainMatchers.some((matcher) => matcher.test(normalized)) ||
      this.tenantRegexMatchers.some((matcher) => matcher.test(normalized))
    );
  }

  private async refresh(): Promise<void> {
    if (!this.refreshing) {
      this.refreshing = this.loadTenantOrigins().finally(() => {
        this.refreshing = null;
      });
    }
    await this.refreshing;
  }

  private async loadTenantOrigins(): Promise<void> {
    try {
      const domains = await this.prisma.tenantDomain.findMany({
        where: { active: true, Tenant: { active: true } },
        select: { type: true, value: true },
      });

      const domainMatchers: RegExp[] = [];
      const regexMatchers: RegExp[] = [];

      for (const { type, value } of domains) {
        const trimmed = (value ?? '').trim();
        if (!trimmed) continue;

        if (type === 'regex') {
          try {
            regexMatchers.push(new RegExp(trimmed));
          } catch (error) {
            this.logger.error(
              `Skipping malformed tenant CORS regex "${trimmed}": ${(error as Error).message}`,
            );
          }
          continue;
        }

        const bareHost = trimmed.replace(/^https?:\/\//, '').replace(/\/$/, '');
        domainMatchers.push(buildScopedDomainMatcher(bareHost));
      }

      this.tenantDomainMatchers = domainMatchers;
      this.tenantRegexMatchers = regexMatchers;
      this.expiresAt = Date.now() + TENANT_CACHE_TTL_MS;
    } catch (error) {
      // Keep the stale cache + env allowlist working; retry soon instead of
      // caching an empty set for the full TTL.
      this.logger.error(
        `Failed to refresh tenant CORS origins: ${(error as Error).message}`,
      );
      this.expiresAt = Date.now() + TENANT_CACHE_RETRY_MS;
    }
  }
}
