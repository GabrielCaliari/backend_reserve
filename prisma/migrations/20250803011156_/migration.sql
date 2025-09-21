-- CreateTable
CREATE TABLE "Config" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "total_leads" INTEGER NOT NULL,
    "open_rate" INTEGER NOT NULL,
    "click_rate" INTEGER NOT NULL,
    "campaign_batch_size" INTEGER,
    "uploaded_leads" BOOLEAN NOT NULL DEFAULT false,
    "copy_variation_type" SMALLINT,
    "funnel_campaign" BOOLEAN NOT NULL DEFAULT false,
    "main_email_id" INTEGER,
    "status" SMALLINT NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "smtp_server_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" SERIAL NOT NULL,
    "type" SMALLINT NOT NULL,
    "name" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "md_content" TEXT NOT NULL,
    "used_ai" BOOLEAN NOT NULL,
    "from_name" VARCHAR(255) NOT NULL,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "subject" VARCHAR(255) NOT NULL,
    "pre_header" VARCHAR(255),
    "use_header" BOOLEAN NOT NULL DEFAULT false,
    "use_footer" BOOLEAN NOT NULL DEFAULT false,
    "tracking_image" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" SERIAL NOT NULL,
    "email_lead_id" INTEGER NOT NULL,
    "campaign_batch_id" INTEGER NOT NULL,
    "email_id" INTEGER NOT NULL,
    "server_response" JSONB,
    "send_date" TIMESTAMP(3),
    "server_response_date" TIMESTAMP(3),
    "last_open_date" TIMESTAMP(3),
    "last_click_date" TIMESTAMP(3),
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "tracking_code" TEXT,
    "email_provider" TEXT NOT NULL,
    "email_sent_to" TEXT NOT NULL,
    "status" SMALLINT NOT NULL,
    "unsubscribe" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribe_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenTracking" (
    "id" SERIAL NOT NULL,
    "delivery_id" INTEGER NOT NULL,
    "bot_chance" SMALLINT NOT NULL,
    "open_date" TIMESTAMP(3) NOT NULL,
    "request_open_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickTracking" (
    "id" SERIAL NOT NULL,
    "delivery_id" INTEGER NOT NULL,
    "bot_chance" SMALLINT NOT NULL,
    "link_clicked" TEXT NOT NULL,
    "link_clicked_date" TIMESTAMP(3) NOT NULL,
    "request_click_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLead" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "email_campaign_id" INTEGER NOT NULL,
    "status" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignBatch" (
    "id" SERIAL NOT NULL,
    "total_leads" INTEGER NOT NULL,
    "un_open_rate" INTEGER NOT NULL DEFAULT 0,
    "un_click_rate" INTEGER NOT NULL DEFAULT 0,
    "un_unsubscribe" INTEGER NOT NULL DEFAULT 0,
    "un_success_rate" INTEGER,
    "un_failed_rate" INTEGER,
    "email_campaign_id" INTEGER NOT NULL,
    "status" SMALLINT NOT NULL,
    "email_id" INTEGER,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMTPServer" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "host" VARCHAR(255),
    "port" VARCHAR(255),
    "username" VARCHAR(255),
    "hash_password" TEXT,
    "hash_access_token" TEXT,
    "hash_private_token" TEXT,
    "region" VARCHAR(255),
    "provider" SMALLINT NOT NULL,
    "default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMTPServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Config_name_key" ON "Config"("name");

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_main_email_id_fkey" FOREIGN KEY ("main_email_id") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_smtp_server_id_fkey" FOREIGN KEY ("smtp_server_id") REFERENCES "SMTPServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_email_lead_id_fkey" FOREIGN KEY ("email_lead_id") REFERENCES "EmailLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "Email"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_campaign_batch_id_fkey" FOREIGN KEY ("campaign_batch_id") REFERENCES "CampaignBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenTracking" ADD CONSTRAINT "OpenTracking_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickTracking" ADD CONSTRAINT "ClickTracking_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLead" ADD CONSTRAINT "EmailLead_email_campaign_id_fkey" FOREIGN KEY ("email_campaign_id") REFERENCES "EmailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignBatch" ADD CONSTRAINT "CampaignBatch_email_campaign_id_fkey" FOREIGN KEY ("email_campaign_id") REFERENCES "EmailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignBatch" ADD CONSTRAINT "CampaignBatch_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;
