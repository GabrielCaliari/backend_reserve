import ProviderException from "../exceptions/ProviderException";

const crypto = require('crypto');

export default class Encrypt {
    public static encrypt(value: string): { salt: string, hash: string } {
        try {
            if (!process.env.ENCRYPT_PRIVATE_KEY) throw new Error('Não foi possível encontrar a chave privada de segurança.');

            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(
                value,
                salt + process.env.ENCRYPT_PRIVATE_KEY,
                856, // quantidade de iterações para o algoritmo (sha512)
                64, // tamanho do hash a ser gerado
                'sha512'
            ).toString('hex');

            return {
                salt,
                hash
            };
        } catch (error) {
            throw new ProviderException('Erro ao gerar um hash', error);
        }
    }

    public static compare(value: string, salt: string, hash: string): boolean {
        try {
            if (!process.env.ENCRYPT_PRIVATE_KEY) throw new Error('Não foi possível encontrar a chave privada de segurança.');

            const passwordHash = crypto.pbkdf2Sync(
                value,
                salt + process.env.ENCRYPT_PRIVATE_KEY,
                856,
                64,
                'sha512'
            ).toString('hex');

            return hash === passwordHash;
        } catch (error) {
            throw new ProviderException('Erro ao comparar um hash', error);
        }
    }
}