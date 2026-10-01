-- Contrato Bot <-> Painel v2 (limpeza). O Chatwoot saiu (§1.1) e os dois
-- webhooks antigos foram substituidos pelo canal reverso unico (§5).

ALTER TABLE "bot_integration_configs"
  DROP COLUMN "chatwoot_base_url",
  DROP COLUMN "n8n_stage_webhook_url",
  DROP COLUMN "n8n_config_publish_webhook_url";

-- Substituida por bot_panel_actions.
DROP TABLE "bot_stage_webhook_dispatches";
