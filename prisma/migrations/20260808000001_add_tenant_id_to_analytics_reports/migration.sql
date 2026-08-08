-- Escopa `analytics_reports` por tenant.
--
-- A coluna entra NULLABLE e SEM backfill de proposito. A tabela nasceu global
-- (telefone -> URL compartilhado entre todos os clientes) e nao existe vinculo
-- confiavel que permita inferir o dono dos registros ja gravados. Atribui-los a
-- um tenant errado seria irreversivel e entregaria dado de um cliente a outro —
-- exatamente o problema que esta migration existe para fechar.
--
-- Efeito pratico: os registros legados ficam sem dono e somem das rotas de
-- admin, que passam a filtrar por tenant_id. Eles continuam resolvendo na rota
-- publica `GET /api/reports/lookup?phone=`, que e global por contrato. Nenhuma
-- linha e movida, reatribuida ou apagada.
--
-- Quando o destino do legado for decidido (atribuir a um tenant, arquivar ou
-- apagar), o backfill entra numa migration propria e a coluna pode virar
-- NOT NULL.
--
-- `phone` permanece UNIQUE global — nao vira UNIQUE(tenant_id, phone) — porque
-- o lookup publico nao tem tenant na request e precisa resolver de forma
-- deterministica.

-- AlterTable
ALTER TABLE "analytics_reports" ADD COLUMN     "tenant_id" VARCHAR(25);

-- CreateIndex
CREATE INDEX "analytics_reports_tenant_id_idx" ON "analytics_reports"("tenant_id");

-- AddForeignKey
ALTER TABLE "analytics_reports" ADD CONSTRAINT "analytics_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
