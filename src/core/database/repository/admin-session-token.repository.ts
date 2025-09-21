import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";
import Encrypt from "src/core/providers/Encrypt";
import JsonWebToken from "src/core/providers/JsonWebToken";

export interface ICreateAdminSessionToken {
    password: string,
    admin_id: number;
    payload: {}
}

export default class AdminSessionTokenRepository {
    async create(data: ICreateAdminSessionToken) {
        try {
            const credential = await prismaClient.adminCredential.findUnique({
                where: {
                    admin_id: data.admin_id
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

            const session = await prismaClient.adminSessionToken.create({
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
            const session = await prismaClient.adminSessionToken.findUnique({
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

            const tokenIsEqual = await Encrypt.compare(token, session.salt, session.hash_token);

            if (!tokenIsEqual) {
                return false;
            }

            const { jwt, expired, payload } = await JsonWebToken.getPayload(token, session.Admin.AdminCredential.salt);

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
            throw new RepositoryException('Erro ao validar um token de autorização do usuário.', error);
        }
    }
}