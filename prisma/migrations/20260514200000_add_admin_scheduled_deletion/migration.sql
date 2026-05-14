-- AlterTable: Add scheduled deletion fields to Admin
ALTER TABLE "Admin" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "Admin" ADD COLUMN "deletion_requested_at" TIMESTAMP(3);
ALTER TABLE "Admin" ADD COLUMN "deletion_scheduled_for_at" TIMESTAMP(3);
ALTER TABLE "Admin" ADD COLUMN "deletion_requested_by" VARCHAR(25);
ALTER TABLE "Admin" ADD COLUMN "deletion_reason" VARCHAR(255);

-- CreateIndex: Support purge queries for admins due for deletion
CREATE INDEX "Admin_deletion_scheduled_for_at_idx" ON "Admin"("deletion_scheduled_for_at");
