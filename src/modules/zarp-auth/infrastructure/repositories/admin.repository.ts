import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { HashProvider } from '@/shared/providers/hash.provider';
import { IAdminRepository, ICreateAdmin } from '@/modules/zarp-auth/domain/interfaces';

export { ICreateAdmin };

@Injectable()
export default class AdminRepository implements IAdminRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashProvider: HashProvider,
    ) {}
    async create(data: ICreateAdmin) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const admin = await tx.admin.create({
                    data: {
                        name: data.name,
                        email: data.email,
                    }
                });

                const { hash, salt } = this.hashProvider.hash(data.password);

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
            const admin = await this.prisma.admin.findUnique({
                where: { id },
            });
            return admin ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um admin por ID.', error);
        }
    }

    async selectByEmail(email: string) {
        try {
            const admin = await this.prisma.admin.findUnique({
                where: { email },
            });
            return admin ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um admin por email.', error);
        }
    }
}