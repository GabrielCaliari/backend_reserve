import { ICreateAPIToken, IUpdateAPIToken } from '@/modules/zarp-brands/domain/interfaces/api-token.repository.interface';

export function isApiTokenDataValidToCreate(data: ICreateAPIToken): ICreateAPIToken {
  return { ...data };
}

export function isApiTokenDataValidToUpdate(data: IUpdateAPIToken): IUpdateAPIToken {
  return { ...data };
}
