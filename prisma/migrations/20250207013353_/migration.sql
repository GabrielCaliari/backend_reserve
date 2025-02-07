-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pibotMessagesId" INTEGER;

-- CreateTable
CREATE TABLE "PibotMessages" (
    "id" SERIAL NOT NULL,
    "chat_id" VARCHAR(100) NOT NULL,
    "choices" JSONB NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "usage" JSONB NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PibotMessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_from_webhook" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAnalysisToken" (
    "id" SERIAL NOT NULL,
    "status" SMALLINT NOT NULL,
    "brand_analysis_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAnalysisToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_customer_id_idx" ON "Order"("customer_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pibotMessagesId_fkey" FOREIGN KEY ("pibotMessagesId") REFERENCES "PibotMessages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysisToken" ADD CONSTRAINT "BrandAnalysisToken_brand_analysis_id_fkey" FOREIGN KEY ("brand_analysis_id") REFERENCES "BrandAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysisToken" ADD CONSTRAINT "BrandAnalysisToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
