-- CreateTable
CREATE TABLE "plano_semestral" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "semestre" VARCHAR(10) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "eixos" JSONB NOT NULL,
    "criado_por" VARCHAR(25) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plano_semestral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plano_semestral_tenant_id_semestre_key" ON "plano_semestral"("tenant_id", "semestre");

-- CreateTable
CREATE TABLE "plano_entregas" (
    "id" VARCHAR(25) NOT NULL,
    "plano_id" VARCHAR(25) NOT NULL,
    "mes" SMALLINT NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "status" VARCHAR(15) NOT NULL DEFAULT 'planejado',
    "milestone_id" VARCHAR(25),
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plano_entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plano_entregas_plano_id_idx" ON "plano_entregas"("plano_id");

-- AddForeignKey
ALTER TABLE "plano_entregas" ADD CONSTRAINT "plano_entregas_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "plano_semestral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
