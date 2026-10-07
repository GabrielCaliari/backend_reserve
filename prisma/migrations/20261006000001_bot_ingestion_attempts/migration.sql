-- B2 da auditoria 06/10: tentativas de projecao para o reprocesso de eventos presos.
ALTER TABLE "bot_ingestion_events" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "bot_ingestion_events_status_received_at_idx" ON "bot_ingestion_events"("status", "received_at");
