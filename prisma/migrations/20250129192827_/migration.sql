/*
  Warnings:

  - You are about to drop the column `main_cnae_id` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the `SecondaryCnae` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_main_cnae_id_fkey";

-- DropForeignKey
ALTER TABLE "Partner" DROP CONSTRAINT "Partner_company_id_fkey";

-- DropForeignKey
ALTER TABLE "SecondaryCnae" DROP CONSTRAINT "SecondaryCnae_cnae_id_fkey";

-- DropForeignKey
ALTER TABLE "SecondaryCnae" DROP CONSTRAINT "SecondaryCnae_company_id_fkey";

-- DropForeignKey
ALTER TABLE "TaxRegime" DROP CONSTRAINT "TaxRegime_company_id_fkey";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "main_cnae_id";

-- DropTable
DROP TABLE "SecondaryCnae";
