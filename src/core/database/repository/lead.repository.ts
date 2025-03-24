import { ICreateLead } from "src/@types/@lead";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";

export default class LeadRepository {
    async create(data: ICreateLead) {
        try {
            const raw = await prismaClient.lead.create({
                data
            });
            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar o lead', error);
        }
    }

    async listAll({ page = 1, limit = 10 }) {
        try {
            const skip = (page - 1) * limit;
            const [data, total] = await Promise.all([
                prismaClient.lead.findMany({
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                }),
                prismaClient.lead.count(),
            ]);
            return { data, total };
        } catch (error) {
            throw new RepositoryException('Erro ao listar os leads', error);
        }
    }
}