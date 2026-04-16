import { Inject, Injectable } from '@nestjs/common';
import AuthAdminDTO, { IValidateAdminToken } from '../dtos/auth-admin.dto';
import { CreateAdminDTO } from '../dtos/admin-management.dto';
import {
    IAdminRepository,
    IAdminCredentialRepository,
    IAdminSessionTokenRepository,
    ADMIN_REPOSITORY,
    ADMIN_CREDENTIAL_REPOSITORY,
    ADMIN_SESSION_TOKEN_REPOSITORY,
} from '../../domain/interfaces';
import {
    ADMIN_TENANT_REPOSITORY,
    IAdminTenantRepository,
} from '../../domain/interfaces/admin-tenant.repository.interface';
import {
    TENANT_REPOSITORY,
    ITenantRepository,
} from '../../domain/interfaces/tenant.repository.interface';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { errorTypes } from '../../../../shared/constants/error-types';
import { errorResponse, successResponse } from '../../../../shared/helpers';

function normalizeAdminRole(role: EAdminRole): EAdminRole {
    return role === EAdminRole.company_admin ? EAdminRole.manager : role;
}

@Injectable()
export class AdminService {
    constructor(
        @Inject(ADMIN_REPOSITORY) private readonly adminRepository: IAdminRepository,
        @Inject(ADMIN_CREDENTIAL_REPOSITORY) private readonly adminCredentialRepository: IAdminCredentialRepository,
        @Inject(ADMIN_SESSION_TOKEN_REPOSITORY) private readonly adminSessionTokenRepository: IAdminSessionTokenRepository,
        @Inject(ADMIN_TENANT_REPOSITORY) private readonly adminTenantRepository: IAdminTenantRepository,
        @Inject(TENANT_REPOSITORY) private readonly tenantRepository: ITenantRepository,
    ) { }

    private async assertSuperAdminSafety(
        targetAdminId: string,
        options?: {
            currentAdminId?: string;
            nextRole?: EAdminRole;
            deactivate?: boolean;
            delete?: boolean;
        },
    ) {
        const targetAdmin = await this.adminRepository.selectById(targetAdminId);

        if (!targetAdmin) {
            return { ok: false as const, response: errorResponse(errorTypes._404.admin_nf, 404) };
        }

        const targetRole = normalizeAdminRole(targetAdmin.role as EAdminRole);
        if (targetRole !== EAdminRole.super_admin) {
            return { ok: true as const, admin: targetAdmin };
        }

        const removesSuperAdminAccess = Boolean(
            options?.deactivate ||
            options?.delete ||
            (options?.nextRole && options.nextRole !== EAdminRole.super_admin),
        );

        if (!removesSuperAdminAccess) {
            return { ok: true as const, admin: targetAdmin };
        }

        if (options?.currentAdminId && options.currentAdminId === targetAdminId) {
            return {
                ok: false as const,
                response: errorResponse('400:CANNOT_REMOVE_OWN_SUPER_ADMIN_ACCESS', 400),
            };
        }

        const activeSuperAdmins = await this.adminRepository.countActiveByRole(EAdminRole.super_admin);
        if (targetAdmin.active && activeSuperAdmins <= 1) {
            return {
                ok: false as const,
                response: errorResponse('400:CANNOT_REMOVE_LAST_ACTIVE_SUPER_ADMIN', 400),
            };
        }

        return { ok: true as const, admin: targetAdmin };
    }

    async authenticate(data: AuthAdminDTO) {
        try {
            const admin = await this.adminRepository.selectByEmail(data.email);

            if (!admin || !admin.id) {
                return errorResponse(errorTypes._401.admin_email_nf, 401);
            }

            if (!admin.active) {
                return errorResponse('403:ADMIN_ACCOUNT_DEACTIVATED', 403);
            }

            if (admin.email !== data.email) {
                return {
                    status: 401,
                    data: {
                        code: errorTypes._401.admin_email_nf
                    }
                }
            }

            const compareHashByAdminId = await this.adminCredentialRepository.compareHashByAdminId(data.password, admin.id);

            if (!compareHashByAdminId) {
                return errorResponse(errorTypes._401.admin_password_in, 401);
            }

            const session = await this.adminSessionTokenRepository.create({
                admin_id: admin.id,
                password: data.password,
                payload: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                }
            });

            if (!session.token) {
                return errorResponse(errorTypes._401.admin_password_in, 401);
            }

            return {
                status: 200,
                data: {
                    session_id: session.id,
                    session_token: session.token,
                    details: {
                        name: admin.name,
                        email: admin.email,
                        role: normalizeAdminRole(admin.role as EAdminRole),
                    }
                }
            }
        } catch (error) {
            console.log(error)
            return errorResponse(errorTypes._500.admin_una, 500, error);
        }
    }

    async validateToken(data: IValidateAdminToken) {
        try {
            const tokenIsValidResponse = await this.adminSessionTokenRepository.validateToken(data['session-id'], data.token)

            if (tokenIsValidResponse !== false) {
                return {
                    status: 200,
                    data: {
                        admin_id: tokenIsValidResponse.admin_id
                    }
                }
            }

            return errorResponse(errorTypes._401.admin_token_in, 401);
        } catch (error) {
            return errorResponse(errorTypes._500.unable_vadmintoken, 500, error);
        }
    }

    async me(adminId: string) {
        try {
            const admin = await this.adminRepository.selectByIdWithTenants(adminId);

            if (!admin) {
                return errorResponse(errorTypes._404.admin_nf, 404);
            }

            let tenants: any[];
            if (normalizeAdminRole(admin.role as EAdminRole) === EAdminRole.super_admin) {
                const all = await this.tenantRepository.selectAll();
                tenants = all.map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    slug: t.slug,
                    domain: t.domain,
                }));
            } else {
                tenants = admin.AdminTenant?.map((at: any) => ({
                    id: at.Tenant.id,
                    name: at.Tenant.name,
                    slug: at.Tenant.slug,
                    domain: at.Tenant.domain,
                })) ?? [];
            }

            return {
                status: 200,
                data: {
                    name: admin.name,
                    email: admin.email,
                    role: normalizeAdminRole(admin.role as EAdminRole),
                    active: admin.active,
                    tenants,
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.listing_admin_data, 500, error);
        }
    }

    async register(data: CreateAdminDTO, callerRole?: EAdminRole) {
        try {
            const roleToAssign = data.role ? normalizeAdminRole(data.role) : EAdminRole.manager;

            // Managers cannot create super_admin or owner accounts
            if (callerRole === EAdminRole.manager) {
                if (roleToAssign === EAdminRole.super_admin || roleToAssign === EAdminRole.owner) {
                    return errorResponse('403:INSUFFICIENT_PERMISSIONS_TO_ASSIGN_ROLE', 403);
                }
            }

            const existing = await this.adminRepository.selectByEmail(data.email);
            if (existing) {
                return errorResponse('400:ADMIN_EMAIL_ALREADY_EXISTS', 400);
            }

            const admin = await this.adminRepository.create({
                name: data.name,
                email: data.email,
                password: data.password,
                role: roleToAssign,
            });

            return successResponse({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: normalizeAdminRole(admin.role as EAdminRole),
            }, 201);
        } catch (error) {
            return errorResponse('500:ADMIN_NOT_CREATED', 500, error);
        }
    }

    async listAll(page = 1, limit = 20, callerRole?: EAdminRole, tenantId?: string) {
        try {
            // Managers can only see admins with roles below super_admin/owner
            const excludeRoles = callerRole === EAdminRole.manager
                ? [EAdminRole.super_admin, EAdminRole.owner]
                : undefined;

            // super_admin without tenant filter sees everyone; otherwise filter by tenant
            const filterByTenant = tenantId ?? undefined;

            const [{ data: admins, total }, allTenants] = await Promise.all([
                this.adminRepository.selectAllPaginated(page, limit, excludeRoles, filterByTenant),
                this.tenantRepository.selectAll(),
            ]);
            const allTenantsSlim = allTenants.map((t: any) => ({
                id: t.id,
                name: t.name,
                slug: t.slug,
            }));

            const data = admins.map((admin: any) => ({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: normalizeAdminRole(admin.role as EAdminRole),
                active: admin.active,
                tenants: normalizeAdminRole(admin.role as EAdminRole) === EAdminRole.super_admin
                    ? allTenantsSlim
                    : admin.AdminTenant?.map((at: any) => ({
                        id: at.Tenant.id,
                        name: at.Tenant.name,
                        slug: at.Tenant.slug,
                    })) ?? [],
                created_at: admin.created_at,
            }));

            return successResponse({
                data,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            return errorResponse('500:ADMINS_NOT_LISTED', 500, error);
        }
    }

    async updateRole(adminId: string, role: EAdminRole, currentAdminId?: string, callerRole?: EAdminRole) {
        try {
            const normalizedRole = normalizeAdminRole(role);

            // Managers cannot assign super_admin or owner roles
            if (callerRole === EAdminRole.manager) {
                if (normalizedRole === EAdminRole.super_admin || normalizedRole === EAdminRole.owner) {
                    return errorResponse('403:INSUFFICIENT_PERMISSIONS_TO_ASSIGN_ROLE', 403);
                }
            }

            const safety = await this.assertSuperAdminSafety(adminId, {
                currentAdminId,
                nextRole: normalizedRole,
            });
            if (!safety.ok) {
                return safety.response;
            }

            const updated = await this.adminRepository.updateRole(adminId, normalizedRole);
            return successResponse({
                id: updated.id,
                name: updated.name,
                role: normalizeAdminRole(updated.role as EAdminRole),
            });
        } catch (error) {
            return errorResponse('500:ADMIN_ROLE_NOT_UPDATED', 500, error);
        }
    }

    async deactivate(adminId: string, currentAdminId: string) {
        try {
            if (adminId === currentAdminId) {
                return errorResponse('400:CANNOT_DEACTIVATE_SELF', 400);
            }

            const safety = await this.assertSuperAdminSafety(adminId, {
                currentAdminId,
                deactivate: true,
            });
            if (!safety.ok) {
                return safety.response;
            }

            const deactivated = await this.adminRepository.deactivate(adminId);
            return successResponse({
                id: deactivated.id,
                active: deactivated.active,
            });
        } catch (error) {
            return errorResponse('500:ADMIN_NOT_DEACTIVATED', 500, error);
        }
    }

    async activate(adminId: string) {
        try {
            const admin = await this.adminRepository.selectById(adminId);
            if (!admin) {
                return errorResponse(errorTypes._404.admin_nf, 404);
            }

            const activated = await this.adminRepository.activate(adminId);
            return successResponse({
                id: activated.id,
                active: activated.active,
            });
        } catch (error) {
            return errorResponse('500:ADMIN_NOT_ACTIVATED', 500, error);
        }
    }

    async update(adminId: string, data: { name?: string; email?: string }) {
        try {
            const admin = await this.adminRepository.selectById(adminId);
            if (!admin) {
                return errorResponse(errorTypes._404.admin_nf, 404);
            }

            if (data.email && data.email !== admin.email) {
                const existing = await this.adminRepository.selectByEmail(data.email);
                if (existing) {
                    return errorResponse('400:ADMIN_EMAIL_ALREADY_EXISTS', 400);
                }
            }

            const updated = await this.adminRepository.update(adminId, data);
            return successResponse({
                id: updated.id,
                name: updated.name,
                email: updated.email,
            });
        } catch (error) {
            return errorResponse('500:ADMIN_NOT_UPDATED', 500, error);
        }
    }

    async findById(adminId: string) {
        try {
            const admin = await this.adminRepository.selectByIdWithTenants(adminId);
            if (!admin) {
                return errorResponse(errorTypes._404.admin_nf, 404);
            }

            let tenants: any[];
            if (normalizeAdminRole(admin.role as EAdminRole) === EAdminRole.super_admin) {
                const all = await this.tenantRepository.selectAll();
                tenants = all.map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    slug: t.slug,
                    domain: t.domain,
                    role: EAdminRole.super_admin,
                }));
            } else {
                tenants = admin.AdminTenant?.map((at: any) => ({
                    id: at.Tenant.id,
                    name: at.Tenant.name,
                    slug: at.Tenant.slug,
                    domain: at.Tenant.domain,
                    role: normalizeAdminRole(at.role as EAdminRole),
                })) ?? [];
            }

            return successResponse({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: normalizeAdminRole(admin.role as EAdminRole),
                active: admin.active,
                tenants,
                created_at: admin.created_at,
            });
        } catch (error) {
            return errorResponse('500:ADMIN_NOT_FOUND', 500, error);
        }
    }

    async delete(adminId: string, currentAdminId: string) {
        try {
            if (adminId === currentAdminId) {
                return errorResponse('400:CANNOT_DELETE_SELF', 400);
            }

            const safety = await this.assertSuperAdminSafety(adminId, {
                currentAdminId,
                delete: true,
            });
            if (!safety.ok) {
                return safety.response;
            }

            await this.adminRepository.delete(adminId);
            return successResponse({ deleted: true });
        } catch (error) {
            return errorResponse('500:ADMIN_NOT_DELETED', 500, error);
        }
    }
}
