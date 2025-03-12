import { ICreateTrademarkRegistrionLead } from "src/@types/@trademark-registration-lead";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";

export default class TrademarkRegistrationLeadRepository {
    async create(data: ICreateTrademarkRegistrionLead) {
        try {
            const raw = await prismaClient.trademarkRegistrationLead.create({
                data
            });

            return raw;
        } catch (error) {
            throw new RepositoryException('Erro ao criar o lead', error);
        }
    }

    async listAll() {
        try {
            const raws = await prismaClient.trademarkRegistrationLead.findMany();

            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao listar os leads', error);
        }
    }
}