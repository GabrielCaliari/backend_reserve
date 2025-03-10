-- CreateTable
CREATE TABLE "APIToken" (
    "id" SERIAL NOT NULL,
    "api_identifier" VARCHAR(25) NOT NULL,
    "hash_id_token" TEXT NOT NULL,
    "hash_acess_token" TEXT NOT NULL,
    "hash_refresh_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "last_refresh" INTEGER,
    "expires_in" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "APIToken_pkey" PRIMARY KEY ("id")
);
