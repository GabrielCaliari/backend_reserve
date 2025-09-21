import { IAPITokenCreate, IAPITokenCreateReturn, IAPITokenGet } from "src/@types/@api-token";

export interface IAPIToken {
    create?(data: IAPITokenCreate): Promise<IAPITokenCreateReturn>;
    get(): Promise<IAPITokenGet>;
}