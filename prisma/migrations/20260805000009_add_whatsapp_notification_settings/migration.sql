-- AlterTable
ALTER TABLE "tenant_notification_settings" ADD COLUMN     "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_phone" VARCHAR(20);
