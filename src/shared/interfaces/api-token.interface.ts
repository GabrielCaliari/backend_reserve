import { IAPITokenCreate, IAPITokenCreateReturn, IAPITokenGet } from '@/modules/zarp-brands/domain/interfaces/api-token.repository.interface';

export interface IAPIToken {
  create?(data: IAPITokenCreate): Promise<IAPITokenCreateReturn>;
  get(): Promise<IAPITokenGet>;
}
