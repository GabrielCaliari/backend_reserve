import { ICreateAPIToken, IUpdateAPIToken } from '../../domain/interfaces/api-token.repository.interface';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import { isApiTokenDataValidToCreate, isApiTokenDataValidToUpdate } from '../../domain/validators/api-token.validator';
import { IAPITokenRepository } from '../../domain/interfaces';

@Injectable()
export default class APITokenRepository implements IAPITokenRepository {
    constructor(private readonly prisma: PrismaService) {}
    async create(data: ICreateAPIToken) {
        try {
            const raw = await this.prisma.aPIToken.create({
                data: isApiTokenDataValidToCreate(data)
            });

            return {
                id: raw.id
            }
        } catch (error) {
            throw new RepositoryException('Erro ao criar um registro de API token', error);
        }
    }

    async findByIdentifier(identifier: string) {
        try {
            const raw = await this.prisma.aPIToken.findUnique({
                where: {
                    api_identifier: identifier
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar por um registro de API token', error);
        }
    }

    async update(id: string, data: IUpdateAPIToken) {
        try {
            const raw = await this.prisma.aPIToken.update({
                data: isApiTokenDataValidToUpdate(data),
                where: {
                    id
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar  um registro de API token', error);
        }
    }
}