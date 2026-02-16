import { EAdminRole } from '@/modules/zarp-auth/domain/enums/admin-role.enum';

export interface ICreateAdmin {
    name: string;
    email: string;
    password: string;
    role?: EAdminRole;
}

export interface IAdminRepository {
    create(data: ICreateAdmin): Promise<any>;
    selectById(id: number): Promise<any>;
    selectByEmail(email: string): Promise<any>;
    selectByIdWithTenants(id: number): Promise<any>;
    selectAll(): Promise<any[]>;
    updateRole(id: number, role: EAdminRole): Promise<any>;
    deactivate(id: number): Promise<any>;
}

export const ADMIN_REPOSITORY = Symbol('ADMIN_REPOSITORY');

export interface IAdminCredentialRepository {
    compareHashByAdminId(value: string, adminId: number): Promise<boolean>;
}

export const ADMIN_CREDENTIAL_REPOSITORY = Symbol('ADMIN_CREDENTIAL_REPOSITORY');

export interface ICreateAdminSessionToken {
    password: string;
    admin_id: number;
    payload: {};
}

export interface IAdminSessionTokenRepository {
    create(data: ICreateAdminSessionToken): Promise<any>;
    validateToken(sessionId: number, token: string): Promise<false | { admin_id: number }>;
}

export const ADMIN_SESSION_TOKEN_REPOSITORY = Symbol('ADMIN_SESSION_TOKEN_REPOSITORY');
