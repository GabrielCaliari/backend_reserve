-- CreateTable
CREATE TABLE "LeadQualificationMessage" (
    "id" SERIAL NOT NULL,
    "prompt_token" INTEGER NOT NULL,
    "completion_token" INTEGER NOT NULL,
    "json" JSONB NOT NULL,
    "profile_name" VARCHAR(100) NOT NULL,
    "phone_number_id" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(80) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "message" TEXT NOT NULL,
    "message_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadQualificationMessage_pkey" PRIMARY KEY ("id")
);
