-- CreateTable
CREATE TABLE "BrandAnalysisRequest" (
    "id" SERIAL NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "brand_analysis_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAnalysisRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BrandAnalysisRequest" ADD CONSTRAINT "BrandAnalysisRequest_brand_analysis_id_fkey" FOREIGN KEY ("brand_analysis_id") REFERENCES "BrandAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysisRequest" ADD CONSTRAINT "BrandAnalysisRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
