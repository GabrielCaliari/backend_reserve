import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { IAdminRepository, ICreateAdmin } from '../../domain/interfaces';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

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
                        role: data.role ?? EAdminRole.manager,
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

    async selectById(id: string) {
        return this.withRetry(async () => {
            const admin = await this.prisma.admin.findUnique({
                where: { id },
            });
            return admin ?? null;
        }, 'Erro ao selecionar um admin por ID.');
    }

    async selectByIdWithTenants(id: string) {
        return this.withRetry(async () => {
            const admin = await this.prisma.admin.findUnique({
                where: { id },
                include: {
                    AdminTenant: {
                        where: {
                            active: true,
                            Tenant: { active: true },
                        },
                        include: { Tenant: true },
                    },
                },
            });
            return admin ?? null;
        }, 'Erro ao selecionar admin com tenants.');
    }

    async selectByEmail(email: string) {
        return this.withRetry(async () => {
            const admin = await this.prisma.admin.findUnique({
                where: { email },
            });
            return admin ?? null;
        }, 'Erro ao selecionar um admin por email.');
    }

    /**
     * Retry wrapper for database operations
     * Handles transient connection failures
     */
    private async withRetry<T>(
        operation: () => Promise<T>,
        errorMessage: string,
        maxRetries = 3,
        delayMs = 1000
    ): Promise<T> {
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;
                
                // Check if it's a connection error that we should retry
                const isRetryable = 
                    error?.code === 'P1001' || // Can't reach database server
                    error?.code === 'P1002' || // Database server timeout
                    error?.code === 'P1008' || // Operations timed out
                    error?.code === 'P1017' || // Server has closed the connection
                    error?.message?.includes('Connection terminated') ||
                    error?.message?.includes('timeout') ||
                    error?.message?.includes('ECONNRESET');
                
                if (!isRetryable || attempt === maxRetries) {
                    break;
                }
                
                // Exponential backoff
                const delay = delayMs * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new RepositoryException(errorMessage, lastError);
    }

    async selectAll() {
        try {
            return await this.prisma.admin.findMany({
                include: {
                    AdminTenant: {
                        where: {
                            active: true,
                            Tenant: { active: true },
                        },
                        include: { Tenant: { select: { id: true, name: true, slug: true } } },
                    },
                },
                orderBy: { created_at: 'desc' },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao listar admins.', error);
        }
    }

    async countActiveByRole(role: EAdminRole) {
        try {
            return await this.prisma.admin.count({
                where: {
                    role,
                    active: true,
                },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao contar admins ativos por role.', error);
        }
    }

    async updateRole(id: string, role: EAdminRole) {
        try {
            return await this.prisma.admin.update({
                where: { id },
                data: { role },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar role do admin.', error);
        }
    }

    async deactivate(id: string) {
        try {
            return await this.prisma.admin.update({
                where: { id },
                data: { active: false },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao desativar admin.', error);
        }
    }

    async activate(id: string) {
        try {
            return await this.prisma.admin.update({
                where: { id },
                data: { active: true },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao ativar admin.', error);
        }
    }

    async update(id: string, data: { name?: string; email?: string }) {
        try {
            return await this.prisma.admin.update({
                where: { id },
                data,
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar admin.', error);
        }
    }

    async delete(id: string) {
        try {
            await this.prisma.admin.delete({
                where: { id },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao deletar admin.', error);
        }
    }
}