-- AlterTable
ALTER TABLE "hotel_api_credentials" ADD COLUMN     "ig_user_id" VARCHAR(50);

-- CreateTable
CREATE TABLE "ig_daily_snapshot" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "date" DATE NOT NULL,
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engaged_accounts" INTEGER NOT NULL DEFAULT 0,
    "total_interactions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ig_daily_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ig_daily_snapshot_tenant_id_date_key" ON "ig_daily_snapshot"("tenant_id", "date");
