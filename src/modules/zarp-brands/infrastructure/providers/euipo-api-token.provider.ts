import { Injectable } from '@nestjs/common';
import { IAPIToken } from '@/shared/interfaces/api-token.interface';
import { ProviderException } from '@/shared/exceptions';
import { EncryptProvider } from '@/shared/providers/encrypt.provider';
import { isValidString } from '@/shared/helpers/string.helper';
import APITokenRepository from '@/modules/zarp-brands/infrastructure/repositories/api-token.repository';
import axios from 'axios';

interface IMakeRequestResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

@Injectable()
export class EuipoAPITokenProvider implements IAPIToken {
  public constructor(
    private readonly apiTokenRepository: APITokenRepository,
    private readonly encryptProvider: EncryptProvider,
  ) {}

  async makeRequest(): Promise<IMakeRequestResponse> {
    try {
      const url = process.env.AUTH_URL_EUIPO;
      const clientId = process.env.CLIENT_ID_EUIPO;
      const clientSecret = process.env.CLIENT_SECRET_EUIPO;
      const scope = process.env.SCOPE_EUIPO;

      if (!isValidString(url)) {
        throw `Nao foi possivel encontrar a URL da API da API EUIPO via ENV. env value: ${url}`;
      }

      if (!isValidString(clientId)) {
        throw `Nao foi possivel encontrar o client ID da API da API EUIPO via ENV. Env: ${clientId}`;
      }

      if (!isValidString(clientSecret)) {
        throw `Nao foi possivel encontrar o client secret da API da API EUIPO via ENV. Env: ${clientSecret}`;
      }

      if (!isValidString(scope)) {
        throw `Nao foi possivel encontrar o scope da API da API EUIPO via ENV. Env: ${scope}`;
      }

      const headers = {
        'X-IBM-Client-Id': clientId,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

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
        throw `Erro ao fazer requisicao para URL de autorizacao da API EUIPO. Status code: ${JSON.stringify(axiosResponse)}`;
      }

      return axiosResponse.data;
    } catch (error) {
      console.log(error);
      throw new ProviderException(
        'Erro ao fazer requisicao para URL de autorizacao da EUIPO',
        'EUIPO_AUTH_ERROR',
        error,
      );
    }
  }

  async get() {
    try {
      const idAPI = process.env.ID_API_EUIPO;
      const pv = process.env.PRIVATE_KEY_EUIPO;

      if (!isValidString(idAPI)) {
        throw `Nao foi possivel encontrar a ID da API da API EUIPO via ENV. Env: ${idAPI}`;
      }

      if (!isValidString(pv)) {
        throw `Nao foi possivel encontrar a ID da API da API EUIPO via ENV. Env: ${idAPI}`;
      }

      const raw = await this.apiTokenRepository.findByIdentifier(idAPI);

      if (!raw || (raw && raw.expires_in < new Date())) {
        const result = await this.makeRequest();

        const acessToken = this.encryptProvider.encrypt(result.access_token, pv);
        const idToken = this.encryptProvider.encrypt(result.id_token, pv);
        const refreshToken = this.encryptProvider.encrypt(result.refresh_token, pv);

        const expiresIn = new Date(new Date().getTime() + 30 * 60 * 1000);

        if (!raw) {
          await this.apiTokenRepository.create({
            api_identifier: idAPI,
            hash_acess_token: acessToken.hash,
            hash_id_token: idToken.hash,
            expires_in: expiresIn,
            hash_refresh_token: refreshToken.hash,
            active: true,
            salt: '',
          });
        } else {
          await this.apiTokenRepository.update(raw.id, {
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
        };
      }

      const acessToken = this.encryptProvider.decrypt(raw.hash_acess_token, pv);
      const idToken = this.encryptProvider.decrypt(raw.hash_id_token, pv);
      const refreshToken = this.encryptProvider.decrypt(raw.hash_refresh_token, pv);

      return {
        access_token: acessToken,
        token_id: idToken,
        refresh_token: refreshToken,
        expires_in: raw.expires_in,
      };
    } catch (error) {
      throw new ProviderException(
        'Erro ao gerar a API token da API EUIPO',
        'EUIPO_TOKEN_ERROR',
        error,
      );
    }
  }
}
