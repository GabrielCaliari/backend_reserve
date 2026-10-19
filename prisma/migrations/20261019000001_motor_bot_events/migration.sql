-- Outbox dos eventos motor -> bot (aditiva)
CREATE TABLE "motor_bot_events" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "evento" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motor_bot_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "motor_bot_events_status_created_at_idx" ON "motor_bot_events"("status", "created_at");
