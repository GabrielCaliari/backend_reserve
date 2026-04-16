import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { IAdminCredentialRepository } from '../../domain/interfaces';

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
}
