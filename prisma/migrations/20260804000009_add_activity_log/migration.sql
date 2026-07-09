-- CreateEnum
CREATE TYPE "EActivityLogType" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "EActivityLogCategory" AS ENUM ('post', 'campaign', 'report', 'bot', 'meeting', 'other');

-- CreateTable
CREATE TABLE "activity_log" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "type" "EActivityLogType" NOT NULL,
    "category" "EActivityLogCategory" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "created_by" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_log_tenant_id_created_at_idx" ON "activity_log"("tenant_id", "created_at");
