import ProviderException from "../exceptions/ProviderException";

let jwt = require('jsonwebtoken');

export default class JsonWebToken {
    static async generate(expiresIn: number, payload: object, salt?: string) {
        try {
            if (!process.env.JWT_PRIVATE_KEY) throw 'JWT: private key not found';
            if (!process.env.JWT_ALGORITHM) throw 'JWT: algorithm not found';

            const seed = salt ? process.env.JWT_PRIVATE_KEY + salt : process.env.JWT_PRIVATE_KEY;

            const token = jwt.sign(payload, seed, { algorithm: process.env.JWT_ALGORITHM, expiresIn: expiresIn });

            return token;
        } catch (error) {
            throw new ProviderException('JsonWebToken: error generating jwt', error);
        }
    }

    static async getPayload(token: string, salt?: string) {
        try {
            if (!process.env.JWT_PRIVATE_KEY) throw 'JWT: private key not found';

            const seed = salt ? process.env.JWT_PRIVATE_KEY + salt : process.env.JWT_PRIVATE_KEY;
            var decoded = await jwt.verify(token, seed);

            return {
                jwt: token,
                payload: decoded
            };
        } catch (error) {
            if (new Error(error).message == 'TokenExpiredError: jwt expired') {
                return {
                    jwt: token,
                    expired: true,
                }
            }

            if (new Error(error).message == 'JsonWebTokenError: invalid signature') {
                return {
                    jwt: token,
                    expired: true,
                }
            }

            throw new ProviderException('JsonWebToken IMP: Error getPayload', error);
        }
    }
}