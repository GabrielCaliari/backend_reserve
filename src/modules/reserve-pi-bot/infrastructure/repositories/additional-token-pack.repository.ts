import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { IAdditionalTokenPackRepository } from '../../domain/interfaces';

@Injectable()
export default class AdditionalTokenPackRepository implements IAdditionalTokenPackRepository {
    constructor(private readonly prisma: PrismaService) {}
    async selectPackBySlug(slug: string) {
        try {
            const raw = await this.prisma.additionalTokenPack.findFirst({
                where: {
                    slug
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao selecionar um pacote adicional de token', error);
        }
    }
}