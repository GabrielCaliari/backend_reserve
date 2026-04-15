-- AlterTable
ALTER TABLE "AdminCredential" ADD COLUMN     "hash_version" SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN     "failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserCredential" ADD COLUMN     "hash_version" SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN     "failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);
