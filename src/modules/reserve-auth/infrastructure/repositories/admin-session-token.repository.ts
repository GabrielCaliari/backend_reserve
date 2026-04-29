import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { JwtProvider } from '../../../../shared/providers/jwt.provider';
import { IAdminSessionTokenRepository, ICreateAdminSessionToken } from '../../domain/interfaces';

export { ICreateAdminSessionToken };

@Injectable()
export default class AdminSessionTokenRepository implements IAdminSessionTokenRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashProvider: HashProvider,
        private readonly jwtProvider: JwtProvider,
    ) {}
    async create(data: ICreateAdminSessionToken) {
        try {
            const credential = await this.prisma.adminCredential.findUnique({
                where: {
                    admin_id: data.admin_id
                }
            });

            if (!credential) {
                return { token: null }
            }

            const compare = this.hashProvider.compare(
                data.password,
                credential.salt,
                credential.hash,
                credential.hash_version as 1 | 2,
            );

            if (!compare) {
                return { token: null }
            }

            const token = await this.jwtProvider.generate(
                data.payload,
                18e6, // 5 horas de duração
                credential.salt
            );

            const { hash, salt } = this.hashProvider.hashToken(token);

            const session = await this.prisma.adminSessionToken.create({
                data: {
                    hash_token: hash,
                    admin_id: credential.admin_id,
                    salt: salt,
                }
            })

            return {
                id: session.id,
                token: token
            }
        } catch (error) {
            throw new RepositoryException('Erro ao comparar os hashs de admin.', error);
        }
    }

    async validateToken(sessionId: string, token: string) {
        try {
            const session = await this.prisma.adminSessionToken.findUnique({
                where: {
                    id: sessionId
                },
                include: {
                    Admin: {
                        include: {
                            AdminCredential: true
                        }
                    }
                }
            });

            if (!session || !session.id) {
                return false;
            }

            const tokenIsEqual = this.hashProvider.compareToken(token, session.salt, session.hash_token);

            if (!tokenIsEqual) {
                return false;
            }

            const { jwt, expired, invalid, payload } = await this.jwtProvider.validate(token, session.Admin.AdminCredential.salt);

            if (expired || invalid || !payload?.id) {
                return false;
            }

            if (payload.id !== session.admin_id || payload.id !== session.Admin.id) {
                return false;
            }

            return {
                admin_id: session.Admin.id
            };
        } catch (error) {
            throw new RepositoryException('Erro ao validar um token de autorizaÃ§Ã£o do usuÃ¡rio.', error);
        }
    }
}