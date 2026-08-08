import { AnalyticsReport } from '../../domain/entities/analytics-report.entity';
import { PrismaAnalyticsReportRepository } from './prisma-analytics-report.repository';

/**
 * O isolamento entre tenants mora no `where` que vai para o Prisma. Estes testes
 * olham exatamente isso: se alguem remover o `tenant_id` de uma query, o teste
 * quebra antes de a query vazar dado de outro cliente.
 */
describe('PrismaAnalyticsReportRepository: escopo de tenant nas queries', () => {
  const TENANT = 'tenant_aaa';
  let analyticsReport: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  let repository: PrismaAnalyticsReportRepository;

  const row = {
    id: 'rep_1',
    tenant_id: TENANT,
    phone: '5511111111',
    url: 'https://a',
    label: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    analyticsReport = {
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      delete: jest.fn().mockResolvedValue(row),
      findFirst: jest.fn().mockResolvedValue(row),
      findUnique: jest.fn().mockResolvedValue(row),
      findMany: jest.fn().mockResolvedValue([row]),
      count: jest.fn().mockResolvedValue(1),
    };
    repository = new PrismaAnalyticsReportRepository({ analyticsReport } as any);
  });

  it('create grava o tenant_id', async () => {
    await repository.create(TENANT, new AnalyticsReport({ phone: '5511111111', url: 'https://a' }));

    expect(analyticsReport.create.mock.calls[0][0].data).toMatchObject({ tenant_id: TENANT });
  });

  it('findById filtra por tenant_id', async () => {
    await repository.findById(TENANT, 'rep_1');

    expect(analyticsReport.findFirst.mock.calls[0][0].where).toEqual({
      id: 'rep_1',
      tenant_id: TENANT,
    });
  });

  it('findAll filtra por tenant_id na listagem e na contagem', async () => {
    await repository.findAll({ tenantId: TENANT, page: 1, limit: 20 });

    expect(analyticsReport.findMany.mock.calls[0][0].where).toEqual({ tenant_id: TENANT });
    expect(analyticsReport.count.mock.calls[0][0].where).toEqual({ tenant_id: TENANT });
  });

  it('update leva tenant_id no where, nao so o id', async () => {
    await repository.update(TENANT, 'rep_1', { url: 'https://novo' });

    expect(analyticsReport.update.mock.calls[0][0].where).toEqual({
      id: 'rep_1',
      tenant_id: TENANT,
    });
  });

  it('delete leva tenant_id no where, nao so o id', async () => {
    await repository.delete(TENANT, 'rep_1');

    expect(analyticsReport.delete.mock.calls[0][0].where).toEqual({
      id: 'rep_1',
      tenant_id: TENANT,
    });
  });

  it('findByPhoneGlobal e global de proposito — serve o lookup publico', async () => {
    await repository.findByPhoneGlobal('5511111111');

    expect(analyticsReport.findUnique.mock.calls[0][0].where).toEqual({ phone: '5511111111' });
  });

  it('toDomain expoe tenant_id nulo do legado como undefined', async () => {
    analyticsReport.findUnique.mockResolvedValue({ ...row, tenant_id: null });

    const result = await repository.findByPhoneGlobal('5511111111');

    expect(result?.tenantId).toBeUndefined();
  });
});
