import { EUserSex } from "src/@types/@user-sex";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";
import Encrypt from "src/core/providers/Encrypt";

export interface ICreateUser {
    email: string;
    name: string;
    password: string;
    phone_number: string;
    // sex: EUserSex;
    cpf: string;
    // date_of_birth: Date;
}

export interface IUserFindInclude {
    Plan?: boolean,
    Subscription?: boolean
}

export default class UserRepository {
    async create(data: ICreateUser) {
        try {
            const result = await prismaClient.$transaction(async (tx) => {
                const freePlan = await tx.plan.findUnique({
                    where: {
                        slug: 'plano-gratis'
                    }
                });

                if (!freePlan || !freePlan.id) throw new Error('free plan not found');

                const user = await tx.user.create({
                    data: {
                        name: data.name,
                        email: data.email,
                        cpf: data.cpf,
                        phone_number: data.phone_number,
                        plan_id: freePlan.id
                    }
                });

                const { hash, salt } = Encrypt.encrypt(data.password);

                await tx.userCredential.create({
                    data: {
                        hash,
                        salt,
                        user_id: user.id
                    }
                });

                return user;
            });

            return result;
        } catch (error) {
            throw new RepositoryException('Erro ao criar um novo usuário.', error);
        }
    }

    async selectById(id: number, include: IUserFindInclude = {}) {
        try {
            const user = await prismaClient.user.findUnique({
                where: { id },
                include
            });
            return user ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um usuário por ID.', error);
        }
    }

    async selectByEmail(email: string, include: IUserFindInclude = {}) {
        try {
            const user = await prismaClient.user.findUnique({
                where: { email },
                include
            });
            return user ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um usuário por EMAIL.', error);
        }
    }

    async selectByCPF(cpf: string, include: IUserFindInclude = {}) {
        try {
            const user = await prismaClient.user.findUnique({
                where: { cpf },
                include
            });
            return user ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um usuário por CPF.', error);
        }
    }
}