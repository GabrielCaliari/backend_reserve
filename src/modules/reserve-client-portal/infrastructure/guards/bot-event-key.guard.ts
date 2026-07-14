import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotKeyProvider } from '../providers/bot-key.provider';

/**
 * Per-tenant key auth for POST /api/ingest/bot-events (§5.6 / Decisao 14).
 * N8N's node config is "one key + one tenant id per client", so the tenant
 * identity travels as a header (x-tenant-id) alongside the key — the
 * ingestion payload carries no tenant identity of its own.
 *
 * Unlike TenantKeyGuard (reserve-leads), which scans every collection and
 * hash-compares against each, this resolves tenant_id first and does a
 * single findUnique — BotIntegrationConfig is 1:1 per tenant, so an O(n) scan
 * would be pure waste here.
 */
@Injectable()
export class BotEventKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botKeyProvider: BotKeyProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantKey = request.headers['x-tenant-key'];
    const tenantId = request.headers['x-tenant-id'];

    if (!tenantKey || !tenantId) {
      throw new UnauthorizedException('Missing x-tenant-key or x-tenant-id header');
    }

    const config = await this.prisma.botIntegrationConfig.findUnique({
      where: { tenant_id: tenantId as string },
    });

    // Unknown tenant_id and a deactivated integration both fail the same way
    // (UnauthorizedException, never NotFoundException) — never leak tenant
    // existence to an unauthenticated caller.
    if (!config || !config.active) {
      throw new UnauthorizedException('Invalid tenant key');
    }

    const isValid = this.botKeyProvider.verify(
      tenantKey as string,
      config.tenant_key_hash,
      config.tenant_key_salt,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid tenant key');
    }

    request.tenant_id = tenantId;
    request.bot_integration_config_id = config.id;
    return true;
  }
}
