-- CreateTable
CREATE TABLE "AdditionalTokenPack" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalTokenPack_pkey" PRIMARY KEY ("id")
);
