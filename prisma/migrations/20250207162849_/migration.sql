/*
  Warnings:

  - Added the required column `brand_analysis_token_id` to the `BrandAnalysisRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BrandAnalysisRequest" ADD COLUMN     "brand_analysis_token_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "BrandAnalysisRequest" ADD CONSTRAINT "BrandAnalysisRequest_brand_analysis_token_id_fkey" FOREIGN KEY ("brand_analysis_token_id") REFERENCES "BrandAnalysisToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
