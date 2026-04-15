-- CreateEnum
CREATE TYPE "EAppointmentStatus" AS ENUM ('confirmed', 'cancelled', 'completed');

-- CreateTable
CREATE TABLE "AppointmentScheduleConfig" (
    "id" UUID NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "working_days" INTEGER[],
    "work_start_time" VARCHAR(5) NOT NULL,
    "work_end_time" VARCHAR(5) NOT NULL,
    "slot_interval_minutes" SMALLINT NOT NULL,
    "capacity_per_slot" SMALLINT NOT NULL,
    "lunch_start_time" VARCHAR(5),
    "lunch_end_time" VARCHAR(5),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentBlockedPeriod" (
    "id" UUID NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "schedule_config_id" UUID NOT NULL,
    "start_datetime" TIMESTAMP(3) NOT NULL,
    "end_datetime" TIMESTAMP(3) NOT NULL,
    "label" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentBlockedPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "lead_id" UUID NOT NULL,
    "schedule_config_id" UUID NOT NULL,
    "appointment_date" DATE NOT NULL,
    "slot_start_time" VARCHAR(5) NOT NULL,
    "slot_end_time" VARCHAR(5) NOT NULL,
    "status" "EAppointmentStatus" NOT NULL DEFAULT 'confirmed',
    "selected_product" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentScheduleConfig_tenant_id_idx" ON "AppointmentScheduleConfig"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentScheduleConfig_tenant_id_key" ON "AppointmentScheduleConfig"("tenant_id");

-- CreateIndex
CREATE INDEX "AppointmentBlockedPeriod_tenant_id_idx" ON "AppointmentBlockedPeriod"("tenant_id");

-- CreateIndex
CREATE INDEX "AppointmentBlockedPeriod_tenant_id_start_datetime_end_datet_idx" ON "AppointmentBlockedPeriod"("tenant_id", "start_datetime", "end_datetime");

-- CreateIndex
CREATE INDEX "Appointment_tenant_id_idx" ON "Appointment"("tenant_id");

-- CreateIndex
CREATE INDEX "Appointment_tenant_id_appointment_date_slot_start_time_idx" ON "Appointment"("tenant_id", "appointment_date", "slot_start_time");

-- AddForeignKey
ALTER TABLE "AppointmentScheduleConfig" ADD CONSTRAINT "AppointmentScheduleConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentBlockedPeriod" ADD CONSTRAINT "AppointmentBlockedPeriod_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentBlockedPeriod" ADD CONSTRAINT "AppointmentBlockedPeriod_schedule_config_id_fkey" FOREIGN KEY ("schedule_config_id") REFERENCES "AppointmentScheduleConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_schedule_config_id_fkey" FOREIGN KEY ("schedule_config_id") REFERENCES "AppointmentScheduleConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
