import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatsService } from './stats.service';
import { IMetricProvider } from '../../domain/interfaces/metric-provider.interface';
import { IExternalMetricProvider } from '../../domain/interfaces/external-metric-provider.interface';
import { IStatsIntegrationRepository } from '../../domain/interfaces/stats-integration.repository.interface';
import { ITenantRepository } from '../../../zarp-auth/domain/interfaces';

describe('StatsService', () => {
  let service: StatsService;

  const tenantProvider: jest.Mocked<IMetricProvider> = {
    moduleKey: 'cms',
    label: 'CMS',
    scope: 'both',
    getMetrics: jest.fn(),
    getTimeSeries: jest.fn(),
  };

  const globalProvider: jest.Mocked<IMetricProvider> = {
    moduleKey: 'users',
    label: 'Users',
    scope: 'global',
    getMetrics: jest.fn(),
    getTimeSeries: jest.fn(),
  };

  const externalProvider: jest.Mocked<IExternalMetricProvider> = {
    integrationKey: 'google_search_console',
    label: 'Google Search Console',
    description: 'GSC metrics',
    configSchema: {},
    validateConfig: jest.fn().mockReturnValue(true),
    getMetrics: jest.fn(),
  };

  const integrationRepository: jest.Mocked<IStatsIntegrationRepository> = {
    findByTenant: jest.fn(),
    findByTenantAndKey: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const tenantRepository: jest.Mocked<ITenantRepository> = {
    create: jest.fn(),
    selectById: jest.fn(),
    selectBySlug: jest.fn(),
    selectAll: jest.fn(),
    selectAllPaginated: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
    delete: jest.fn(),
    scheduleDeletion: jest.fn(),
    restoreDeletion: jest.fn(),
    findDueForDeletion: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    tenantProvider.getMetrics.mockResolvedValue({
      moduleKey: 'cms',
      label: 'CMS',
      metrics: [{ key: 'cms.blogs', label: 'Blogs', value: 3 }],
      fetchedAt: new Date('2026-03-08T10:00:00.000Z'),
    });
    globalProvider.getMetrics.mockResolvedValue({
      moduleKey: 'users',
      label: 'Users',
      metrics: [{ key: 'users.total', label: 'Users', value: 10 }],
      fetchedAt: new Date('2026-03-08T10:00:00.000Z'),
    });
    externalProvider.getMetrics.mockResolvedValue({
      moduleKey: 'google_search_console',
      label: 'Google Search Console',
      metrics: [{ key: 'gsc.clicks', label: 'Clicks', value: 100 }],
      fetchedAt: new Date('2026-03-08T10:00:00.000Z'),
    });
    integrationRepository.findByTenant.mockResolvedValue([
      {
        id: 'integration-1',
        tenant_id: 'ctenant123456789012345678',
        key: 'google_search_console',
        label: 'Google Search Console',
        config: { site_url: 'https://example.com' },
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
    tenantRepository.selectById.mockResolvedValue({
      id: 'ctenant123456789012345678',
      active: true,
    });

    service = new StatsService(
      [tenantProvider, globalProvider],
      [externalProvider],
      integrationRepository,
      tenantRepository,
    );
  });

  it('should exclude global-only providers from tenant dashboards', async () => {
    const result = await service.getDashboard('ctenant123456789012345678');

    expect(tenantRepository.selectById).toHaveBeenCalledWith('ctenant123456789012345678');
    expect(tenantProvider.getMetrics).toHaveBeenCalledWith('ctenant123456789012345678', undefined);
    expect(globalProvider.getMetrics).not.toHaveBeenCalled();
    expect(externalProvider.getMetrics).toHaveBeenCalled();
    expect(result.groups.map(group => group.moduleKey)).toEqual(['cms', 'google_search_console']);
  });

  it('should aggregate all internal providers on the global dashboard and skip external providers', async () => {
    const result = await service.getGlobalDashboard();

    expect(tenantProvider.getMetrics).toHaveBeenCalledWith(undefined, undefined);
    expect(globalProvider.getMetrics).toHaveBeenCalledWith(undefined, undefined);
    expect(externalProvider.getMetrics).not.toHaveBeenCalled();
    expect(result.groups.map(group => group.moduleKey)).toEqual(['cms', 'users']);
  });

  it('should not expose global-only providers through tenant module lookup', async () => {
    const result = await service.getModuleMetrics(
      'users',
      'ctenant123456789012345678',
    );

    expect(result).toBeNull();
  });

  it('should throw NotFoundException when tenant does not exist', async () => {
    tenantRepository.selectById.mockResolvedValueOnce(null);

    await expect(service.getDashboard('cmissingtenant123456789012')).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when tenant is inactive', async () => {
    tenantRepository.selectById.mockResolvedValueOnce({
      id: 'ctenant123456789012345678',
      active: false,
    });

    await expect(service.getDashboard('ctenant123456789012345678')).rejects.toThrow(ForbiddenException);
  });
});