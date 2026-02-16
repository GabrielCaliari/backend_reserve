import { ICreateAPIToken, IUpdateAPIToken } from "@/@types/@api-token";
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { RepositoryException } from '@/shared/exceptions';
import { isApiTokenDataValidToCreate, isApiTokenDataValidToUpdate } from "@/modules/zarp-brands/domain/validators/api-token.validator";

@Injectable()
export default class APITokenRepository {
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

    async update(id: number, data: IUpdateAPIToken) {
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