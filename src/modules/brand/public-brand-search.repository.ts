import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";

export interface IPublicBrandSearchFields {
    brand: string;
    name: string;
    email: string;
}

export default class PublicBrandSearchRepository {
    async create(data: IPublicBrandSearchFields) {
        try {
            const raw = await prismaClient.publicBrandSearch.create({
                data: {
                    brand: data.brand,
                    email: data.email,
                    name: data.name,
                }
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar uma nova consulta de marca.', error);
        }
    }
}