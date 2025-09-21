import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export interface IPublicBrandSearchFields {
    brand: string;
    name: string;
    email: string;
    radical: boolean;
}

export default class PublicBrandSearchRepository {
    async create(data: IPublicBrandSearchFields) {
        try {
            const raw = await prismaClient.publicBrandSearch.create({
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