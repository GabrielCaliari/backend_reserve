export interface IAuthenticateUser {
    email: string;
    password: string;
}

export interface IValidateUserToken {
    session_id: number;
    token: string;
}