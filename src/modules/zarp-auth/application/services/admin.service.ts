import { Inject, Injectable } from '@nestjs/common';
import AuthAdminDTO, { IValidateAdminToken } from '@/modules/zarp-auth/application/dtos/auth-admin.dto';
import {
    IAdminRepository,
    IAdminCredentialRepository,
    IAdminSessionTokenRepository,
    ADMIN_REPOSITORY,
    ADMIN_CREDENTIAL_REPOSITORY,
    ADMIN_SESSION_TOKEN_REPOSITORY,
} from '@/modules/zarp-auth/domain/interfaces';
import { errorTypes } from '@/shared/constants/error-types';
import { errorResponse } from '@/shared/helpers';

@Injectable()
export class AdminService {
    constructor(
        @Inject(ADMIN_REPOSITORY) private readonly adminRepository: IAdminRepository,
        @Inject(ADMIN_CREDENTIAL_REPOSITORY) private readonly adminCredentialRepository: IAdminCredentialRepository,
        @Inject(ADMIN_SESSION_TOKEN_REPOSITORY) private readonly adminSessionTokenRepository: IAdminSessionTokenRepository,
    ) { }

    async authenticate(data: AuthAdminDTO) {
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
