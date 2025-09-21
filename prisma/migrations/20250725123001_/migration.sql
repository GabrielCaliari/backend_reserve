/*
  Warnings:

  - You are about to drop the `AbandonedCart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AbandonedCartEmail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AbandonedCartSms` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AbandonedCartEmail" DROP CONSTRAINT "AbandonedCartEmail_abandoned_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "AbandonedCartSms" DROP CONSTRAINT "AbandonedCartSms_abandoned_cart_id_fkey";

-- DropTable
DROP TABLE "AbandonedCart";

-- DropTable
DROP TABLE "AbandonedCartEmail";

-- DropTable
DROP TABLE "AbandonedCartSms";
