export interface IAuthenticateUser {
    email: string;
    password: string;
}

export interface IValidateUserToken {
    'session-id': string;
    token: string;
}
