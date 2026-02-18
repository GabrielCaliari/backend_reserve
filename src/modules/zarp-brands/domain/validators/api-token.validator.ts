import { ICreateAPIToken, IUpdateAPIToken } from '../interfaces/api-token.repository.interface';

export function isApiTokenDataValidToCreate(data: ICreateAPIToken): ICreateAPIToken {
  return { ...data };
}

export function isApiTokenDataValidToUpdate(data: IUpdateAPIToken): IUpdateAPIToken {
  return { ...data };
}
