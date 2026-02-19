import { EUserSex } from '../../domain/enums/user-sex.enum';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { IUserRepository, ICreateUser, IUserFindInclude } from '../../domain/interfaces';

@Injectable()
export default class UserRepository implements IUserRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashProvider: HashProvider,
    ) {}
    async create(data: ICreateUser) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
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

                const { hash, salt } = this.hashProvider.hash(data.password);

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
            throw new RepositoryException('Erro ao criar um novo usuÃ¡rio.', error);
        }
    }

    async selectById(id: number, include: IUserFindInclude = {}) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id },
                include
            });
            return user ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um usuÃ¡rio por ID.', error);
        }
    }

    async selectByEmail(email: string, include: IUserFindInclude = {}) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email },
                include
            });
            return user ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um usuÃ¡rio por EMAIL.', error);
        }
    }

    async selectByCPF(cpf: string, include: IUserFindInclude = {}) {
        try {
            const user = await this.prisma.user.findFirst({
                where: { cpf },
                include
            });
            return user ?? null;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar um usuÃ¡rio por CPF.', error);
        }
    }

    async findAllPaginated(skip: number, limit: number) {
        try {
            return await this.prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone_number: true,
                    cpf: true,
                    plan_id: true,
                    date_expires_in: true,
                    created_at: true,
                },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao listar usuários paginados.', error);
        }
    }

    async count() {
        try {
            return await this.prisma.user.count();
        } catch (error) {
            throw new RepositoryException('Erro ao contar usuários.', error);
        }
    }

    async findById(id: number) {
        try {
            return await this.prisma.user.findUnique({
                where: { id },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao buscar usuário por ID.', error);
        }
    }

    async findByEmail(email: string) {
        try {
            return await this.prisma.user.findUnique({
                where: { email },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao buscar usuário por email.', error);
        }
    }

    async update(id: number, data: any) {
        try {
            return await this.prisma.user.update({
                where: { id },
                data,
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar usuário.', error);
        }
    }

    async delete(id: number) {
        try {
            await this.prisma.user.delete({
                where: { id },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao deletar usuário.', error);
        }
    }
}
