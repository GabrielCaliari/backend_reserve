import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { HashProvider } from '../../../../shared/providers/hash.provider';
import { IUserCredentialRepository } from '../../domain/interfaces';

@Injectable()
export default class UserCredentialRepository implements IUserCredentialRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashProvider: HashProvider,
    ) {}
    async compareHashByUserId(value: string, userId: number) {
        try {
            const credential = await this.prisma.userCredential.findUnique({
                where: {
                    user_id: userId
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