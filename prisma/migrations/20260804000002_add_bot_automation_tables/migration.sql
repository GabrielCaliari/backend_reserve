-- CreateEnum
CREATE TYPE "EBotContactStatus" AS ENUM ('ATIVO', 'PAUSADO');

-- CreateEnum
CREATE TYPE "EBotMessageRole" AS ENUM ('user', 'assistant', 'human');

-- CreateEnum
CREATE TYPE "EBotMessageType" AS ENUM ('texto', 'audio', 'imagem');

-- CreateEnum
CREATE TYPE "EFunnelStage" AS ENUM ('NOVO', 'QUALIFICADO', 'PAGAMENTO', 'FECHADO', 'FRIO');

-- CreateEnum
CREATE TYPE "EFunnelEventAuthor" AS ENUM ('bot', 'humano');

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

-- CreateTable
CREATE TABLE "bot_ingestion_events" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "event_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    "error_message" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "bot_ingestion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_contacts" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20) NOT NULL,
    "nome" VARCHAR(150),
    "origem" VARCHAR(20),
    "status_bot" "EBotContactStatus" NOT NULL DEFAULT 'ATIVO',
    "motivo_pausa" VARCHAR(255),
    "janela_expira" TIMESTAMP(3),
    "consentimento_lgpd" BOOLEAN NOT NULL DEFAULT false,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_messages" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20) NOT NULL,
    "role" "EBotMessageRole" NOT NULL,
    "tipo" "EBotMessageType" NOT NULL,
    "content_preview" VARCHAR(280),
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_messages_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "bot_leads" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20) NOT NULL,
    "current_stage" "EFunnelStage" NOT NULL DEFAULT 'NOVO',
    "perfil" VARCHAR(100),
    "acomodacao_interesse" VARCHAR(255),
    "datas_interesse" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_integration_configs_tenant_id_key" ON "bot_integration_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "bot_ingestion_events_tenant_id_event_type_received_at_idx" ON "bot_ingestion_events"("tenant_id", "event_type", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "bot_ingestion_events_tenant_id_event_id_key" ON "bot_ingestion_events"("tenant_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "bot_contacts_tenant_id_numero_contato_key" ON "bot_contacts"("tenant_id", "numero_contato");

-- CreateIndex
CREATE INDEX "bot_messages_tenant_id_numero_contato_ocorrido_em_idx" ON "bot_messages"("tenant_id", "numero_contato", "ocorrido_em");

-- CreateIndex
CREATE INDEX "funil_eventos_tenant_id_numero_contato_ocorrido_em_idx" ON "funil_eventos"("tenant_id", "numero_contato", "ocorrido_em");

-- CreateIndex
CREATE INDEX "funil_eventos_tenant_id_para_estagio_idx" ON "funil_eventos"("tenant_id", "para_estagio");

-- CreateIndex
CREATE UNIQUE INDEX "bot_leads_tenant_id_numero_contato_key" ON "bot_leads"("tenant_id", "numero_contato");

-- AddForeignKey
ALTER TABLE "bot_integration_configs" ADD CONSTRAINT "bot_integration_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
