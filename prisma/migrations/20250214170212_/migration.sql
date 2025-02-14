/*
  Warnings:

  - Added the required column `radical` to the `PublicBrandSearch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PublicBrandSearch" ADD COLUMN     "radical" BOOLEAN NOT NULL;
