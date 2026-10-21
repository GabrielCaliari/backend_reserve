-- Ponte com o Meta Ads: conta de anuncios da credencial META_ADS (aditiva).
ALTER TABLE "hotel_api_credentials" ADD COLUMN "meta_ad_account_id" VARCHAR(40);

-- Reservas confirmadas pelo bot (reserva.confirmada): fonte do ROI nivel 3 (aditiva).
CREATE TABLE "bot_reservas" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "numero_contato" VARCHAR(20) NOT NULL,
    "codigo" VARCHAR(20),
    "valor_cents" INTEGER NOT NULL DEFAULT 0,
    "source_id" VARCHAR(100),
    "ctwa_clid" VARCHAR(255),
    "link_code" VARCHAR(20),
    "source_event_id" VARCHAR(100) NOT NULL,
    "confirmado_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_reservas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bot_reservas_tenant_id_source_event_id_key" ON "bot_reservas"("tenant_id", "source_event_id");
CREATE INDEX "bot_reservas_tenant_id_confirmado_em_idx" ON "bot_reservas"("tenant_id", "confirmado_em");
CREATE INDEX "bot_reservas_tenant_id_numero_contato_idx" ON "bot_reservas"("tenant_id", "numero_contato");
