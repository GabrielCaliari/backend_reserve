/*
  Warnings:

  - You are about to alter the column `company_count` on the `CompanyExport` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - Added the required column `status` to the `CompanyExport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_exported` to the `CompanyExport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CompanyExport" ADD COLUMN     "status" SMALLINT NOT NULL,
ADD COLUMN     "total_exported" SMALLINT NOT NULL,
ALTER COLUMN "company_count" SET DATA TYPE SMALLINT,
ALTER COLUMN "public_link" DROP NOT NULL;
