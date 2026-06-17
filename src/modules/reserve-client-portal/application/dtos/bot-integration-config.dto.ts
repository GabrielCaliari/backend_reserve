import { IsOptional, IsUrl } from 'class-validator';

export class CreateBotIntegrationConfigDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  n8n_stage_webhook_url?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  n8n_config_publish_webhook_url?: string;
}

export class UpdateBotIntegrationConfigDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  n8n_stage_webhook_url?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  n8n_config_publish_webhook_url?: string;

  @IsOptional()
  chatwoot_base_url?: string;
}
