-- CreateTable
CREATE TABLE "motor_channel_sync_states" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "beds24_property_id" VARCHAR(40),
    "beds24_room_id_map" JSONB,
    "refresh_token_encrypted" TEXT,
    "webhook_secret" VARCHAR(120),
    "last_push_at" TIMESTAMP(3),
    "last_webhook_at" TIMESTAMP(3),
    "last_reconcile_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'OK',
    "reconcile_2x" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_channel_sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_channel_push_queue" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "room_type_id" VARCHAR(25) NOT NULL,
    "range_inicio" DATE NOT NULL,
    "range_fim" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "not_before" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_channel_push_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "motor_channel_sync_states_tenant_id_key" ON "motor_channel_sync_states"("tenant_id");

-- CreateIndex
CREATE INDEX "motor_channel_push_queue_status_not_before_idx" ON "motor_channel_push_queue"("status", "not_before");

-- CreateIndex
CREATE INDEX "motor_channel_push_queue_tenant_id_room_type_id_status_idx" ON "motor_channel_push_queue"("tenant_id", "room_type_id", "status");

-- AddForeignKey
ALTER TABLE "motor_channel_sync_states" ADD CONSTRAINT "motor_channel_sync_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_channel_push_queue" ADD CONSTRAINT "motor_channel_push_queue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

