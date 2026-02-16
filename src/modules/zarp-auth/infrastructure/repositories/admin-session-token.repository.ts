import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { HashProvider } from '@/shared/providers/hash.provider';
import { JwtProvider } from '@/shared/providers/jwt.provider';

export interface ICreateAdminSessionToken {
    password: string,
    admin_id: number;
    payload: {}
}

@Injectable()
export default class AdminSessionTokenRepository {
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

            const compare = this.hashProvider.compare(data.password, credential.salt, credential.hash);

            if (!compare) {
                return { token: null }
            }

            const token = await this.jwtProvider.generate(
                data.payload,
                18e6, // 5 horas de duração
                credential.salt
            );

            const { hash, salt } = this.hashProvider.hash(token);

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

    async validateToken(sessionId: number, token: string) {
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

            const tokenIsEqual = await this.hashProvider.compare(token, session.salt, session.hash_token);

            if (!tokenIsEqual) {
                return false;
            }

            const { jwt, expired, payload } = await this.jwtProvider.validate(token, session.Admin.AdminCredential.salt);

            if (expired || !payload.id) {
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