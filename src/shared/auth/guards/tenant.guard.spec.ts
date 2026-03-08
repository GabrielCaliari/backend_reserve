import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TenantGuard } from './tenant.guard';
import { ADMIN_REPOSITORY, TENANT_REPOSITORY } from '../../../modules/zarp-auth/domain/interfaces';
import { ADMIN_TENANT_REPOSITORY } from '../../../modules/zarp-auth/domain/interfaces/admin-tenant.repository.interface';
import { EAdminRole } from '../../../modules/zarp-auth/domain/enums/admin-role.enum';
import { InMemoryAdminTenantRepository } from '../../testing/in-memory-repos/in-memory-admin-tenant.repository';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let adminTenantRepo: InMemoryAdminTenantRepository;

  const mockAdminRepository = {
    selectById: jest.fn(),
  };

  const mockTenantRepository = {
    selectById: jest.fn(),
  };

  function createContext(overrides?: {
    admin_id?: string;
    params?: Record<string, any>;
    headers?: Record<string, any>;
    body?: Record<string, any>;
  }): any {
    const request: any = {
      admin_id: overrides?.admin_id ?? 'cadmin123456789012345678',
      params: overrides?.params ?? {},
      headers: overrides?.headers ?? {},
      body: overrides?.body ?? {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };
  }

  beforeEach(async () => {
    adminTenantRepo = new InMemoryAdminTenantRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        { provide: ADMIN_REPOSITORY, useValue: mockAdminRepository },
        { provide: TENANT_REPOSITORY, useValue: mockTenantRepository },
        { provide: ADMIN_TENANT_REPOSITORY, useValue: adminTenantRepo },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);

    jest.clearAllMocks();
    mockTenantRepository.selectById.mockResolvedValue({
      id: 'ctenant123456789012345678',
      active: true,
    });
  });

  afterEach(() => {
    adminTenantRepo.clear();
  });

  it('should allow assigned admins to access an active tenant', async () => {
    mockAdminRepository.selectById.mockResolvedValue({
      id: 'cadmin123456789012345678',
      active: true,
      role: EAdminRole.manager,
    });
    adminTenantRepo.seed({
      admin_id: 'cadmin123456789012345678',
      tenant_id: 'ctenant123456789012345678',
      role: EAdminRole.manager,
    });

    const context = createContext({
      headers: { 'x-tenant-id': 'ctenant123456789012345678' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow super admin to bypass tenant assignment for active tenants', async () => {
    mockAdminRepository.selectById.mockResolvedValue({
      id: 'cadmin123456789012345678',
      active: true,
      role: EAdminRole.super_admin,
    });

    const context = createContext({
      params: { tenantId: 'ctenant123456789012345678' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should reject requests without tenant information', async () => {
    mockAdminRepository.selectById.mockResolvedValue({
      id: 'cadmin123456789012345678',
      active: true,
      role: EAdminRole.manager,
    });

    await expect(guard.canActivate(createContext())).rejects.toThrow(BadRequestException);
  });

  it('should reject nonexistent tenants', async () => {
    mockAdminRepository.selectById.mockResolvedValue({
      id: 'cadmin123456789012345678',
      active: true,
      role: EAdminRole.manager,
    });
    mockTenantRepository.selectById.mockResolvedValue(null);

    const context = createContext({
      headers: { 'x-tenant-id': 'ctenant123456789012345678' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should reject inactive tenants', async () => {
    mockAdminRepository.selectById.mockResolvedValue({
      id: 'cadmin123456789012345678',
      active: true,
      role: EAdminRole.manager,
    });
    mockTenantRepository.selectById.mockResolvedValue({
      id: 'ctenant123456789012345678',
      active: false,
    });

    const context = createContext({
      headers: { 'x-tenant-id': 'ctenant123456789012345678' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should reject admins without access to the tenant', async () => {
    mockAdminRepository.selectById.mockResolvedValue({
      id: 'cadmin123456789012345678',
      active: true,
      role: EAdminRole.viewer,
    });

    const context = createContext({
      headers: { 'x-tenant-id': 'ctenant123456789012345678' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});