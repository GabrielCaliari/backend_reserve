-- CreateTable
CREATE TABLE IF NOT EXISTS "ActivationToken" (
    "id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "token" TEXT NOT NULL,
    "type" SMALLINT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ActivationToken_token_key" ON "ActivationToken"("token");

-- AddForeignKey
ALTER TABLE "ActivationToken" DROP CONSTRAINT IF EXISTS "ActivationToken_user_id_fkey";
ALTER TABLE "ActivationToken" ADD CONSTRAINT "ActivationToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
