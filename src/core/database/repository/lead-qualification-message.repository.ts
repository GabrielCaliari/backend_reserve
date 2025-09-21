import { ETemperature } from "src/@types/@lead-qualification-message";
import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";

export default class LeadQualificationMessageRepository {
    async listAll() {
        try {
            const raws = await prismaClient.leadQualificationMessage.findMany();
            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao listar os leads', error);
        }
    }

    async listByPhoneNumberId(phoneNumberId: string) {
        try {
            const raws = await prismaClient.leadQualificationMessage.findMany({
                where: {
                    phone_number_id: phoneNumberId
                }
            });
            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao listar os leads por message id', error);
        }
    }

    async listAllUnaligned() {
        try {
            const raws = await prismaClient.leadQualificationMessage.findMany({
                where: {
                    analyzed: false
                }
            });
            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao listar os leads', error);
        }
    }

    async updateMessagesByPhoneNumberId(id: string, data: { kb_card?: string, analyzed?: boolean, temperature?: ETemperature, screening_complete?: boolean }) {
        try {
            const raws = await prismaClient.leadQualificationMessage.updateMany({
                data: {
                    ...(data.kb_card ? { kb_card: data.kb_card } : {}),
                    ...(data.analyzed ? { analyzed: data.analyzed } : {}),
                    ...(data.temperature ? { temperature: data.temperature } : {}),
                    ...(data.screening_complete ? { screening_complete: data.screening_complete } : {}),
                },
                where: {
                    phone_number_id: id
                }
            });
            return raws;
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar o lead', error);
        }
    }
}