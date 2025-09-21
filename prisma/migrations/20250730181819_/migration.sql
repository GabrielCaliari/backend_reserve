/*
  Warnings:

  - You are about to drop the column `ad_company_on_market` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `ad_company_segment` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `ad_company_size` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `ad_website` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "ad_company_on_market",
DROP COLUMN "ad_company_segment",
DROP COLUMN "ad_company_size",
DROP COLUMN "ad_website",
DROP COLUMN "brand",
ADD COLUMN     "data" JSONB;
