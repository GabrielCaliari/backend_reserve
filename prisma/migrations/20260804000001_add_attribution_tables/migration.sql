-- CreateEnum
CREATE TYPE "EAttributionSource" AS ENUM ('anuncio', 'link', 'organico', 'site');

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
CREATE INDEX "atribuicao_conversa_tenant_id_numero_contato_idx" ON "atribuicao_conversa"("tenant_id", "numero_contato");

-- CreateIndex
CREATE INDEX "atribuicao_conversa_tenant_id_ocorrido_em_idx" ON "atribuicao_conversa"("tenant_id", "ocorrido_em");

-- CreateIndex
CREATE INDEX "atribuicao_conversa_link_code_idx" ON "atribuicao_conversa"("link_code");

-- CreateIndex
CREATE UNIQUE INDEX "attribution_settings_tenant_id_key" ON "attribution_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "atribuicao_conversa" ADD CONSTRAINT "atribuicao_conversa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_settings" ADD CONSTRAINT "attribution_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
