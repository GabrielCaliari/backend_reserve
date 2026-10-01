-- Contrato Bot <-> Painel v2 (parte aditiva). ADD VALUE nao pode ser usado na
-- mesma transacao em que e criado: nenhum dos valores novos e referenciado aqui.

-- AlterEnum
ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS 'VERIFICANDO';
ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_FICHA';
ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_PAGAMENTO';
ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS 'EM_CONFIRMACAO';
ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS 'PAUSADO_HUMANO';
ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS 'FECHADO';
ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS 'EM_ESTADIA';
ALTER TYPE "EBotContactStatus" ADD VALUE IF NOT EXISTS 'FRIO';

ALTER TYPE "EBotMessageType" ADD VALUE IF NOT EXISTS 'botoes';
ALTER TYPE "EBotMessageType" ADD VALUE IF NOT EXISTS 'template';
ALTER TYPE "EBotMessageType" ADD VALUE IF NOT EXISTS 'sistema';

ALTER TYPE "EBookingEngineType" ADD VALUE IF NOT EXISTS 'HOSPEDIN';

-- AlterTable: integracao do bot
ALTER TABLE "bot_integration_configs"
  ADD COLUMN "bot_tenant_ref" VARCHAR(60),
  ADD COLUMN "n8n_panel_webhook_url" VARCHAR(500),
  ADD COLUMN "panel_webhook_secret_enc" TEXT,
  ADD COLUMN "last_heartbeat_data" JSONB;

CREATE UNIQUE INDEX "bot_integration_configs_bot_tenant_ref_key"
  ON "bot_integration_configs"("bot_tenant_ref");

-- AlterTable: snapshot do contato
ALTER TABLE "bot_contacts"
  ADD COLUMN "ocasiao" VARCHAR(20),
  ADD COLUMN "source_id" VARCHAR(100),
  ADD COLUMN "link_code" VARCHAR(20),
  ADD COLUMN "ctwa_clid" VARCHAR(255),
  ADD COLUMN "iniciado_em" TIMESTAMP(3),
  ADD COLUMN "snapshot_em" TIMESTAMP(3),
  ADD COLUMN "last_user_message_at" TIMESTAMP(3);

-- Contatos antigos: o inicio conhecido e a criacao da linha.
UPDATE "bot_contacts" SET "iniciado_em" = "created_at" WHERE "iniciado_em" IS NULL;

-- Contrato 4.1: consentimento e true por padrao (a conversa e iniciada pelo hospede).
UPDATE "bot_contacts" SET "consentimento_lgpd" = true;
ALTER TABLE "bot_contacts" ALTER COLUMN "consentimento_lgpd" SET DEFAULT true;

CREATE INDEX "bot_contacts_tenant_id_iniciado_em_idx" ON "bot_contacts"("tenant_id", "iniciado_em");

-- AlterTable: projecao do lead (estagio + hold + etiquetas)
ALTER TABLE "bot_leads"
  ADD COLUMN "stage_em" TIMESTAMP(3),
  ADD COLUMN "hold_codigo" VARCHAR(20),
  ADD COLUMN "hold_status" VARCHAR(20),
  ADD COLUMN "hold_valor_cents" INTEGER,
  ADD COLUMN "hold_pms_reservation_id" VARCHAR(60),
  ADD COLUMN "hold_em" TIMESTAMP(3),
  ADD COLUMN "valor_confirmado_cents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recuperar" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "motivo_perda" VARCHAR(255);

-- AlterTable
ALTER TABLE "bot_followup_attempts" ADD COLUMN "regua" VARCHAR(20);
ALTER TABLE "bot_config_propostas" ADD COLUMN "justificativa_cliente" TEXT;

-- CreateTable: outbox do canal reverso (painel -> bot)
CREATE TABLE "bot_panel_actions" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "phone" VARCHAR(20),
    "actor_id" VARCHAR(25),
    "payload" JSONB NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "response_state" VARCHAR(30),
    "last_error" TEXT,
    "last_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_panel_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bot_panel_actions_tenant_id_status_idx" ON "bot_panel_actions"("tenant_id", "status");
