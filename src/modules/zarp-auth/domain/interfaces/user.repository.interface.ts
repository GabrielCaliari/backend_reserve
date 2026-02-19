export interface IUserRepository {
  create(data: ICreateUser): Promise<any>;
  selectById(id: number, include?: IUserFindInclude): Promise<any>;
  selectByEmail(email: string, include?: IUserFindInclude): Promise<any>;
  selectByCPF(cpf: string, include?: IUserFindInclude): Promise<any>;
  findById(id: number): Promise<any>;
  findByEmail(email: string): Promise<any>;
  findAllPaginated(skip: number, limit: number): Promise<any[]>;
  count(): Promise<number>;
  update(id: number, data: any): Promise<any>;
  delete(id: number): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface ICreateUser {
  name: string;
  email: string;
  cpf: string;
  phone_number: string;
  password: string;
}

export interface IUserFindInclude {
  UserCredential?: boolean;
  Plan?: boolean;
  Subscription?: boolean;
}

export interface IUserCredentialRepository {
  compareHashByUserId(value: string, userId: number): Promise<boolean>;
}

export const USER_CREDENTIAL_REPOSITORY = Symbol('USER_CREDENTIAL_REPOSITORY');

export interface ICreateUserSessionToken {
  password: string;
  user_id: number;
  payload: {};
}

export interface IUserSessionTokenRepository {
  create(data: ICreateUserSessionToken): Promise<any>;
  validateToken(sessionId: number, token: string): Promise<false | { user_id: number }>;
}

export const USER_SESSION_TOKEN_REPOSITORY = Symbol('USER_SESSION_TOKEN_REPOSITORY');
