import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";
import Encrypt from "src/core/providers/Encrypt";

export interface ICreateAdmin {
    name: string;
    email: string;
    password: string;
}

export default class AdminRepository {
    async create(data: ICreateAdmin) {
        try {
            const result = await prismaClient.$transaction(async (tx) => {
                const admin = await tx.admin.create({
                    data: {
                        name: data.name,
                        email: data.email,
                    }
                });

                const { hash, salt } = Encrypt.encrypt(data.password);

                await tx.adminCredential.create({
                    data: {
                        hash,
                        salt,
                        admin_id: admin.id
                    }
                });

                return admin;
            });

            return result;
        } catch (error) {
            throw new RepositoryException('Erro ao criar um novo admin.', error);
        }
    }

    async selectById(id: number) {
        try {
            const admin = await prismaClient.admin.findUnique({
                where: { id },
            });
            return admin ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um admin por ID.', error);
        }
    }

    async selectByEmail(email: string) {
        try {
            const admin = await prismaClient.admin.findUnique({
                where: { email },
            });
            return admin ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um admin por email.', error);
        }
    }
}