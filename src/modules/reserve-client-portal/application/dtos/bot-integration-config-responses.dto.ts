import { ApiProperty } from '@nestjs/swagger';

/** Formas de resposta de admin/hotel-portal/:tenantId/bot-integration-config (so OpenAPI). */
export class BotIntegrationConfigResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenant_id: string;
  @ApiProperty() active: boolean;
  @ApiProperty({ type: String, nullable: true, example: 'cli_dona_tereza' }) bot_tenant_ref: string | null;
  @ApiProperty({ type: String, nullable: true }) n8n_panel_webhook_url: string | null;
  @ApiProperty({ description: 'Se o segredo do Canal B ja foi gravado. O valor nunca volta.' }) panel_webhook_secret_set: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) last_heartbeat_at: string | null;
  @ApiProperty({ description: 'Eventos do Canal A presos (FAILED/RECEIVED ha mais de 5 min).' }) stuck_events: number;
  @ApiProperty({ type: String, format: 'date-time' }) created_at: string;
  @ApiProperty({ type: String, format: 'date-time' }) updated_at: string;
}

export class BotIntegrationConfigWithKeyResponseDto extends BotIntegrationConfigResponseDto {
  @ApiProperty({ description: 'Chave do tenant para o Canal A. Mostrada UMA vez.' }) tenant_key: string;
}

export class PanelWebhookSecretResponseDto {
  @ApiProperty({ description: 'Segredo HMAC do Canal B. Mostrado UMA vez.' }) panel_webhook_secret: string;
}
