import { AnalyticsReport } from '../entities/analytics-report.entity';

export const ANALYTICS_REPORT_REPOSITORY = Symbol('ANALYTICS_REPORT_REPOSITORY');

/**
 * Todas as operacoes de admin sao escopadas por tenant: um tenant nunca le nem
 * escreve o vinculo de outro, e os registros legados (tenant_id NULL) ficam
 * fora de qualquer uma delas.
 *
 * A unica excecao e `findByPhoneGlobal`, usada pela rota publica de lookup e
 * pela checagem de unicidade do telefone — ambas globais por contrato. Ela nao
 * pode alimentar resposta de rota de admin.
 */
export interface IAnalyticsReportRepository {
  create(tenantId: string, data: AnalyticsReport): Promise<AnalyticsReport>;
  update(tenantId: string, id: string, data: Partial<AnalyticsReport>): Promise<AnalyticsReport>;
  delete(tenantId: string, id: string): Promise<void>;
  findById(tenantId: string, id: string): Promise<AnalyticsReport | null>;
  findAll(params: { tenantId: string; page: number; limit: number }): Promise<{ data: AnalyticsReport[]; total: number }>;

  /** GLOBAL, sem filtro de tenant. Ver nota acima antes de usar. */
  findByPhoneGlobal(phone: string): Promise<AnalyticsReport | null>;
}
