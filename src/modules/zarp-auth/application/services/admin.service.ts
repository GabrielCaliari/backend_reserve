import { Inject, Injectable } from '@nestjs/common';
import AuthAdminDTO, { IValidateAdminToken } from '@/modules/zarp-auth/application/dtos/auth-admin.dto';
import { CreateAdminDTO } from '@/modules/zarp-auth/application/dtos/admin-management.dto';
import {
    IAdminRepository,
    IAdminCredentialRepository,
    IAdminSessionTokenRepository,
    ADMIN_REPOSITORY,
    ADMIN_CREDENTIAL_REPOSITORY,
    ADMIN_SESSION_TOKEN_REPOSITORY,
} from '@/modules/zarp-auth/domain/interfaces';
import {
    ADMIN_TENANT_REPOSITORY,
    IAdminTenantRepository,
} from '@/modules/zarp-auth/domain/interfaces/admin-tenant.repository.interface';
import { EAdminRole } from '@/modules/zarp-auth/domain/enums/admin-role.enum';
import { errorTypes } from '@/shared/constants/error-types';
import { errorResponse, successResponse } from '@/shared/helpers';

@Injectable()
export class AdminService {
    constructor(
        @Inject(ADMIN_REPOSITORY) private readonly adminRepository: IAdminRepository,
        @Inject(ADMIN_CREDENTIAL_REPOSITORY) private readonly adminCredentialRepository: IAdminCredentialRepository,
        @Inject(ADMIN_SESSION_TOKEN_REPOSITORY) private readonly adminSessionTokenRepository: IAdminSessionTokenRepository,
        @Inject(ADMIN_TENANT_REPOSITORY) private readonly adminTenantRepository: IAdminTenantRepository,
    ) { }

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
                        role: admin.role,
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

    async me(adminId: number) {
        try {
            const admin = await this.adminRepository.selectByIdWithTenants(adminId);

            if (!admin) {
                return errorResponse(errorTypes._404.admin_nf, 404);
            }

            const tenants = admin.AdminTenant?.map((at: any) => ({
                id: at.Tenant.id,
                name: at.Tenant.name,
                slug: at.Tenant.slug,
                domain: at.Tenant.domain,
            })) ?? [];

            return {
                status: 200,
                data: {
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    active: admin.active,
                    tenants,
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.listing_admin_data, 500, error);
        }
    }

    async register(data: CreateAdminDTO) {
        try {
            const existing = await this.adminRepository.selectByEmail(data.email);
            if (existing) {
                return errorResponse('400:ADMIN_EMAIL_ALREADY_EXISTS', 400);
            }

            const admin = await this.adminRepository.create({
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role,
            });

            return successResponse({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            }, 201);
        } catch (error) {
            return errorResponse('500:ADMIN_NOT_CREATED', 500, error);
        }
    }

    async listAll() {
        try {
            const admins = await this.adminRepository.selectAll();

            const mapped = admins.map((admin: any) => ({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                active: admin.active,
                tenants: admin.AdminTenant?.map((at: any) => ({
                    id: at.Tenant.id,
                    name: at.Tenant.name,
                    slug: at.Tenant.slug,
                })) ?? [],
                created_at: admin.created_at,
            }));

            return successResponse(mapped);
        } catch (error) {
            return errorResponse('500:ADMINS_NOT_LISTED', 500, error);
        }
    }

    async updateRole(adminId: number, role: EAdminRole) {
        try {
            const admin = await this.adminRepository.selectById(adminId);
            if (!admin) {
                return errorResponse(errorTypes._404.admin_nf, 404);
            }

            const updated = await this.adminRepository.updateRole(adminId, role);
            return successResponse({
                id: updated.id,
                name: updated.name,
                role: updated.role,
            });
        } catch (error) {
            return errorResponse('500:ADMIN_ROLE_NOT_UPDATED', 500, error);
        }
    }

    async deactivate(adminId: number, currentAdminId: number) {
        try {
            if (adminId === currentAdminId) {
                return errorResponse('400:CANNOT_DEACTIVATE_SELF', 400);
            }

            const admin = await this.adminRepository.selectById(adminId);
            if (!admin) {
                return errorResponse(errorTypes._404.admin_nf, 404);
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
}
