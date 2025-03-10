export interface ICreateAPIToken {
    api_identifier: string;
    hash_id_token: string;
    hash_acess_token: string;
    hash_refresh_token: string;
    salt: string;
    expires_in: Date;
    active?: boolean;
}

export interface IUpdateAPIToken {
    hash_id_token?: string;
    hash_acess_token?: string;
    hash_refresh_token?: string;
    salt?: string;
    expires_in?: Date;
    active?: boolean;
}

export interface IAPITokenGet {
    refresh_token?: string;
    token_id?: string;
    expires_in?: Date;
    access_token: string;
}