-- CreateTable
CREATE TABLE "whatsapp_tracking_links" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "phone_number" VARCHAR(20) NOT NULL,
    "message" TEXT,
    "short_code" VARCHAR(20) NOT NULL,
    "utm_source" VARCHAR(100),
    "utm_medium" VARCHAR(100),
    "utm_campaign" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_tracking_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_link_clicks" (
    "id" VARCHAR(25) NOT NULL,
    "link_id" VARCHAR(25) NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "referer" VARCHAR(500),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "device_type" VARCHAR(20),

    CONSTRAINT "whatsapp_link_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_tracking_links_short_code_key" ON "whatsapp_tracking_links"("short_code");

-- CreateIndex
CREATE INDEX "whatsapp_tracking_links_client_id_idx" ON "whatsapp_tracking_links"("client_id");

-- CreateIndex
CREATE INDEX "whatsapp_tracking_links_short_code_idx" ON "whatsapp_tracking_links"("short_code");

-- CreateIndex
CREATE INDEX "whatsapp_link_clicks_link_id_clicked_at_idx" ON "whatsapp_link_clicks"("link_id", "clicked_at");

-- AddForeignKey
ALTER TABLE "whatsapp_tracking_links" ADD CONSTRAINT "whatsapp_tracking_links_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_link_clicks" ADD CONSTRAINT "whatsapp_link_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "whatsapp_tracking_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
