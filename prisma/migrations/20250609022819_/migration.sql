/*
  Warnings:

  - Added the required column `products` to the `AbandonedCart` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AbandonedCart" ADD COLUMN     "payment_link" TEXT,
ADD COLUMN     "products" JSONB NOT NULL;
