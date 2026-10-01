import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateBotIntegrationConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  bot_tenant_ref?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  n8n_panel_webhook_url?: string;

  /** Write-only: o segredo HMAC do canal reverso. Nunca volta em resposta. */
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  panel_webhook_secret?: string;
}

export class UpdateBotIntegrationConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  bot_tenant_ref?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  n8n_panel_webhook_url?: string;

  /** Write-only: o segredo HMAC do canal reverso. Nunca volta em resposta. */
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  panel_webhook_secret?: string;
}
