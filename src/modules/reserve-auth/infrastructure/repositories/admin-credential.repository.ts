import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { IAdminCredentialRepository } from '../../domain/interfaces';
import { evaluateLockout } from '../../../../shared/auth/account-lockout.policy';

@Injectable()
export default class AdminCredentialRepository implements IAdminCredentialRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashProvider: HashProvider,
    ) {}
    async compareHashByAdminId(value: string, adminId: string) {
        try {
            const credential = await this.prisma.adminCredential.findUnique({
                where: {
                    admin_id: adminId
                }
            })

            if (!credential) return false;

            const compare = this.hashProvider.compare(
                value,
                credential.salt,
                credential.hash,
                credential.hash_version as 1 | 2,
            );
            if (typeof compare !== 'boolean') return false;

            return compare;
        } catch (error) {
            throw new RepositoryException('Erro ao comparar os hashs.', error);
        }
    }

    async updatePasswordByAdminId(adminId: string, password: string) {
        try {
            const { hash, salt, version } = this.hashProvider.hash(password);
            await this.prisma.adminCredential.upsert({
                where: { admin_id: adminId },
                update: { hash, salt, hash_version: version, failed_attempts: 0, locked_until: null },
                create: { admin_id: adminId, hash, salt, hash_version: version },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar credenciais do admin.', error);
        }
    }

    async findLockoutState(adminId: string) {
        try {
            const credential = await this.prisma.adminCredential.findUnique({
                where: { admin_id: adminId },
                select: { locked_until: true, failed_attempts: true, hash_version: true },
            });

            if (!credential) return null;

            return {
                lockedUntil: credential.locked_until,
                failedAttempts: credential.failed_attempts,
                hashVersion: credential.hash_version as 1 | 2,
            };
        } catch (error) {
            throw new RepositoryException('Erro ao consultar o estado de bloqueio do admin.', error);
        }
    }

    async registerFailedAttempt(adminId: string) {
        try {
            const updated = await this.prisma.adminCredential.update({
                where: { admin_id: adminId },
                data: { failed_attempts: { increment: 1 } },
                select: { failed_attempts: true },
            });

            const evaluation = evaluateLockout(updated.failed_attempts);
            if (evaluation.locked) {
                await this.prisma.adminCredential.update({
                    where: { admin_id: adminId },
                    data: { locked_until: evaluation.lockedUntil },
                });
            }
        } catch (error) {
            throw new RepositoryException('Erro ao registrar tentativa de login falha.', error);
        }
    }

    async clearFailedAttempts(adminId: string) {
        try {
            await this.prisma.adminCredential.update({
                where: { admin_id: adminId },
                data: { failed_attempts: 0, locked_until: null },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao limpar tentativas de login falhas.', error);
        }
    }

    async rehashToLatest(adminId: string, plainPassword: string) {
        try {
            const { hash, salt, version } = this.hashProvider.hash(plainPassword);
            await this.prisma.adminCredential.update({
                where: { admin_id: adminId },
                data: { hash, salt, hash_version: version },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar a versão do hash da senha.', error);
        }
    }
}
