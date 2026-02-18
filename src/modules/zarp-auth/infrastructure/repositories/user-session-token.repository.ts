import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { JwtProvider } from '../../../../shared/providers/jwt.provider';
import { IUserSessionTokenRepository, ICreateUserSessionToken } from '../../domain/interfaces';

export { ICreateUserSessionToken };

@Injectable()
export default class UserSessionTokenRepository implements IUserSessionTokenRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashProvider: HashProvider,
        private readonly jwtProvider: JwtProvider,
    ) {}
    async create(data: ICreateUserSessionToken) {
        try {
            const credential = await this.prisma.userCredential.findUnique({
                where: {
                    user_id: data.userId
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

            const session = await this.prisma.userSessionToken.create({
                data: {
                    hash_token: hash,
                    user_id: credential.user_id,
                    salt: salt,
                }
            })

            return {
                id: session.id,
                token: token
            }
        } catch (error) {
            throw new RepositoryException('Erro ao comparar os hashs de usuÃ¡rio.', error);
        }
    }

    async validateToken(sessionId: number, token: string) {
        try {
            const session = await this.prisma.userSessionToken.findUnique({
                where: {
                    id: sessionId
                },
                include: {
                    User: {
                        include: {
                            Credential: true
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

            const { jwt, expired, payload } = await this.jwtProvider.validate(token, session.User.Credential.salt);

            if (expired || !payload.id) {
                return false;
            }

            if (payload.id !== session.user_id || payload.id !== session.User.id) {
                return false;
            }

            return {
                userId: session.User.id
            };
        } catch (error) {
            throw new RepositoryException('Erro ao validar um token de autorizaÃ§Ã£o do usuÃ¡rio.', error);
        }
    }
}