/*
  Warnings:

  - You are about to drop the `TrademarkRegistrationLead` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "TrademarkRegistrationLead";

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" VARCHAR(14) NOT NULL,
    "origin" SMALLINT,
    "description" TEXT NOT NULL,
    "brand" VARCHAR(255),
    "ad_company_size" SMALLINT,
    "ad_company_segment" VARCHAR(50),
    "ad_company_on_market" VARCHAR(50),
    "ad_website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
