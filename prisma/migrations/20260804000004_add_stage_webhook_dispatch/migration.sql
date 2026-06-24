-- CreateTable
CREATE TABLE "bot_stage_webhook_dispatches" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "funnel_event_id" VARCHAR(25) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_stage_webhook_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_stage_webhook_dispatches_tenant_id_status_idx" ON "bot_stage_webhook_dispatches"("tenant_id", "status");
