import { IAPITokenCreate, IAPITokenCreateReturn, IAPITokenGet } from '@/@types/@api-token';

export interface IAPIToken {
  create?(data: IAPITokenCreate): Promise<IAPITokenCreateReturn>;
  get(): Promise<IAPITokenGet>;
}
