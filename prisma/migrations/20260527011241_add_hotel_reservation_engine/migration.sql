/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id]` on the table `hotel_clients` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EBookingEngineType" AS ENUM ('MANUAL', 'OMNIBEES', 'STAYS', 'FOCO', 'HITS', 'TOTVS', 'GENERIC_WEBHOOK');

-- CreateEnum
CREATE TYPE "EReservationSource" AS ENUM ('DIRECT', 'BOOKING_COM', 'EXPEDIA', 'AIRBNB', 'TRIPADVISOR', 'GOOGLE_HOTEL_ADS', 'OTHER_OTA', 'MANUAL');

-- CreateEnum
CREATE TYPE "EReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'NO_SHOW', 'CHECKED_IN', 'CHECKED_OUT');

-- AlterTable
ALTER TABLE "hotel_clients" ADD COLUMN     "booking_engine_type" "EBookingEngineType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "tenant_id" VARCHAR(25),
ADD COLUMN     "webhook_secret" VARCHAR(100);

-- CreateTable
CREATE TABLE "hotel_reservations" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "external_id" VARCHAR(100),
    "engine_type" "EBookingEngineType" NOT NULL DEFAULT 'MANUAL',
    "source" "EReservationSource" NOT NULL DEFAULT 'DIRECT',
    "status" "EReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "guest_name" VARCHAR(255) NOT NULL,
    "guest_email" VARCHAR(255),
    "guest_phone" VARCHAR(20),
    "guest_country" VARCHAR(100),
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "room_type" VARCHAR(100),
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "booking_date" TIMESTAMP(3) NOT NULL,
    "booking_window_days" INTEGER,
    "raw_payload" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hotel_reservations_tenant_id_status_idx" ON "hotel_reservations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "hotel_reservations_tenant_id_source_idx" ON "hotel_reservations"("tenant_id", "source");

-- CreateIndex
CREATE INDEX "hotel_reservations_tenant_id_check_in_idx" ON "hotel_reservations"("tenant_id", "check_in");

-- CreateIndex
CREATE INDEX "hotel_reservations_tenant_id_booking_date_idx" ON "hotel_reservations"("tenant_id", "booking_date");

-- CreateIndex
CREATE INDEX "hotel_reservations_external_id_idx" ON "hotel_reservations"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_clients_tenant_id_key" ON "hotel_clients"("tenant_id");

-- AddForeignKey
ALTER TABLE "hotel_clients" ADD CONSTRAINT "hotel_clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_reservations" ADD CONSTRAINT "hotel_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
