import RepositoryException from "src/core/exceptions/RepositoryException";
import prismaClient from "src/core/prisma/prismaClient";
import Encrypt from "src/core/providers/Encrypt";

export default class UserCredentialRepository {
    async compareHashByUserId(value: string, userId: number) {
        try {
            const credential = await prismaClient.userCredential.findUnique({
                where: {
                    user_id: userId
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