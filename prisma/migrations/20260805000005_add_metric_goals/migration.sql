-- CreateTable
CREATE TABLE "metric_goals" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "metric_key" VARCHAR(50) NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "show_goal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metric_goals_tenant_id_metric_key_period_key" ON "metric_goals"("tenant_id", "metric_key", "period");
