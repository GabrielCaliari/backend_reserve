import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export default class CnaeRepository {
    async find() {
        try {
            const raws = await prismaClient.cnae.findMany();
            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao buscar os cnaes.', error);
        }
    }
}