import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";

export default class AdditionalTokenPackRepository {
    async selectPackBySlug(slug: string) {
        try {
            const raw = await prismaClient.additionalTokenPack.findFirst({
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