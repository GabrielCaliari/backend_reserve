-- Corrige resíduo da 20260804000007_add_ig_daily_snapshot, que ficou registrada
-- em _prisma_migrations com applied_steps_count = 0 (marcada via
-- `migrate resolve --applied` sem o SQL ter rodado). A tabela ig_daily_snapshot
-- chegou ao banco por outro caminho, mas o ADD COLUMN não — e como a migration
-- consta aplicada, `migrate deploy` nunca vai reexecutá-la.
--
-- IF NOT EXISTS mantém a migration idempotente nos ambientes onde a
-- 20260804000007 rodou por completo e a coluna já existe.
ALTER TABLE "hotel_api_credentials" ADD COLUMN IF NOT EXISTS "ig_user_id" VARCHAR(50);
