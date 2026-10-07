import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateBotIntegrationConfigDto {
  @ApiPropertyOptional({ description: 'Identificador do tenant no bot (vai como tenant_id no Canal B).', maxLength: 60, example: 'cli_dona_tereza' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  bot_tenant_ref?: string;

  @ApiPropertyOptional({ description: 'URL do WF6 (Canal B). Em producao: https publico.', example: 'https://bot.reservemkt.com.br/webhook/painel' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  n8n_panel_webhook_url?: string;

  /** Write-only: o segredo HMAC do canal reverso. Nunca volta em resposta. */
  @ApiPropertyOptional({ description: 'Write-only. Segredo HMAC do Canal B (16-200). Prefira PATCH regenerate-panel-secret.', minLength: 16, maxLength: 200, writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  panel_webhook_secret?: string;
}

export class UpdateBotIntegrationConfigDto {
  @ApiPropertyOptional({ description: 'Identificador do tenant no bot (vai como tenant_id no Canal B).', maxLength: 60, example: 'cli_dona_tereza' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  bot_tenant_ref?: string;

  @ApiPropertyOptional({ description: 'URL do WF6 (Canal B). Em producao: https publico.', example: 'https://bot.reservemkt.com.br/webhook/painel' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  n8n_panel_webhook_url?: string;

  /** Write-only: o segredo HMAC do canal reverso. Nunca volta em resposta. */
  @ApiPropertyOptional({ description: 'Write-only. Segredo HMAC do Canal B (16-200). Prefira PATCH regenerate-panel-secret.', minLength: 16, maxLength: 200, writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  panel_webhook_secret?: string;
}
