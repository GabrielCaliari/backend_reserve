-- CreateTable
CREATE TABLE "practice_exam_bundles" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_exam_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_exam_bundle_exams" (
    "bundle_id" VARCHAR(25) NOT NULL,
    "exam_id" VARCHAR(25) NOT NULL,

    CONSTRAINT "practice_exam_bundle_exams_pkey" PRIMARY KEY ("bundle_id","exam_id")
);

-- CreateIndex
CREATE INDEX "practice_exam_bundles_tenant_id_is_active_idx" ON "practice_exam_bundles"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "practice_exam_bundles" ADD CONSTRAINT "practice_exam_bundles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_exam_bundle_exams" ADD CONSTRAINT "practice_exam_bundle_exams_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "practice_exam_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
