-- CreateEnum (idempotent)
DO $$ BEGIN CREATE TYPE "EExamSection" AS ENUM ('B_AND_F', 'TRADE', 'B_AND_F_TRADE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'TIMED_OUT'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable
CREATE TABLE "practice_exams" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "section" "EExamSection" NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" VARCHAR(25) NOT NULL,
    "practice_exam_id" VARCHAR(25) NOT NULL,
    "statement" TEXT NOT NULL,
    "correct_option" VARCHAR(1) NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_questions" (
    "id" VARCHAR(25) NOT NULL,
    "question_id" VARCHAR(25) NOT NULL,
    "label" VARCHAR(1) NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "option_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" VARCHAR(25) NOT NULL,
    "customer_id" VARCHAR(25) NOT NULL,
    "practice_exam_id" VARCHAR(25) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "status" "EAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_responses" (
    "id" VARCHAR(25) NOT NULL,
    "attempt_id" VARCHAR(25) NOT NULL,
    "question_id" VARCHAR(25) NOT NULL,
    "selected_option" VARCHAR(1),
    "is_correct" BOOLEAN,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "answered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_exams_tenant_id_is_active_idx" ON "practice_exams"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "questions_practice_exam_id_order_idx" ON "questions"("practice_exam_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "option_questions_question_id_label_key" ON "option_questions"("question_id", "label");

-- CreateIndex
CREATE INDEX "option_questions_question_id_idx" ON "option_questions"("question_id");

-- CreateIndex
CREATE INDEX "exam_attempts_customer_id_practice_exam_id_idx" ON "exam_attempts"("customer_id", "practice_exam_id");

-- CreateIndex
CREATE INDEX "exam_attempts_customer_id_status_idx" ON "exam_attempts"("customer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "question_responses_attempt_id_question_id_key" ON "question_responses"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "question_responses_attempt_id_idx" ON "question_responses"("attempt_id");

-- AddForeignKey
ALTER TABLE "practice_exams" ADD CONSTRAINT "practice_exams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_practice_exam_id_fkey" FOREIGN KEY ("practice_exam_id") REFERENCES "practice_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_questions" ADD CONSTRAINT "option_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_practice_exam_id_fkey" FOREIGN KEY ("practice_exam_id") REFERENCES "practice_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
