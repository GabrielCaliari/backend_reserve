-- Feedback dos hospedes (contrato v29, hospede.feedback): tabela bot_feedbacks (aditiva).
CREATE TABLE "bot_feedbacks" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20) NOT NULL,
    "texto" TEXT,
    "resumo" VARCHAR(255),
    "nota" INTEGER,
    "sentimento" VARCHAR(10) NOT NULL DEFAULT 'neutro',
    "check_out" DATE,
    "link_enviado" BOOLEAN NOT NULL DEFAULT false,
    "source_event_id" VARCHAR(100) NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bot_feedbacks_tenant_id_source_event_id_key" ON "bot_feedbacks"("tenant_id", "source_event_id");
CREATE INDEX "bot_feedbacks_tenant_id_ocorrido_em_idx" ON "bot_feedbacks"("tenant_id", "ocorrido_em");
