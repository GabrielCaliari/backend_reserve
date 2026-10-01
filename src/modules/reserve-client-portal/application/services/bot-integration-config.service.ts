import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { BotKeyProvider } from '../../infrastructure/providers/bot-key.provider';
import { AesEncryptionProvider } from '../../infrastructure/providers/aes-encryption.provider';
import {
  CreateBotIntegrationConfigDto,
  UpdateBotIntegrationConfigDto,
} from '../dtos/bot-integration-config.dto';

/**
 * §4.4 onboarding step 4 ("gerar chave de tenant, configurar o nó de eventos
 * no N8N") made concrete. The plaintext key is returned exactly once, on
 * creation and on regeneration — never stored, never retrievable again,
 * matching LeadCollection's secretKeyHash precedent.
 */
@Injectable()
export class BotIntegrationConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botKeyProvider: BotKeyProvider,
    private readonly aes: AesEncryptionProvider,
  ) {}

  async create(tenantId: string, dto: CreateBotIntegrationConfigDto) {
    const rawKey = this.generateKey();
    const { hash, salt } = this.botKeyProvider.hash(rawKey);

    const config = await this.prisma.botIntegrationConfig.create({
      data: {
        tenant_id: tenantId,
        tenant_key_hash: hash,
        tenant_key_salt: salt,
        n8n_stage_webhook_url: dto.n8n_stage_webhook_url ?? null,
        n8n_config_publish_webhook_url: dto.n8n_config_publish_webhook_url ?? null,
        ...this.panelChannelData(dto),
      },
    });

    return { ...this.toSafeShape(config), tenant_key: rawKey };
  }

  async findByTenant(tenantId: string) {
    const config = await this.prisma.botIntegrationConfig.findUnique({ where: { tenant_id: tenantId } });
    if (!config) throw new NotFoundException('Bot integration not configured for this tenant.');
    return this.toSafeShape(config);
  }

  async update(tenantId: string, dto: UpdateBotIntegrationConfigDto) {
    const config = await this.prisma.botIntegrationConfig.update({
      where: { tenant_id: tenantId },
      data: {
        ...(dto.n8n_stage_webhook_url !== undefined ? { n8n_stage_webhook_url: dto.n8n_stage_webhook_url } : {}),
        ...(dto.n8n_config_publish_webhook_url !== undefined
          ? { n8n_config_publish_webhook_url: dto.n8n_config_publish_webhook_url }
          : {}),
        ...(dto.chatwoot_base_url !== undefined ? { chatwoot_base_url: dto.chatwoot_base_url } : {}),
        ...this.panelChannelData(dto),
      },
    });
    return this.toSafeShape(config);
  }

  async regenerateKey(tenantId: string) {
    const rawKey = this.generateKey();
    const { hash, salt } = this.botKeyProvider.hash(rawKey);
    const config = await this.prisma.botIntegrationConfig.update({
      where: { tenant_id: tenantId },
      data: { tenant_key_hash: hash, tenant_key_salt: salt },
    });
    return { ...this.toSafeShape(config), tenant_key: rawKey };
  }

  async deactivate(tenantId: string) {
    const config = await this.prisma.botIntegrationConfig.update({
      where: { tenant_id: tenantId },
      data: { active: false },
    });
    return this.toSafeShape(config);
  }

  async reactivate(tenantId: string) {
    const config = await this.prisma.botIntegrationConfig.update({
      where: { tenant_id: tenantId },
      data: { active: true },
    });
    return this.toSafeShape(config);
  }

  /** Canal reverso (contrato v2 §5): o segredo e cifrado aqui e nunca sai do banco. */
  private panelChannelData(dto: CreateBotIntegrationConfigDto | UpdateBotIntegrationConfigDto) {
    return {
      ...(dto.bot_tenant_ref !== undefined ? { bot_tenant_ref: dto.bot_tenant_ref || null } : {}),
      ...(dto.n8n_panel_webhook_url !== undefined ? { n8n_panel_webhook_url: dto.n8n_panel_webhook_url || null } : {}),
      ...(dto.panel_webhook_secret ? { panel_webhook_secret_enc: this.aes.encrypt(dto.panel_webhook_secret) } : {}),
    };
  }

  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Never includes tenant_key_hash/tenant_key_salt/panel_webhook_secret_enc in
   * any read response; the secret is exposed only as panel_webhook_secret_set.
   */
  private toSafeShape(config: {
    id: string;
    tenant_id: string;
    active: boolean;
    n8n_stage_webhook_url: string | null;
    n8n_config_publish_webhook_url: string | null;
    chatwoot_base_url: string | null;
    bot_tenant_ref: string | null;
    n8n_panel_webhook_url: string | null;
    panel_webhook_secret_enc: string | null;
    last_heartbeat_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      id: config.id,
      tenant_id: config.tenant_id,
      active: config.active,
      n8n_stage_webhook_url: config.n8n_stage_webhook_url,
      n8n_config_publish_webhook_url: config.n8n_config_publish_webhook_url,
      chatwoot_base_url: config.chatwoot_base_url,
      bot_tenant_ref: config.bot_tenant_ref,
      n8n_panel_webhook_url: config.n8n_panel_webhook_url,
      panel_webhook_secret_set: Boolean(config.panel_webhook_secret_enc),
      last_heartbeat_at: config.last_heartbeat_at,
      created_at: config.created_at,
      updated_at: config.updated_at,
    };
  }
}
