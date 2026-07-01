-- CreateEnum
CREATE TYPE "EDigestStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "digest_reports" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "EDigestStatus" NOT NULL DEFAULT 'DRAFT',
    "executive_summary" TEXT,
    "highlights" JSONB,
    "next_steps" JSONB,
    "admin_comment" TEXT,
    "metrics_payload" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "notification_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digest_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "digest_reports_tenant_id_period_start_key" ON "digest_reports"("tenant_id", "period_start");

-- CreateTable
CREATE TABLE "digest_runs" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" VARCHAR(15) NOT NULL DEFAULT 'gerado',
    "metrics_payload" JSONB NOT NULL,
    "report_id" VARCHAR(25),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "digest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "digest_runs_tenant_id_period_start_idx" ON "digest_runs"("tenant_id", "period_start");

-- AddForeignKey
ALTER TABLE "digest_runs" ADD CONSTRAINT "digest_runs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "digest_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
