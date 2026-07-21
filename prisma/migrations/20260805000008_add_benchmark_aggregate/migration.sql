-- CreateTable
CREATE TABLE "benchmark_agregado" (
    "id" VARCHAR(25) NOT NULL,
    "cohort_metric" VARCHAR(50) NOT NULL,
    "tenant_count" INTEGER NOT NULL,
    "min_contract_months" INTEGER NOT NULL,
    "period_label" VARCHAR(50) NOT NULL,
    "value_json" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_agregado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "benchmark_agregado_cohort_metric_computed_at_idx" ON "benchmark_agregado"("cohort_metric", "computed_at");
