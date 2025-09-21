import { ICreateAPIToken, IUpdateAPIToken } from "src/@types/@api-token";

export function isApiTokenDataValidToCreate(data: ICreateAPIToken): ICreateAPIToken {
    // TODO: ADICIONAR VALIDAÇÃO KKKKKK
    return {
        ...data
    }
}

export function isApiTokenDataValidToUpdate(data: IUpdateAPIToken): IUpdateAPIToken {
    // TODO: ADICIONAR VALIDAÇÃO KKKKKK
    return {
        ...data
    }
}