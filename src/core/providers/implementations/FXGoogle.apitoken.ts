import APITokenRepository from "src/core/database/repository/api-token.repository";
import AESEncrypt from "../AESEncrypt";
import { Injectable } from "@nestjs/common";
import { IAPIToken } from "../IAPIToken";
import { IAPITokenCreate } from "src/@types/@api-token";
import { isValidString } from "src/core/functions";
import RepositoryException from "src/core/exceptions/RepositoryException";

@Injectable()
export default class FXGoogleAPIToken implements IAPIToken {
    public constructor(
        private readonly APITokenRepository: APITokenRepository,
        private readonly AESEncrypt: AESEncrypt
    ) { }

    async get() {
        return {
            access_token: 'access_token',
            id_token: 'id_token',
            refresh_token: 'refresh_token',
            token_type: 'token_type',
            expires_in: new Date(),
            scope: 'scope'
        }
    }

    async create(data: IAPITokenCreate) {
        try {
            const idAPI = process.env.ID_API_GOOGLE_FX;
            const pv = process.env.PRIVATE_KEY_GOOGLE_FX;

            if (!isValidString(idAPI)) {
                throw `Não foi possível encontrar a ID da API da API GOOGLE FX via ENV. Env: ${idAPI}`;
            }

            if (!isValidString(pv)) {
                throw `Não foi possível encontrar a ID da API da API GOOGLE FX via ENV. Env: ${idAPI}`;
            }

            const raw = await this.APITokenRepository.findByIdentifier(idAPI);

            if (!raw || (raw && raw.expires_in < new Date())) {
                const acessToken = this.AESEncrypt.encrypt(data.acess_token, pv);
                const idToken = this.AESEncrypt.encrypt(data.id_token, pv);
                const refreshToken = this.AESEncrypt.encrypt(data.refresh_token, pv);

                const expiresIn = new Date(new Date().getTime() + (24 * 60 * 60 * 1000));
                let idRaw: number | undefined = raw?.id;

                if (!raw) {
                    const APITokenCreation = await this.APITokenRepository.create({
                        api_identifier: idAPI,
                        hash_acess_token: acessToken.hash,
                        hash_id_token: idToken.hash,
                        expires_in: expiresIn,
                        hash_refresh_token: refreshToken.hash,
                        active: true,
                        salt: '',
                    });

                    idRaw = APITokenCreation.id;
                } else {
                    await this.APITokenRepository.update(raw.id, {
                        hash_acess_token: acessToken.hash,
                        hash_id_token: idToken.hash,
                        expires_in: expiresIn,
                        hash_refresh_token: refreshToken.hash,
                        active: true,
                        salt: '',
                    });
                }
                
                return {
                    id: idRaw,
                    access_token: data.acess_token,
                    token_id: data.id_token,
                    refresh_token: data.refresh_token,
                    expires_in: expiresIn,
                }
            }
        } catch (error) {
            throw new RepositoryException('Erro ao criar um registro de API token', error);
        }
    }
}
