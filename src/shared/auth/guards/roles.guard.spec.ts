import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { EAdminRole } from '../../../modules/zarp-auth/domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY } from '../../../modules/zarp-auth/domain/interfaces';
import { ADMIN_TENANT_REPOSITORY } from '../../../modules/zarp-auth/domain/interfaces/admin-tenant.repository.interface';
import { InMemoryAdminTenantRepository } from '../../testing/in-memory-repos/in-memory-admin-tenant.repository';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let adminTenantRepo: InMemoryAdminTenantRepository;

  const mockAdminRepository = {
    selectById: jest.fn(),
  };

  function createMockContext(overrides: {
    admin_id?: number;
    tenant_id?: number;
    handlerRoles?: EAdminRole[];
  }): ExecutionContext {
    const request: any = {
      admin_id: overrides.admin_id ?? 1,
      tenant_id: overrides.tenant_id,
    };

    const handlerRoles = overrides.handlerRoles;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    adminTenantRepo = new InMemoryAdminTenantRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        Reflector,
        { provide: ADMIN_REPOSITORY, useValue: mockAdminRepository },
        { provide: ADMIN_TENANT_REPOSITORY, useValue: adminTenantRepo },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  afterEach(() => {
    adminTenantRepo.clear();
  });

  it('should allow access when no roles are required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext({});

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when admin_id is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.editor]);
    const ctx = createMockContext({ admin_id: undefined });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when admin is inactive', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.editor]);
    mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: false, role: EAdminRole.editor });
    const ctx = createMockContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should bypass all checks for super_admin', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.owner]);
    mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: true, role: EAdminRole.super_admin });
    const ctx = createMockContext({});

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  describe('per-tenant role resolution', () => {
    it('should use AdminTenant.role when tenant_id is present', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.editor]);
      mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: true, role: EAdminRole.company_admin });

      // Admin has editor role in tenant 10
      adminTenantRepo.seed({ admin_id: 1, tenant_id: 10, role: EAdminRole.editor });

      const ctx = createMockContext({ tenant_id: 10 });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should deny access when tenant role is lower than required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.manager]);
      mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: true, role: EAdminRole.company_admin });

      // Admin has viewer role in tenant 10 (lower than manager)
      adminTenantRepo.seed({ admin_id: 1, tenant_id: 10, role: EAdminRole.viewer });

      const ctx = createMockContext({ tenant_id: 10 });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when admin has no role in tenant', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.editor]);
      mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: true, role: EAdminRole.company_admin });

      // No tenant assignment
      const ctx = createMockContext({ tenant_id: 99 });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should fall back to Admin.role when no tenant_id is present', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.manager]);
      mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: true, role: EAdminRole.manager });

      const ctx = createMockContext({ tenant_id: undefined });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should support hierarchy: owner can access editor endpoints', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.editor]);
      mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: true, role: EAdminRole.company_admin });

      adminTenantRepo.seed({ admin_id: 1, tenant_id: 10, role: EAdminRole.owner });

      const ctx = createMockContext({ tenant_id: 10 });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should handle deprecated company_admin as manager in required roles', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.company_admin]);
      mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: true, role: EAdminRole.company_admin });

      adminTenantRepo.seed({ admin_id: 1, tenant_id: 10, role: EAdminRole.manager });

      const ctx = createMockContext({ tenant_id: 10 });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('super_admin bypasses per-tenant checks even with tenant_id', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([EAdminRole.owner]);
      mockAdminRepository.selectById.mockResolvedValue({ id: 1, active: true, role: EAdminRole.super_admin });

      // No tenant assignment, but super_admin should still pass
      const ctx = createMockContext({ tenant_id: 10 });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });
});
