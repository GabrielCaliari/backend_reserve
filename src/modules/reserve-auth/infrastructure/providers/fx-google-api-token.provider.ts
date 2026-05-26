import { Injectable } from '@nestjs/common';
import { IAPIToken } from '../../../../shared/interfaces/api-token.interface';
import { IAPITokenCreate } from '../../../reserve-brands/domain/interfaces/api-token.repository.interface';
import { RepositoryException } from '../../../../shared/exceptions';
import { EncryptProvider } from '../../../../shared/providers/encrypt.provider';
import { isValidString } from '../../../../shared/helpers/string.helper';
import APITokenRepository from '../../../reserve-brands/infrastructure/repositories/api-token.repository';

@Injectable()
export class FXGoogleAPITokenProvider implements IAPIToken {
  public constructor(
    private readonly apiTokenRepository: APITokenRepository,
    private readonly encryptProvider: EncryptProvider,
  ) {}

  async get() {
    return {
      access_token: 'access_token',
      id_token: 'id_token',
      refresh_token: 'refresh_token',
      token_type: 'token_type',
      expires_in: new Date(),
      scope: 'scope',
    };
  }

  async create(data: IAPITokenCreate) {
    try {
      const idAPI = process.env.ID_API_GOOGLE_FX;
      const pv = process.env.PRIVATE_KEY_GOOGLE_FX;

      if (!isValidString(idAPI)) {
        throw `Nao foi possivel encontrar a ID da API da API GOOGLE FX via ENV. Env: ${idAPI}`;
      }

      if (!isValidString(pv)) {
        throw `Nao foi possivel encontrar a ID da API da API GOOGLE FX via ENV. Env: ${idAPI}`;
      }

      const raw = await this.apiTokenRepository.findByIdentifier(idAPI);

      if (!raw || (raw && raw.expires_in < new Date())) {
        const acessToken = this.encryptProvider.encrypt(data.acess_token, pv);
        const idToken = this.encryptProvider.encrypt(data.id_token, pv);
        const refreshToken = this.encryptProvider.encrypt(data.refresh_token, pv);

        const expiresIn = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
        let idRaw: string | undefined = raw?.id;

        if (!raw) {
          const APITokenCreation = await this.apiTokenRepository.create({
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
          id: idRaw,
          access_token: data.acess_token,
          token_id: data.id_token,
          refresh_token: data.refresh_token,
          expires_in: expiresIn,
        };
      }
    } catch (error) {
      throw new RepositoryException(
        'Erro ao criar um registro de API token',
        'FX_GOOGLE_TOKEN_ERROR',
        error,
      );
    }
  }
}
