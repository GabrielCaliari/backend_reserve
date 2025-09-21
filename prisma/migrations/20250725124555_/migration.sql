/*
  Warnings:

  - You are about to drop the column `phone_number` on the `SMSNotificationEvent` table. All the data in the column will be lost.
  - Added the required column `destination_number` to the `SMSNotificationEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_number` to the `SMSNotificationEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SMSNotificationEvent" DROP COLUMN "phone_number",
ADD COLUMN     "destination_number" VARCHAR(18) NOT NULL,
ADD COLUMN     "sender_number" VARCHAR(18) NOT NULL;
