import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/database/prisma/prismaClient";
import Encrypt from "src/core/providers/Encrypt";

export default class AdminCredentialRepository {
    async compareHashByAdminId(value: string, adminId: number) {
        try {
            const credential = await prismaClient.adminCredential.findUnique({
                where: {
                    admin_id: adminId
                }
            })

            const compare = Encrypt.compare(value, credential.salt, credential.hash);
            if (typeof compare !== 'boolean') return false;

            return compare;
        } catch (error) {
            throw new RepositoryException('Erro ao comparar os hashs.', error);
        }
    }
}