export interface ICreateUser {
    email: string;
    name: string;
    password: string;
    phone_number: string;
    cpf: string;
}

export interface IUserFindInclude {
    Plan?: boolean;
    Subscription?: boolean;
}

export interface IUserRepository {
    create(data: ICreateUser): Promise<any>;
    selectById(id: number, include?: IUserFindInclude): Promise<any>;
    selectByEmail(email: string, include?: IUserFindInclude): Promise<any>;
    selectByCPF(cpf: string, include?: IUserFindInclude): Promise<any>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserCredentialRepository {
    compareHashByUserId(value: string, userId: number): Promise<boolean>;
}

export const USER_CREDENTIAL_REPOSITORY = Symbol('USER_CREDENTIAL_REPOSITORY');

export interface ICreateUserSessionToken {
    password: string;
    userId: number;
    payload: {};
}

export interface IUserSessionTokenRepository {
    create(data: ICreateUserSessionToken): Promise<any>;
    validateToken(sessionId: number, token: string): Promise<false | { userId: number }>;
}

export const USER_SESSION_TOKEN_REPOSITORY = Symbol('USER_SESSION_TOKEN_REPOSITORY');
