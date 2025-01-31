import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";
import Encrypt from "src/core/providers/Encrypt";
import JsonWebToken from "src/core/providers/JsonWebToken";

export interface ICreateUserSessionToken {
    password: string,
    userId: number;
    payload: {}
}

export default class UserSessionTokenRepository {
    async create(data: ICreateUserSessionToken) {
        try {
            const credential = await prismaClient.userCredential.findUnique({
                where: {
                    user_id: data.userId
                }
            });

            const compare = Encrypt.compare(data.password, credential.salt, credential.hash);

            if (!compare) {
                return { token: null }
            }

            const token = await JsonWebToken.generate(
                18e6, // 5 horas de duração
                data.payload,
                credential.salt
            );

            const { hash, salt } = Encrypt.encrypt(token);

            const session = await prismaClient.userSessionToken.create({
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
            throw new RepositoryException('Erro ao comparar os hashs de usuário.', error);
        }
    }

    async validateToken(sessionId: number, token: string) {
        try {
            const session = await prismaClient.userSessionToken.findUnique({
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

            const tokenIsEqual = await Encrypt.compare(token, session.salt, session.hash_token);

            if (!tokenIsEqual) {
                return false;
            }

            const { jwt, expired, payload } = await JsonWebToken.getPayload(token, session.User.Credential.salt);

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
            throw new RepositoryException('Erro ao validar um token de autorização do usuário.', error);
        }
    }
}