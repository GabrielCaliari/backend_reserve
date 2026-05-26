-- CreateEnum
CREATE TYPE "ENotificationType" AS ENUM ('manual', 'event', 'scheduled');

-- CreateEnum
CREATE TYPE "ENotificationScope" AS ENUM ('broadcast', 'targeted');

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(25) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" "ENotificationType" NOT NULL,
    "scope" "ENotificationScope" NOT NULL,
    "tenant_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "event_key" VARCHAR(100),
    "metadata" JSONB,
    "send_email" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_by" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_notification_receipts" (
    "id" VARCHAR(25) NOT NULL,
    "notification_id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "admin_id" VARCHAR(25),
    "first_viewed_at" TIMESTAMP(3),
    "last_viewed_at" TIMESTAMP(3),
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_notification_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_notification_settings" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "inapp_enabled" BOOLEAN NOT NULL DEFAULT true,
    "event_settings" JSONB NOT NULL DEFAULT '{}',
    "cron_settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_type_scope_published_at_idx" ON "notifications"("type", "scope", "published_at");

-- CreateIndex
CREATE INDEX "notifications_created_by_idx" ON "notifications"("created_by");

-- CreateIndex
CREATE INDEX "tenant_notification_receipts_tenant_id_viewed_idx" ON "tenant_notification_receipts"("tenant_id", "viewed");

-- CreateIndex
CREATE INDEX "tenant_notification_receipts_admin_id_viewed_idx" ON "tenant_notification_receipts"("admin_id", "viewed");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_notification_receipts_notification_id_tenant_id_admi_key" ON "tenant_notification_receipts"("notification_id", "tenant_id", "admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_notification_settings_tenant_id_key" ON "tenant_notification_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notification_receipts" ADD CONSTRAINT "tenant_notification_receipts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notification_receipts" ADD CONSTRAINT "tenant_notification_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notification_receipts" ADD CONSTRAINT "tenant_notification_receipts_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notification_settings" ADD CONSTRAINT "tenant_notification_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
