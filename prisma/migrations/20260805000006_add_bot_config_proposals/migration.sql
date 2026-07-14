-- CreateTable
CREATE TABLE "bot_config_propostas" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "campo" VARCHAR(100) NOT NULL,
    "categoria" VARCHAR(20) NOT NULL,
    "valor_atual" JSONB,
    "valor_proposto" JSONB NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'PENDENTE',
    "autor_id" VARCHAR(25) NOT NULL,
    "revisor_id" VARCHAR(25),
    "justificativa" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_config_propostas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_config_propostas_tenant_id_status_idx" ON "bot_config_propostas"("tenant_id", "status");
