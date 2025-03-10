-- CreateTable
CREATE TABLE "TrademarkRegistrationLead" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" VARCHAR(14) NOT NULL,
    "brand" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "company_size" SMALLINT NOT NULL,
    "company_segment" VARCHAR(50) NOT NULL,
    "company_on_market" VARCHAR(50) NOT NULL,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrademarkRegistrationLead_pkey" PRIMARY KEY ("id")
);
