-- CreateTable
CREATE TABLE "SMSNotification" (
    "id" SERIAL NOT NULL,
    "webhook" VARCHAR(255) NOT NULL,
    "name" TEXT NOT NULL,
    "total_notifications" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSNotificationEvent" (
    "id" SERIAL NOT NULL,
    "message" VARCHAR(160) NOT NULL,
    "phone_number" VARCHAR(18) NOT NULL,
    "destination_country" SMALLINT NOT NULL,
    "sms_provider" SMALLINT NOT NULL,
    "payload_provider_response" JSONB,
    "payload_message" JSONB,
    "status" SMALLINT NOT NULL,
    "sms_notification_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSNotificationEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SMSNotificationEvent" ADD CONSTRAINT "SMSNotificationEvent_sms_notification_id_fkey" FOREIGN KEY ("sms_notification_id") REFERENCES "SMSNotification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
