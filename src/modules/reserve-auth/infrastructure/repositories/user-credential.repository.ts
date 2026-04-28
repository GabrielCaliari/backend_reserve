import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { IUserCredentialRepository } from '../../domain/interfaces';
import { evaluateLockout } from '../../../../shared/auth/account-lockout.policy';

@Injectable()
export default class UserCredentialRepository implements IUserCredentialRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashProvider: HashProvider,
    ) {}
    async compareHashByUserId(value: string, userId: string) {
        try {
            const credential = await this.prisma.userCredential.findUnique({
                where: {
                    user_id: userId
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

    async findLockoutState(userId: string) {
        try {
            const credential = await this.prisma.userCredential.findUnique({
                where: { user_id: userId },
                select: { locked_until: true, failed_attempts: true, hash_version: true },
            });

            if (!credential) return null;

            return {
                lockedUntil: credential.locked_until,
                failedAttempts: credential.failed_attempts,
                hashVersion: credential.hash_version as 1 | 2,
            };
        } catch (error) {
            throw new RepositoryException('Erro ao consultar o estado de bloqueio do usuário.', error);
        }
    }

    async registerFailedAttempt(userId: string) {
        try {
            const updated = await this.prisma.userCredential.update({
                where: { user_id: userId },
                data: { failed_attempts: { increment: 1 } },
                select: { failed_attempts: true },
            });

            const evaluation = evaluateLockout(updated.failed_attempts);
            if (evaluation.locked) {
                await this.prisma.userCredential.update({
                    where: { user_id: userId },
                    data: { locked_until: evaluation.lockedUntil },
                });
            }
        } catch (error) {
            if ((error as { code?: string })?.code === 'P2025') return; // sem credential row — nada a registrar
            throw new RepositoryException('Erro ao registrar tentativa de login falha.', error);
        }
    }

    async clearFailedAttempts(userId: string) {
        try {
            await this.prisma.userCredential.update({
                where: { user_id: userId },
                data: { failed_attempts: 0, locked_until: null },
            });
        } catch (error) {
            if ((error as { code?: string })?.code === 'P2025') return;
            throw new RepositoryException('Erro ao limpar tentativas de login falhas.', error);
        }
    }

    async rehashToLatest(userId: string, plainPassword: string) {
        try {
            const { hash, salt, version } = this.hashProvider.hash(plainPassword);
            await this.prisma.userCredential.update({
                where: { user_id: userId },
                data: { hash, salt, hash_version: version },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar a versão do hash da senha.', error);
        }
    }
}