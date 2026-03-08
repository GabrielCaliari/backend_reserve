import { SetMetadata } from '@nestjs/common';
import { EUserCollectionRole } from '../../../modules/zarp-auth/domain/enums/user-collection-role.enum';

export const USER_ROLES_KEY = 'user_roles';

export const UserRoles = (...roles: EUserCollectionRole[]) => SetMetadata(USER_ROLES_KEY, roles);