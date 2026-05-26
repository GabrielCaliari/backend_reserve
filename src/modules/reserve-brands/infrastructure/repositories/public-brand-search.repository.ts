import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';

export interface IPublicBrandSearchFields {
    brand: string;
    name: string;
    email: string;
    radical: boolean;
}

@Injectable()
export default class PublicBrandSearchRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: IPublicBrandSearchFields) {
        try {
            const raw = await this.prisma.publicBrandSearch.create({
                data: {
                    brand: data.brand,
                    email: data.email,
                    name: data.name,
                    radical: data.radical
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma nova consulta de marca.', error);
        }
    }
}