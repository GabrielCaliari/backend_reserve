-- CreateTable
CREATE TABLE "bot_followup_attempts" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20) NOT NULL,
    "tentativa" SMALLINT NOT NULL,
    "tipo_janela" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_followup_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_followup_attempts_tenant_id_numero_contato_idx" ON "bot_followup_attempts"("tenant_id", "numero_contato");
