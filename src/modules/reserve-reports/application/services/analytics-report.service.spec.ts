import { ConflictException, NotFoundException } from '@nestjs/common';
import { AnalyticsReport } from '../../domain/entities/analytics-report.entity';
import { IAnalyticsReportRepository } from '../../domain/interfaces';
import { AnalyticsReportService } from './analytics-report.service';

/**
 * Repositorio em memoria que reproduz as duas regras do banco: o filtro por
 * tenant nas operacoes de admin e a unicidade global do telefone.
 */
class InMemoryAnalyticsReportRepository implements IAnalyticsReportRepository {
  constructor(private readonly rows: AnalyticsReport[] = []) {}

  async create(tenantId: string, data: AnalyticsReport): Promise<AnalyticsReport> {
    const row = new AnalyticsReport({
      ...data,
      id: data.id ?? `rep_${this.rows.length + 1}`,
      tenantId,
    });
    this.rows.push(row);
    return row;
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<AnalyticsReport>,
  ): Promise<AnalyticsReport> {
    const row = this.rows.find((r) => r.id === id && r.tenantId === tenantId);
    if (!row) throw new Error('P2025: registro fora do tenant');
    Object.assign(row, {
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.label !== undefined && { label: data.label }),
    });
    return row;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const index = this.rows.findIndex((r) => r.id === id && r.tenantId === tenantId);
    if (index < 0) throw new Error('P2025: registro fora do tenant');
    this.rows.splice(index, 1);
  }

  async findById(tenantId: string, id: string): Promise<AnalyticsReport | null> {
    return this.rows.find((r) => r.id === id && r.tenantId === tenantId) ?? null;
  }

  async findByPhoneGlobal(phone: string): Promise<AnalyticsReport | null> {
    return this.rows.find((r) => r.phone === phone) ?? null;
  }

  async findAll({ tenantId, page, limit }: { tenantId: string; page: number; limit: number }) {
    const scoped = this.rows.filter((r) => r.tenantId === tenantId);
    return { data: scoped.slice((page - 1) * limit, page * limit), total: scoped.length };
  }
}

const TENANT_A = 'tenant_aaa';
const TENANT_B = 'tenant_bbb';

function buildService() {
  const repository = new InMemoryAnalyticsReportRepository([
    new AnalyticsReport({ id: 'rep_a', tenantId: TENANT_A, phone: '5511111111', url: 'https://a' }),
    new AnalyticsReport({ id: 'rep_b', tenantId: TENANT_B, phone: '5522222222', url: 'https://b' }),
    // Legado da epoca em que a tabela era global: sem dono.
    new AnalyticsReport({ id: 'rep_legacy', phone: '5533333333', url: 'https://legado' }),
  ]);
  return { repository, service: new AnalyticsReportService(repository) };
}

describe('AnalyticsReportService: isolamento por tenant', () => {
  it('findAll devolve so os vinculos do proprio tenant', async () => {
    const { service } = buildService();

    const result = await service.findAll(TENANT_A, 1, 20);

    expect(result.total).toBe(1);
    expect(result.data.map((r) => r.id)).toEqual(['rep_a']);
  });

  it('findAll nao devolve o legado sem tenant_id', async () => {
    const { service } = buildService();

    for (const tenantId of [TENANT_A, TENANT_B]) {
      const result = await service.findAll(tenantId, 1, 20);
      expect(result.data.map((r) => r.id)).not.toContain('rep_legacy');
    }
  });

  it('update de vinculo de outro tenant responde 404, nao escreve', async () => {
    const { repository, service } = buildService();

    await expect(service.update(TENANT_A, 'rep_b', { url: 'https://sequestrado' })).rejects.toThrow(
      NotFoundException,
    );
    expect((await repository.findById(TENANT_B, 'rep_b'))?.url).toBe('https://b');
  });

  it('delete de vinculo de outro tenant responde 404, nao apaga', async () => {
    const { repository, service } = buildService();

    await expect(service.delete(TENANT_A, 'rep_b')).rejects.toThrow(NotFoundException);
    expect(await repository.findById(TENANT_B, 'rep_b')).not.toBeNull();
  });

  it('create carimba o tenant de quem chamou', async () => {
    const { service } = buildService();

    const created = await service.create(TENANT_A, { phone: '5599999999', url: 'https://novo' } as any);

    expect(created.tenantId).toBe(TENANT_A);
  });

  it('create rejeita telefone ja usado por outro tenant (unicidade global)', async () => {
    const { service } = buildService();

    // O telefone e UNIQUE no banco inteiro por causa do lookup publico: sem esta
    // checagem o insert estouraria como erro de constraint em vez de 409.
    await expect(
      service.create(TENANT_A, { phone: '5522222222', url: 'https://colide' } as any),
    ).rejects.toThrow(ConflictException);
  });
});

describe('AnalyticsReportService: lookup publico', () => {
  it('resolve por telefone sem tenant, inclusive o legado sem dono', async () => {
    const { service } = buildService();

    await expect(service.lookupByPhone('5533333333')).resolves.toEqual({
      url: 'https://legado',
      label: undefined,
    });
    await expect(service.lookupByPhone('5522222222')).resolves.toMatchObject({ url: 'https://b' });
  });

  it('telefone sem vinculo responde 404', async () => {
    const { service } = buildService();

    await expect(service.lookupByPhone('5500000000')).rejects.toThrow(NotFoundException);
  });
});
