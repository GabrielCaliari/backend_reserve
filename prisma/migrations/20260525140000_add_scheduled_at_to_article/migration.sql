-- AlterTable
ALTER TABLE "Article" ADD COLUMN "scheduled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Article_status_scheduled_at_idx" ON "Article"("status", "scheduled_at");
