-- DropIndex
DROP INDEX "JournalAlert_brand_idx";

-- CreateIndex
CREATE INDEX "JournalAlert_brand_idx" ON "JournalAlert" USING SPGIST ("brand");
