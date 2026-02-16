import { ICreateAPIToken, IUpdateAPIToken } from '@/@types/@api-token';

export function isApiTokenDataValidToCreate(data: ICreateAPIToken): ICreateAPIToken {
  return { ...data };
}

export function isApiTokenDataValidToUpdate(data: IUpdateAPIToken): IUpdateAPIToken {
  return { ...data };
}
