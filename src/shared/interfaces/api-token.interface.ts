import { IAPITokenCreate, IAPITokenCreateReturn, IAPITokenGet } from '../../modules/reserve-brands/domain/interfaces/api-token.repository.interface';

export interface IAPIToken {
  create?(data: IAPITokenCreate): Promise<IAPITokenCreateReturn>;
  get(): Promise<IAPITokenGet>;
}
