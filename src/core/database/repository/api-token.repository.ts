import { ICreateAPIToken, IUpdateAPIToken } from "src/@types/@api-token";
import RepositoryException from "../../exceptions/RepositoryException";
import prismaClient from "../prisma/prismaClient";
import { isApiTokenDataValidToCreate, isApiTokenDataValidToUpdate } from "../validator/api-token.validator";

export default class APITokenRepository {
    async create(data: ICreateAPIToken) {
        try {
            const raw = await prismaClient.aPIToken.create({
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
            const raw = await prismaClient.aPIToken.findUnique({
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
            const raw = await prismaClient.aPIToken.update({
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