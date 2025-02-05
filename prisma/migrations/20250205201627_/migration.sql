/*
  Warnings:

  - You are about to drop the column `anual_price_id` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "anual_price_id",
ADD COLUMN     "annual_price_id" TEXT;
