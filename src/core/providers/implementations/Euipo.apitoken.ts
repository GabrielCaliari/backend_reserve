import { IAPIToken } from "../IAPIToken";
import ProviderException from "src/core/exceptions/ProviderException";
import { isValidString } from "src/core/functions";
import APITokenRepository from "src/core/database/repository/api-token.repository";
import axios from "axios";
import { Injectable } from "@nestjs/common";
import AESEncrypt from "../AESEncrypt";

interface IMakeRequestResponse {
    access_token: string;
    id_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

@Injectable()
export default class EuipoAPIToken implements IAPIToken {
    public constructor(
        private readonly APITokenRepository: APITokenRepository,
        private readonly AESEncrypt: AESEncrypt
    ) { }

    async makeRequest(): Promise<IMakeRequestResponse> {
        try {
            const url = process.env.AUTH_URL_EUIPO;
            const clientId = process.env.CLIENT_ID_EUIPO;
            const clientSecret = process.env.CLIENT_SECRET_EUIPO;
            const scope = process.env.SCOPE_EUIPO;

            if (!isValidString(url)) {
                throw `Não foi possível encontrar a URL da API da API EUIPO via ENV. env value: ${url}`
            }

            if (!isValidString(clientId)) {
                throw `Não foi possível encontrar o client ID da API da API EUIPO via ENV. Env: ${clientId}`;
            }
            
            if (!isValidString(clientSecret)) {
                throw `Não foi possível encontrar o client secret da API da API EUIPO via ENV. Env: ${clientSecret}`;
            }

            if (!isValidString(scope)) {
                throw `Não foi possível encontrar o scope da API da API EUIPO via ENV. Env: ${scope}`;
            }

            const headers = {
                'X-IBM-Client-Id': clientId,
                'Content-Type': 'application/x-www-form-urlencoded'
            }

            const body = new URLSearchParams();

            body.append('grant_type', 'client_credentials');
            body.append('client_id', clientId);
            body.append('client_secret', clientSecret);
            body.append('scope', scope);

            const axiosResponse = await axios({
                method: 'post',
                url: url,
                data: body,
                headers,
            });

            if (axiosResponse.status != 200) {
                throw `Erro ao fazer requisição para URL de autorização da API EUIPO. Status code: ${JSON.stringify(axiosResponse)}`;
            }

            return axiosResponse.data;
        } catch (error) {
            console.log(error)
            throw new ProviderException('Erro ao fazer requisição para URL de autorização da EUIPO', error);
        }
    }

    async get() {
        try {
            const idAPI = process.env.ID_API_EUIPO;
            const pv = process.env.PRIVATE_KEY_EUIPO;

            if (!isValidString(idAPI)) {
                throw `Não foi possível encontrar a ID da API da API EUIPO via ENV. Env: ${idAPI}`;
            }

            if (!isValidString(pv)) {
                throw `Não foi possível encontrar a ID da API da API EUIPO via ENV. Env: ${idAPI}`;
            }


            const raw = await this.APITokenRepository.findByIdentifier(idAPI);

            if (!raw || (raw && raw.expires_in < new Date())) {
                const result = await this.makeRequest();

                const acessToken = this.AESEncrypt.encrypt(result.access_token, pv);
                const idToken = this.AESEncrypt.encrypt(result.id_token, pv);
                const refreshToken = this.AESEncrypt.encrypt(result.refresh_token, pv);

                const expiresIn = new Date(new Date().getTime() + (30 * 60 * 1000));

                if (!raw) {
                    await this.APITokenRepository.create({
                        api_identifier: idAPI,
                        hash_acess_token: acessToken.hash,
                        hash_id_token: idToken.hash,
                        expires_in: expiresIn,
                        hash_refresh_token: refreshToken.hash,
                        active: true,
                        salt: '',
                    });
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
                    access_token: result.access_token,
                    token_id: result.id_token,
                    refresh_token: result.refresh_token,
                    expires_in: expiresIn,
                }
            }

            const acessToken = this.AESEncrypt.decrypt(raw.hash_acess_token, pv);
            const idToken = this.AESEncrypt.decrypt(raw.hash_id_token, pv);
            const refreshToken = this.AESEncrypt.decrypt(raw.hash_refresh_token, pv);

            return {
                access_token: acessToken,
                token_id: idToken,
                refresh_token: refreshToken,
                expires_in: raw.expires_in,
            }
        } catch (error) {
            throw new ProviderException('Erro ao gerar a API token da API EUIPO', error);
        }
    }
}