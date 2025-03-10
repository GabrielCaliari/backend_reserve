import ProviderException from "../exceptions/ProviderException";

const crypto = require('crypto');

export default class AESEncrypt {
    private ALGORITHM = 'aes-256-gcm';
    private SALT_LENGTH = 32;
    private IV_LENGTH = 12;
    private KEY_LENGTH = 32;
    private ITERATIONS = 100000;

    private deriveKey(privateKey: string, salt: Buffer): Buffer {
        return crypto.pbkdf2Sync(privateKey, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
    }

    public encrypt(value: string, pv: string) {
        try {
            const salt = crypto.randomBytes(this.SALT_LENGTH);
            const iv = crypto.randomBytes(this.IV_LENGTH);
            const key = this.deriveKey(pv, salt);

            const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
            let encrypted = cipher.update(value, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            const authTag = cipher.getAuthTag();

            return {
                hash: Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'base64')]).toString('base64'),
                salt
            };
        } catch (error) {
            throw new ProviderException('Erro ao gerar um hash AES', error);
        }
    }

    public decrypt(hash: string, pv: string): string {
        try {
            const encryptedBuffer = Buffer.from(hash, 'base64');

            const salt = encryptedBuffer.subarray(0, this.SALT_LENGTH);
            const iv = encryptedBuffer.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
            const authTag = encryptedBuffer.subarray(this.SALT_LENGTH + this.IV_LENGTH, this.SALT_LENGTH + this.IV_LENGTH + 16);
            const encryptedText = encryptedBuffer.subarray(this.SALT_LENGTH + this.IV_LENGTH + 16);

            const key = this.deriveKey(pv, salt);

            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new ProviderException('Erro ao decriptar um hash AES', error);
        }
    }
}