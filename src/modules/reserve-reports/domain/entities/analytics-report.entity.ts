export class AnalyticsReport {
  id?: string;
  /**
   * Dono do vinculo. Opcional apenas para acomodar os registros legados
   * gravados antes de a tabela ser escopada por tenant (migration
   * 20260808000001) — toda escrita nova preenche.
   */
  tenantId?: string;
  phone: string;
  url: string;
  label?: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: AnalyticsReport) {
    this.id = data.id;
    this.tenantId = data.tenantId;
    this.phone = data.phone;
    this.url = data.url;
    this.label = data.label;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
