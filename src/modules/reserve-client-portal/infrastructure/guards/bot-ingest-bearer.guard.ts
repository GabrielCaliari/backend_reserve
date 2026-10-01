import {
  BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotKeyProvider } from '../providers/bot-key.provider';

/**
 * Autenticacao do Canal A (contrato v2 §3.1): `Authorization: Bearer <tenant_key>`
 * + `tenant_id` no corpo. O `tenant_id` do bot e o identificador DELE
 * (bot_tenant_ref, ex.: "cli_dona_tereza"); o nosso tenant_id tambem e aceito.
 *
 * Contrato §3.2: chave invalida -> 401; tenant errado -> 403. A chave e
 * derivada com salt por linha, entao e preciso achar o tenant antes de
 * conferi-la — por isso o 403 vem antes do 401 da chave.
 */
@Injectable()
export class BotIngestBearerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botKeyProvider: BotKeyProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = String(request.headers?.authorization ?? '');
    const key = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!key) throw new UnauthorizedException('Missing bearer tenant key');

    const ref = typeof request.body?.tenant_id === 'string' ? request.body.tenant_id.trim() : '';
    if (!ref) throw new BadRequestException('tenant_id is required');

    const config = await this.prisma.botIntegrationConfig.findFirst({
      where: { OR: [{ bot_tenant_ref: ref }, { tenant_id: ref }] },
    });
    if (!config || !config.active) throw new ForbiddenException('Unknown tenant');

    if (!this.botKeyProvider.verify(key, config.tenant_key_hash, config.tenant_key_salt)) {
      throw new UnauthorizedException('Invalid tenant key');
    }

    request.tenant_id = config.tenant_id;
    request.bot_integration_config_id = config.id;
    return true;
  }
}
