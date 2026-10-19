-- Erros e socorro do bot (contrato v29): tabela bot_issues e marca de socorro no lead (aditiva).
ALTER TABLE "bot_leads" ADD COLUMN "socorro_em" TIMESTAMP(3);

CREATE TABLE "bot_issues" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20),
    "categoria" VARCHAR(20) NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "gravidade" VARCHAR(10) NOT NULL,
    "workflow" VARCHAR(60),
    "no" VARCHAR(120),
    "etapa" VARCHAR(60),
    "mensagem" TEXT,
    "mensagem_hospede" TEXT,
    "resposta_bot" TEXT,
    "contexto" JSONB,
    "socorro" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(12) NOT NULL DEFAULT 'ABERTO',
    "source_event_id" VARCHAR(100) NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_issues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bot_issues_tenant_id_source_event_id_key" ON "bot_issues"("tenant_id", "source_event_id");
CREATE INDEX "bot_issues_tenant_id_ocorrido_em_idx" ON "bot_issues"("tenant_id", "ocorrido_em");
CREATE INDEX "bot_issues_tenant_id_status_idx" ON "bot_issues"("tenant_id", "status");
