import { Injectable } from '@nestjs/common';
import IAuthAdminValidator, { IValidateAdminToken } from 'src/common/validators/admin/auth-admin.validator';
import AdminCredentialRepository from 'src/core/database/repository/admin-credential.repository';
import AdminSessionTokenRepository from 'src/core/database/repository/admin-session-token.repository';
import AdminRepository from 'src/core/database/repository/admin.repository';
import { errorTypes } from 'src/core/error-types';
import { errorResponse } from 'src/core/functions';

@Injectable()
export class AdminService {
    constructor(
        private readonly adminRepository: AdminRepository,
        private readonly adminCredentialRepository: AdminCredentialRepository,
        private readonly adminSessionTokenRepository: AdminSessionTokenRepository,
    ) { }

    async authenticate(data: IAuthAdminValidator) {
        try {
            const admin = await this.adminRepository.selectByEmail(data.email);

            if (!admin || !admin.id) {
                return errorResponse(errorTypes._401.admin_email_nf, 401);
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
                    name: admin.name
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
                        email: admin.email
                    }
                }
            }
        } catch (error) {
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
            const admin = await this.adminRepository.selectById(adminId);

            if (!admin) {
                return errorResponse(errorTypes._404.admin_nf, 404);
            }

            return {
                status: 200,
                data: {
                    name: admin.name,
                    email: admin.email,
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.listing_admin_data, 500, error);
        }
    }
}
