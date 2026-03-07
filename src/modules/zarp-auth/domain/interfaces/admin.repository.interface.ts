import { EAdminRole } from '../enums/admin-role.enum';

export interface ICreateAdmin {
    name: string;
    email: string;
    password: string;
    role?: EAdminRole;
}

export interface IAdminRepository {
    create(data: ICreateAdmin): Promise<any>;
    selectById(id: string): Promise<any>;
    selectByEmail(email: string): Promise<any>;
    selectByIdWithTenants(id: string): Promise<any>;
    selectAll(): Promise<any[]>;
    updateRole(id: string, role: EAdminRole): Promise<any>;
    update(id: string, data: { name?: string; email?: string }): Promise<any>;
    deactivate(id: string): Promise<any>;
    activate(id: string): Promise<any>;
    delete(id: string): Promise<any>;
}

export const ADMIN_REPOSITORY = Symbol('ADMIN_REPOSITORY');

export interface IAdminCredentialRepository {
    compareHashByAdminId(value: string, adminId: string): Promise<boolean>;
}

export const ADMIN_CREDENTIAL_REPOSITORY = Symbol('ADMIN_CREDENTIAL_REPOSITORY');

export interface ICreateAdminSessionToken {
    password: string;
    admin_id: string;
    payload: {};
}

export interface IAdminSessionTokenRepository {
    create(data: ICreateAdminSessionToken): Promise<any>;
    validateToken(sessionId: string, token: string): Promise<false | { admin_id: string }>;
}

export const ADMIN_SESSION_TOKEN_REPOSITORY = Symbol('ADMIN_SESSION_TOKEN_REPOSITORY');
