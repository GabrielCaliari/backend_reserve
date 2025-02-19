/*
  Warnings:

  - Added the required column `page` to the `CompanyExport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `page_count` to the `CompanyExport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CompanyExport" ADD COLUMN     "page" SMALLINT NOT NULL,
ADD COLUMN     "page_count" SMALLINT NOT NULL;
