export enum ESMTPProvider {
    smtp = 1,
    amazon = 2
}

export interface ICreateSmtpServer {
    name: string;
    email: string;
    host?: string;
    port?: string;
    domain: string;
    username?: string;
    hash_password?: string;
    hash_access_token?: string;
    hash_private_token?: string;
    region?: string;
    provider: ESMTPProvider;
    default?: boolean;
}
