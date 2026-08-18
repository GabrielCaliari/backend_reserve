-- CreateEnum
CREATE TYPE "EMotorHoldStatus" AS ENUM ('ATIVO', 'CONVERTIDO', 'EXPIRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EMotorReservationStatus" AS ENUM ('HOLD', 'CONFIRMADA', 'CHECKIN_FEITO', 'CONCLUIDA', 'CANCELADA', 'NOSHOW');

-- CreateEnum
CREATE TYPE "EMotorReservationOrigem" AS ENUM ('BOT_WHATSAPP', 'OTA_BOOKING', 'OTA_AIRBNB', 'OTA_DECOLAR', 'SITE_HSYSTEM', 'MANUAL');

-- CreateEnum
CREATE TYPE "EMotorFormaPagamento" AS ENUM ('PIX_50', 'CARTAO_100', 'OTA');

-- CreateEnum
CREATE TYPE "EMotorHoldFormaPagamento" AS ENUM ('PIX_LINK', 'CARTAO', 'PIX_MANUAL');

-- CreateEnum
CREATE TYPE "EMotorBlockMotivo" AS ENUM ('MANUTENCAO', 'USO_PROPRIO', 'MENSALISTA', 'OUTRO');

-- CreateEnum
CREATE TYPE "EMotorReservationEventTipo" AS ENUM ('CRIADA', 'PAGAMENTO_PARCIAL', 'CONFIRMADA', 'REMARCADA', 'CANCELADA', 'CHECKIN', 'CHECKOUT', 'NOSHOW');

-- AlterTable
ALTER TABLE "bot_integration_configs" ADD COLUMN "n8n_motor_webhook_url" VARCHAR(500);

-- CreateTable
CREATE TABLE "motor_room_types" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao_curta" VARCHAR(500),
    "capacidade_base" INTEGER NOT NULL,
    "capacidade_max" INTEGER NOT NULL,
    "valor_pessoa_adicional" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "aceita_pets" BOOLEAN NOT NULL DEFAULT false,
    "taxa_pet_dia" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_units" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "room_type_id" VARCHAR(25) NOT NULL,
    "identificador" VARCHAR(80) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_cancellation_policies" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "dias_antecedencia_remarcacao" INTEGER NOT NULL DEFAULT 7,
    "reembolso_apos_prazo" BOOLEAN NOT NULL DEFAULT false,
    "taxa_noshow_percent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_cancellation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_rate_plans" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "room_type_id" VARCHAR(25) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "cancellation_policy_id" VARCHAR(25),
    "derivado_de" VARCHAR(25),
    "percentual_ajuste" DECIMAL(5,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_seasons" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_price_rules" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "room_type_id" VARCHAR(25) NOT NULL,
    "rate_plan_id" VARCHAR(25),
    "season_id" VARCHAR(25),
    "dow_mask" INTEGER NOT NULL DEFAULT 127,
    "preco_noite" DECIMAL(12,2) NOT NULL,
    "min_stay" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_daily_inventory" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "room_type_id" VARCHAR(25) NOT NULL,
    "data" DATE NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "min_stay" INTEGER NOT NULL DEFAULT 1,
    "closed_arrival" BOOLEAN NOT NULL DEFAULT false,
    "closed_departure" BOOLEAN NOT NULL DEFAULT false,
    "stop_sell" BOOLEAN NOT NULL DEFAULT false,
    "override" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_daily_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_reservations" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "room_type_id" VARCHAR(25) NOT NULL,
    "unit_id" VARCHAR(25) NOT NULL,
    "checkin" DATE NOT NULL,
    "checkout" DATE NOT NULL,
    "status" "EMotorReservationStatus" NOT NULL DEFAULT 'CONFIRMADA',
    "origem" "EMotorReservationOrigem" NOT NULL,
    "external_id" VARCHAR(120),
    "hospede_nome" VARCHAR(200) NOT NULL,
    "hospede_telefone" VARCHAR(40),
    "hospede_email" VARCHAR(200),
    "hospede_doc" VARCHAR(40),
    "adultos" INTEGER NOT NULL DEFAULT 2,
    "criancas" INTEGER NOT NULL DEFAULT 0,
    "pets" INTEGER NOT NULL DEFAULT 0,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "valor_pago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo_checkin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "forma_pagamento" "EMotorFormaPagamento",
    "asaas_payment_id" VARCHAR(120),
    "observacoes" TEXT,
    "atribuicao" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_reservation_events" (
    "id" VARCHAR(25) NOT NULL,
    "reservation_id" VARCHAR(25) NOT NULL,
    "tipo" "EMotorReservationEventTipo" NOT NULL,
    "payload" JSONB,
    "autor" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motor_reservation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_holds" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "room_type_id" VARCHAR(25) NOT NULL,
    "unit_id" VARCHAR(25) NOT NULL,
    "checkin" DATE NOT NULL,
    "checkout" DATE NOT NULL,
    "adultos" INTEGER NOT NULL DEFAULT 2,
    "criancas" INTEGER NOT NULL DEFAULT 0,
    "pets" INTEGER NOT NULL DEFAULT 0,
    "contato_whatsapp" VARCHAR(40) NOT NULL,
    "forma_pagamento" "EMotorHoldFormaPagamento" NOT NULL,
    "cliente_marina" BOOLEAN NOT NULL DEFAULT false,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "valor_antecipado" DECIMAL(12,2) NOT NULL,
    "asaas_payment_id" VARCHAR(120),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "EMotorHoldStatus" NOT NULL DEFAULT 'ATIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_blocks" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "unit_id" VARCHAR(25) NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "motivo" "EMotorBlockMotivo" NOT NULL,
    "nota" VARCHAR(500),
    "criado_por" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motor_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_payment_exceptions" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "hold_id" VARCHAR(25) NOT NULL,
    "asaas_payment_id" VARCHAR(120),
    "valor_pago" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "resolucao" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motor_payment_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "motor_room_types_tenant_id_ativo_idx" ON "motor_room_types"("tenant_id", "ativo");

-- CreateIndex
CREATE INDEX "motor_units_tenant_id_room_type_id_idx" ON "motor_units"("tenant_id", "room_type_id");

-- CreateIndex
CREATE INDEX "motor_cancellation_policies_tenant_id_idx" ON "motor_cancellation_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "motor_rate_plans_tenant_id_room_type_id_idx" ON "motor_rate_plans"("tenant_id", "room_type_id");

-- CreateIndex
CREATE INDEX "motor_seasons_tenant_id_data_inicio_data_fim_idx" ON "motor_seasons"("tenant_id", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "motor_price_rules_tenant_id_room_type_id_idx" ON "motor_price_rules"("tenant_id", "room_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "motor_daily_inventory_tenant_id_room_type_id_data_key" ON "motor_daily_inventory"("tenant_id", "room_type_id", "data");

-- CreateIndex
CREATE INDEX "motor_reservations_tenant_id_status_checkin_idx" ON "motor_reservations"("tenant_id", "status", "checkin");

-- CreateIndex
CREATE INDEX "motor_reservations_tenant_id_asaas_payment_id_idx" ON "motor_reservations"("tenant_id", "asaas_payment_id");

-- CreateIndex
CREATE INDEX "motor_reservation_events_reservation_id_created_at_idx" ON "motor_reservation_events"("reservation_id", "created_at");

-- CreateIndex
CREATE INDEX "motor_holds_tenant_id_status_expires_at_idx" ON "motor_holds"("tenant_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "motor_blocks_tenant_id_unit_id_data_inicio_idx" ON "motor_blocks"("tenant_id", "unit_id", "data_inicio");

-- CreateIndex
CREATE INDEX "motor_payment_exceptions_tenant_id_status_idx" ON "motor_payment_exceptions"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "motor_room_types" ADD CONSTRAINT "motor_room_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_units" ADD CONSTRAINT "motor_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_units" ADD CONSTRAINT "motor_units_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "motor_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_cancellation_policies" ADD CONSTRAINT "motor_cancellation_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_rate_plans" ADD CONSTRAINT "motor_rate_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_rate_plans" ADD CONSTRAINT "motor_rate_plans_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "motor_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_rate_plans" ADD CONSTRAINT "motor_rate_plans_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "motor_cancellation_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_seasons" ADD CONSTRAINT "motor_seasons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_price_rules" ADD CONSTRAINT "motor_price_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_price_rules" ADD CONSTRAINT "motor_price_rules_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "motor_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_price_rules" ADD CONSTRAINT "motor_price_rules_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "motor_rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_price_rules" ADD CONSTRAINT "motor_price_rules_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "motor_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_daily_inventory" ADD CONSTRAINT "motor_daily_inventory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_daily_inventory" ADD CONSTRAINT "motor_daily_inventory_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "motor_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_reservations" ADD CONSTRAINT "motor_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_reservations" ADD CONSTRAINT "motor_reservations_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "motor_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_reservations" ADD CONSTRAINT "motor_reservations_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "motor_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_reservation_events" ADD CONSTRAINT "motor_reservation_events_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "motor_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_holds" ADD CONSTRAINT "motor_holds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_holds" ADD CONSTRAINT "motor_holds_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "motor_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_holds" ADD CONSTRAINT "motor_holds_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "motor_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_blocks" ADD CONSTRAINT "motor_blocks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_blocks" ADD CONSTRAINT "motor_blocks_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "motor_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_payment_exceptions" ADD CONSTRAINT "motor_payment_exceptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Editado a mao (nao gerado pelo Prisma) ───────────────────────────────────
-- Anti-overbooking no banco (spec §1.2): duas pessoas fechando a ultima
-- unidade no mesmo segundo sao resolvidas pelo Postgres, nunca pela aplicacao.
-- btree_gist habilita igualdade de unit_id (varchar) dentro do indice GiST.
-- Primeira extensao usada neste repo — decisao registrada no plano do motor.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "motor_holds" ADD CONSTRAINT "motor_holds_no_overlap"
  EXCLUDE USING gist (
    unit_id WITH =,
    daterange(checkin, checkout, '[)') WITH &&
  ) WHERE (status = 'ATIVO');

ALTER TABLE "motor_reservations" ADD CONSTRAINT "motor_reservations_no_overlap"
  EXCLUDE USING gist (
    unit_id WITH =,
    daterange(checkin, checkout, '[)') WITH &&
  ) WHERE (status IN ('HOLD', 'CONFIRMADA', 'CHECKIN_FEITO'));
