import { IAPITokenGet } from "src/@types/@api-token";

export interface IAPIToken {
    get(): Promise<IAPITokenGet>;
}