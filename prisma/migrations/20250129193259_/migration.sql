/*
  Warnings:

  - You are about to drop the column `fantasy_name` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `federative_entity` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `legal_nature` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `mei_non_option_date` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `mei_opting_date` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `mei_option` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `nacimal_simple_opting_date` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `nacimal_simple_option` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `qualification_representative_before_cnpj` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `social_capital` on the `Company` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Company_uf_city_code_branch_type_business_name_size_status__idx";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "fantasy_name",
DROP COLUMN "federative_entity",
DROP COLUMN "legal_nature",
DROP COLUMN "mei_non_option_date",
DROP COLUMN "mei_opting_date",
DROP COLUMN "mei_option",
DROP COLUMN "nacimal_simple_opting_date",
DROP COLUMN "nacimal_simple_option",
DROP COLUMN "qualification_representative_before_cnpj",
DROP COLUMN "size",
DROP COLUMN "social_capital";

-- CreateIndex
CREATE INDEX "Company_uf_city_code_branch_type_business_name_status_date__idx" ON "Company"("uf", "city_code", "branch_type", "business_name", "status", "date_status", "code_detail_status", "coutry_code", "start_date", "main_cnae", "secondary_cnae", "created_at" DESC);
