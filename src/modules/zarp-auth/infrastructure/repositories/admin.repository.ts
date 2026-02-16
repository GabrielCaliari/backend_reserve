import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { HashProvider } from '@/shared/providers/hash.provider';
import { IAdminRepository, ICreateAdmin } from '@/modules/zarp-auth/domain/interfaces';
import { EAdminRole } from '@/modules/zarp-auth/domain/enums/admin-role.enum';

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
                        role: data.role ?? EAdminRole.company_admin,
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

    async selectByIdWithTenants(id: number) {
        try {
            const admin = await this.prisma.admin.findUnique({
                where: { id },
                include: {
                    AdminTenant: {
                        where: { active: true },
                        include: { Tenant: true },
                    },
                },
            });
            return admin ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar admin com tenants.', error);
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

    async selectAll() {
        try {
            return await this.prisma.admin.findMany({
                include: {
                    AdminTenant: {
                        where: { active: true },
                        include: { Tenant: { select: { id: true, name: true, slug: true } } },
                    },
                },
                orderBy: { created_at: 'desc' },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao listar admins.', error);
        }
    }

    async updateRole(id: number, role: EAdminRole) {
        try {
            return await this.prisma.admin.update({
                where: { id },
                data: { role },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar role do admin.', error);
        }
    }

    async deactivate(id: number) {
        try {
            return await this.prisma.admin.update({
                where: { id },
                data: { active: false },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao desativar admin.', error);
        }
    }
}