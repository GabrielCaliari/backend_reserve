export default class IAuthAdminValidator {
    email: string;
    password: string;
}

export interface IValidateAdminToken {
    'session-id': number;
    token: string;
}