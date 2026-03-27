-- DropIndex
DROP INDEX "Tenant_deletion_scheduled_for_at_idx";

-- CreateTable
CREATE TABLE "analytics_reports" (
    "id" VARCHAR(25) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "url" TEXT NOT NULL,
    "label" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analytics_reports_phone_key" ON "analytics_reports"("phone");
