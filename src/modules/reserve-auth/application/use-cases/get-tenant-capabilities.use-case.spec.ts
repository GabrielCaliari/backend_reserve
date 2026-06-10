import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';
import { invalidateModuleAccessCache } from '../../../../shared/auth/module-access.util';
import { GetTenantCapabilitiesUseCase } from './get-tenant-capabilities.use-case';

describe('GetTenantCapabilitiesUseCase', () => {
  const prisma = {
    tenant: { findUnique: jest.fn() },
    tenantSetting: { findUnique: jest.fn() },
    tenantTypeModulePolicy: { findUnique: jest.fn() },
  } as any;
  const adminRepository = { selectById: jest.fn() } as any;
  const adminTenantRepository = { findRoleInTenant: jest.fn() } as any;
  const permissionPolicy = { resolve: jest.fn() } as any;

  const useCase = new GetTenantCapabilitiesUseCase(prisma, adminRepository, adminTenantRepository, permissionPolicy);

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateModuleAccessCache();
    adminRepository.selectById.mockResolvedValue({ id: 'admin-1', active: true, role: EAdminRole.manager });
    adminTenantRepository.findRoleInTenant.mockResolvedValue(EAdminRole.viewer);
    permissionPolicy.resolve.mockResolvedValue(new Set(['stats.dashboard.read']));
    prisma.tenantSetting.findUnique.mockResolvedValue(null);
    prisma.tenantTypeModulePolicy.findUnique.mockResolvedValue({ enabled: false });
  });

  it('returns unrestricted modules for MASTER while preserving caller permissions', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'cma1master0001ghijklmno23p',
      active: true,
      tenant_type: 'MASTER',
    });

    const result = await useCase.execute('admin-1', 'cma1master0001ghijklmno23p');

    expect(result.tenantType).toBe('MASTER');
    expect(result.isMasterTenant).toBe(true);
    expect(Object.keys(result.modules)).toEqual([...GATEABLE_MODULES]);
    expect(Object.values(result.modules)).toEqual(expect.arrayContaining([{ enabled: true, source: 'master' }]));
    expect(result.permissions).toEqual(['stats.dashboard.read']);
    expect(permissionPolicy.resolve).toHaveBeenCalledWith('admin-1', 'cma1master0001ghijklmno23p', EAdminRole.viewer);
  });

  it('returns type-policy modules for an EDUCATIONAL tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'cma1edu00001ghijklmno23p',
      active: true,
      tenant_type: 'EDUCATIONAL',
    });
    prisma.tenantTypeModulePolicy.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve({ enabled: where.tenant_type_module_key.module_key === 'client-portal' }),
    );

    const result = await useCase.execute('admin-1', 'cma1edu00001ghijklmno23p');

    expect(result.modules['client-portal']).toEqual({ enabled: true, source: 'tenantTypePolicy' });
    expect(result.modules.cms).toEqual({ enabled: false, source: 'tenantTypePolicy' });
  });

  it('rejects missing tenant membership for a regular admin', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', active: true, tenant_type: 'COMMON' });
    adminTenantRepository.findRoleInTenant.mockResolvedValue(null);

    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects missing tenants', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    await expect(useCase.execute('admin-1', 'missing')).rejects.toThrow(NotFoundException);
  });
});
