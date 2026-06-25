-- Fase 5 (Painel Reserve) shim for Fase 2 (atribuição) / Fase 3 (automação
-- WhatsApp) / Fase 4 (Instagram + conteúdo) dependency tables. Those phases
-- are not merged into main as of this branch. Shapes copied verbatim from the
-- plan's Fase 2 Task 1, Fase 3 Task 1, and Fase 4 Task 3/7 interfaces.
--
-- INTEGRATION TODO: once Fase 2/3/4 merge into main, drop this migration (and
-- the matching block in schema.prisma) in favor of the canonical one.

-- CreateEnum
CREATE TYPE "EAttributionSource" AS ENUM ('anuncio', 'link', 'organico', 'site');

-- CreateEnum
CREATE TYPE "EFunnelStage" AS ENUM ('NOVO', 'QUALIFICADO', 'PAGAMENTO', 'FECHADO', 'FRIO');

-- CreateEnum
CREATE TYPE "EFunnelEventAuthor" AS ENUM ('bot', 'humano');

-- CreateTable
CREATE TABLE "atribuicao_conversa" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20) NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "fonte" "EAttributionSource" NOT NULL,
    "ad_id" VARCHAR(100),
    "adset_id" VARCHAR(100),
    "campaign_id" VARCHAR(100),
    "ctwa_clid" VARCHAR(255),
    "link_code" VARCHAR(20),
    "utm_source" VARCHAR(100),
    "utm_medium" VARCHAR(100),
    "utm_campaign" VARCHAR(100),
    "primeiro_toque" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_toque" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atribuicao_conversa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "atribuicao_conversa_tenant_id_numero_contato_idx" ON "atribuicao_conversa"("tenant_id", "numero_contato");

-- CreateIndex
CREATE INDEX "atribuicao_conversa_tenant_id_ocorrido_em_idx" ON "atribuicao_conversa"("tenant_id", "ocorrido_em");

-- CreateIndex
CREATE INDEX "atribuicao_conversa_link_code_idx" ON "atribuicao_conversa"("link_code");

-- AddForeignKey
ALTER TABLE "atribuicao_conversa" ADD CONSTRAINT "atribuicao_conversa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "attribution_settings" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "window_days" INTEGER NOT NULL DEFAULT 30,
    "source_priority" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribution_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attribution_settings_tenant_id_key" ON "attribution_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "attribution_settings" ADD CONSTRAINT "attribution_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "funil_eventos" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20) NOT NULL,
    "de_estagio" "EFunnelStage",
    "para_estagio" "EFunnelStage" NOT NULL,
    "autor_tipo" "EFunnelEventAuthor" NOT NULL,
    "autor_id" VARCHAR(25),
    "motivo" VARCHAR(255),
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funil_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (append-only: no unique constraint on tenant_id/numero_contato)
CREATE INDEX "funil_eventos_tenant_id_numero_contato_ocorrido_em_idx" ON "funil_eventos"("tenant_id", "numero_contato", "ocorrido_em");

-- CreateIndex
CREATE INDEX "funil_eventos_tenant_id_para_estagio_idx" ON "funil_eventos"("tenant_id", "para_estagio");

-- CreateTable
CREATE TABLE "bot_integration_configs" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "tenant_key_hash" TEXT NOT NULL,
    "tenant_key_salt" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "n8n_stage_webhook_url" VARCHAR(500),
    "n8n_config_publish_webhook_url" VARCHAR(500),
    "last_heartbeat_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_integration_configs_tenant_id_key" ON "bot_integration_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "bot_integration_configs" ADD CONSTRAINT "bot_integration_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable (Fase 4 Task 7 shim, needed by Fase 5 digest/semester-plan/bot-config auto-events)
CREATE TABLE "activity_log" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "created_by" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_log_tenant_id_created_at_idx" ON "activity_log"("tenant_id", "created_at");

-- CreateTable (Fase 4 Task 3 shim, needed by Fase 5 Task 5's baseline snapshot)
CREATE TABLE "ig_daily_snapshot" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "date" DATE NOT NULL,
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engaged_accounts" INTEGER NOT NULL DEFAULT 0,
    "total_interactions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ig_daily_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ig_daily_snapshot_tenant_id_date_key" ON "ig_daily_snapshot"("tenant_id", "date");
