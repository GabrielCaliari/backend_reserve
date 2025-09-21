-- CreateTable
CREATE TABLE "AbandonedCart" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "gateway" SMALLINT NOT NULL,
    "sms_status" SMALLINT NOT NULL,
    "first_email" INTEGER,
    "second_email" INTEGER,
    "third_email" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbandonedCartEmail" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "html_message" TEXT NOT NULL,
    "json_response" JSONB NOT NULL,
    "abandoned_cart_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbandonedCartEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbandonedCartSms" (
    "id" SERIAL NOT NULL,
    "phone_number" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "json_response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "abandoned_cart_id" INTEGER NOT NULL,

    CONSTRAINT "AbandonedCartSms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AbandonedCartEmail" ADD CONSTRAINT "AbandonedCartEmail_abandoned_cart_id_fkey" FOREIGN KEY ("abandoned_cart_id") REFERENCES "AbandonedCart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbandonedCartSms" ADD CONSTRAINT "AbandonedCartSms_abandoned_cart_id_fkey" FOREIGN KEY ("abandoned_cart_id") REFERENCES "AbandonedCart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
