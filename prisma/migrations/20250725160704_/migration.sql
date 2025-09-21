/*
  Warnings:

  - A unique constraint covering the columns `[webhook]` on the table `SMSNotification` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SMSNotification_webhook_key" ON "SMSNotification"("webhook");
