-- AlterTable: change type from SMALLINT to VARCHAR(20) for string enum
ALTER TABLE "ActivationToken" ALTER COLUMN "type" TYPE VARCHAR(20) USING
  CASE "type"::text
    WHEN '1' THEN 'ACTIVATION'
    WHEN '2' THEN 'PASSWORD_RESET'
    ELSE "type"::text
  END;

-- AlterTable: constrain token column to VARCHAR(64)
ALTER TABLE "ActivationToken" ALTER COLUMN "token" TYPE VARCHAR(64);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivationToken_token_idx" ON "ActivationToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivationToken_user_id_type_idx" ON "ActivationToken"("user_id", "type");
