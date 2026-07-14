-- CreateTable
CREATE TABLE "bot_data_retention_settings" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "retention_days" INTEGER NOT NULL DEFAULT 365,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_data_retention_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_data_retention_settings_tenant_id_key" ON "bot_data_retention_settings"("tenant_id");
