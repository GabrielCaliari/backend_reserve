-- Meta Ads no nivel de anuncio (aditiva).

-- Credencial META_ADS sem token proprio usa o system user global (META_SYSTEM_USER_TOKEN).
ALTER TABLE "hotel_api_credentials" ALTER COLUMN "encrypted_token" DROP NOT NULL;

-- ID da campanha na plataforma: o join com a atribuicao passa a ser por ID, nao por nome.
ALTER TABLE "campaign_metrics" ADD COLUMN "campaign_id" VARCHAR(100);
CREATE INDEX "campaign_metrics_client_id_campaign_id_idx" ON "campaign_metrics"("client_id", "campaign_id");

-- Gasto diario por anuncio (insights level=ad).
CREATE TABLE "ad_metrics" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "ad_id" VARCHAR(100) NOT NULL,
    "ad_name" VARCHAR(255),
    "adset_id" VARCHAR(100),
    "adset_name" VARCHAR(255),
    "campaign_id" VARCHAR(100),
    "campaign_name" VARCHAR(255),
    "metric_date" TIMESTAMP(3) NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_metrics_client_id_ad_id_metric_date_key" ON "ad_metrics"("client_id", "ad_id", "metric_date");
CREATE INDEX "ad_metrics_client_id_metric_date_idx" ON "ad_metrics"("client_id", "metric_date");
CREATE INDEX "ad_metrics_client_id_campaign_id_metric_date_idx" ON "ad_metrics"("client_id", "campaign_id", "metric_date");

ALTER TABLE "ad_metrics" ADD CONSTRAINT "ad_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
