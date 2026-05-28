-- CreateEnum
CREATE TYPE "EWhatsAppTemplateType" AS ENUM ('PRE_ARRIVAL', 'POST_STAY', 'REACTIVATION', 'UPSELL');

-- CreateEnum
CREATE TYPE "EWhatsAppMessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "EGuestSegment" AS ENUM ('leisure', 'business', 'honeymoon', 'family', 'group');

-- CreateTable
CREATE TABLE "hotel_reputation_metrics" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "reference_month" TIMESTAMP(3) NOT NULL,
    "google_rating" DOUBLE PRECISION,
    "google_reviews_count" INTEGER NOT NULL DEFAULT 0,
    "tripadvisor_rating" DOUBLE PRECISION,
    "tripadvisor_reviews" INTEGER NOT NULL DEFAULT 0,
    "booking_rating" DOUBLE PRECISION,
    "booking_reviews" INTEGER NOT NULL DEFAULT 0,
    "overall_sentiment" VARCHAR(20),
    "inserted_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_reputation_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_monthly_kpis" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "reference_month" TIMESTAMP(3) NOT NULL,
    "total_rooms" INTEGER NOT NULL,
    "occupied_rooms" INTEGER NOT NULL DEFAULT 0,
    "adr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revpar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "direct_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inserted_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_monthly_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_window_metrics" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "reference_month" TIMESTAMP(3) NOT NULL,
    "last_minute_count" INTEGER NOT NULL DEFAULT 0,
    "medium_term_count" INTEGER NOT NULL DEFAULT 0,
    "long_term_count" INTEGER NOT NULL DEFAULT 0,
    "last_minute_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medium_term_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "long_term_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inserted_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_window_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "EWhatsAppTemplateType" NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "template_id" VARCHAR(25) NOT NULL,
    "guest_phone" VARCHAR(20) NOT NULL,
    "guest_name" VARCHAR(100),
    "status" "EWhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_parity_checks" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL,
    "direct_rate" DOUBLE PRECISION NOT NULL,
    "booking_rate" DOUBLE PRECISION,
    "expedia_rate" DOUBLE PRECISION,
    "airbnb_rate" DOUBLE PRECISION,
    "has_violation" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "inserted_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_parity_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_budgets" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "reference_month" TIMESTAMP(3) NOT NULL,
    "total_budget" DOUBLE PRECISION NOT NULL,
    "meta_ads_budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "google_ads_budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "inserted_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_guests" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "country" VARCHAR(100),
    "segment" "EGuestSegment" NOT NULL DEFAULT 'leisure',
    "total_stays" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "first_stay" TIMESTAMP(3),
    "last_stay" TIMESTAMP(3),
    "booking_source" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_stays" (
    "id" VARCHAR(25) NOT NULL,
    "guest_id" VARCHAR(25) NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "room_type" VARCHAR(100),
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "booking_source" VARCHAR(100),
    "booking_window_days" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_stays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hotel_reputation_metrics_client_id_reference_month_idx" ON "hotel_reputation_metrics"("client_id", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_reputation_metrics_client_id_reference_month_key" ON "hotel_reputation_metrics"("client_id", "reference_month");

-- CreateIndex
CREATE INDEX "hotel_monthly_kpis_client_id_reference_month_idx" ON "hotel_monthly_kpis"("client_id", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_monthly_kpis_client_id_reference_month_key" ON "hotel_monthly_kpis"("client_id", "reference_month");

-- CreateIndex
CREATE INDEX "booking_window_metrics_client_id_reference_month_idx" ON "booking_window_metrics"("client_id", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "booking_window_metrics_client_id_reference_month_key" ON "booking_window_metrics"("client_id", "reference_month");

-- CreateIndex
CREATE INDEX "whatsapp_templates_client_id_type_idx" ON "whatsapp_templates"("client_id", "type");

-- CreateIndex
CREATE INDEX "whatsapp_messages_client_id_status_idx" ON "whatsapp_messages"("client_id", "status");

-- CreateIndex
CREATE INDEX "whatsapp_messages_template_id_idx" ON "whatsapp_messages"("template_id");

-- CreateIndex
CREATE INDEX "rate_parity_checks_client_id_check_date_idx" ON "rate_parity_checks"("client_id", "check_date");

-- CreateIndex
CREATE INDEX "rate_parity_checks_client_id_has_violation_idx" ON "rate_parity_checks"("client_id", "has_violation");

-- CreateIndex
CREATE INDEX "marketing_budgets_client_id_reference_month_idx" ON "marketing_budgets"("client_id", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_budgets_client_id_reference_month_key" ON "marketing_budgets"("client_id", "reference_month");

-- CreateIndex
CREATE INDEX "hotel_guests_client_id_idx" ON "hotel_guests"("client_id");

-- CreateIndex
CREATE INDEX "hotel_guests_client_id_segment_idx" ON "hotel_guests"("client_id", "segment");

-- CreateIndex
CREATE INDEX "hotel_guests_client_id_last_stay_idx" ON "hotel_guests"("client_id", "last_stay");

-- CreateIndex
CREATE INDEX "guest_stays_guest_id_idx" ON "guest_stays"("guest_id");

-- CreateIndex
CREATE INDEX "guest_stays_guest_id_check_in_idx" ON "guest_stays"("guest_id", "check_in");

-- AddForeignKey
ALTER TABLE "hotel_reputation_metrics" ADD CONSTRAINT "hotel_reputation_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_monthly_kpis" ADD CONSTRAINT "hotel_monthly_kpis_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_window_metrics" ADD CONSTRAINT "booking_window_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "whatsapp_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_parity_checks" ADD CONSTRAINT "rate_parity_checks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_budgets" ADD CONSTRAINT "marketing_budgets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_guests" ADD CONSTRAINT "hotel_guests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_stays" ADD CONSTRAINT "guest_stays_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "hotel_guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
