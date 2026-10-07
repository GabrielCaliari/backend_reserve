-- I1 da revisao final 07/10: lease da projecao. Um worker so projeta o evento
-- se o lease estiver livre ou expirado (claimed_at nulo ou mais velho que 5 min).
ALTER TABLE "bot_ingestion_events" ADD COLUMN "claimed_at" TIMESTAMP(3);

-- I2 da revisao final 07/10: chave de idempotencia nas linhas que a projecao
-- insere. Reprojetar um evento parcialmente aplicado nao duplica a linha.
-- O Postgres aceita varios NULL num indice unico, entao linhas antigas e
-- escritas fora do bot nao conflitam.
ALTER TABLE "bot_messages" ADD COLUMN "source_event_id" VARCHAR(100);
CREATE UNIQUE INDEX "bot_messages_tenant_id_source_event_id_key" ON "bot_messages"("tenant_id", "source_event_id");

ALTER TABLE "funil_eventos" ADD COLUMN "source_event_id" VARCHAR(100);
CREATE UNIQUE INDEX "funil_eventos_tenant_id_source_event_id_key" ON "funil_eventos"("tenant_id", "source_event_id");

ALTER TABLE "bot_followup_attempts" ADD COLUMN "source_event_id" VARCHAR(100);
CREATE UNIQUE INDEX "bot_followup_attempts_tenant_id_source_event_id_key" ON "bot_followup_attempts"("tenant_id", "source_event_id");

ALTER TABLE "atribuicao_conversa" ADD COLUMN "source_event_id" VARCHAR(100);
CREATE UNIQUE INDEX "atribuicao_conversa_tenant_id_source_event_id_key" ON "atribuicao_conversa"("tenant_id", "source_event_id");

-- Backlog: as linhas nao processadas que existem hoje sao anteriores ao go-live
-- (dados de teste) e nao podem ser reprojetadas. attempts = 5 (MAX_PROJECTION_ATTEMPTS)
-- tira todas do reprocesso automatico.
UPDATE "bot_ingestion_events" SET "attempts" = 5 WHERE "status" <> 'PROCESSED';
