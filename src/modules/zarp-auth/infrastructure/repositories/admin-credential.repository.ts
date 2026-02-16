import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { HashProvider } from '@/shared/providers/hash.provider';

@Injectable()
export default class AdminCredentialRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashProvider: HashProvider,
    ) {}
    async compareHashByAdminId(value: string, adminId: number) {
        try {
            const credential = await this.prisma.adminCredential.findUnique({
                where: {
                    admin_id: adminId
                }
            })

            const compare = this.hashProvider.compare(value, credential.salt, credential.hash);
            if (typeof compare !== 'boolean') return false;

            return compare;
        } catch (error) {
            throw new RepositoryException('Erro ao comparar os hashs.', error);
        }
    }
}