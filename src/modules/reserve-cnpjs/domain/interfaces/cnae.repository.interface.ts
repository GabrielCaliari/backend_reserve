export interface ICnaeRepository {
    find(): Promise<any[]>;
}

export const CNAE_REPOSITORY = Symbol('CNAE_REPOSITORY');
