import { EUserCollectionRole } from '../enums/user-collection-role.enum';

export interface IAssignUserCollectionMembership {
  user_id: string;
  collection_id: string;
  role?: EUserCollectionRole;
}

export interface IUserCollectionMembershipRepository {
  assign(data: IAssignUserCollectionMembership): Promise<any>;
  remove(userId: string, collectionId: string): Promise<void>;
  updateRole(userId: string, collectionId: string, role: EUserCollectionRole): Promise<any>;
  findMembership(userId: string, collectionId: string, tenantId?: string): Promise<any>;
  findCollectionsByUserId(userId: string, tenantId?: string): Promise<any[]>;
  findUsersByCollectionId(collectionId: string): Promise<any[]>;
  hasTenantAccess(userId: string, tenantId: string): Promise<boolean>;
  findRoleInCollection(userId: string, collectionId: string, tenantId?: string): Promise<EUserCollectionRole | null>;
}

export const USER_COLLECTION_MEMBERSHIP_REPOSITORY = Symbol('USER_COLLECTION_MEMBERSHIP_REPOSITORY');