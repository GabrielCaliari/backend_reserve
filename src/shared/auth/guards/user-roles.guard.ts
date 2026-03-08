import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EUserCollectionRole } from '../../../modules/zarp-auth/domain/enums/user-collection-role.enum';
import {
  IUserCollectionMembershipRepository,
  USER_COLLECTION_MEMBERSHIP_REPOSITORY,
} from '../../../modules/zarp-auth/domain/interfaces/user-collection-membership.repository.interface';
import { USER_ROLES_KEY } from '../decorators/user-roles.decorator';

const USER_ROLE_HIERARCHY: EUserCollectionRole[] = [
  EUserCollectionRole.guest,
  EUserCollectionRole.member,
  EUserCollectionRole.operator,
];

@Injectable()
export class UserRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_COLLECTION_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IUserCollectionMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<EUserCollectionRole[]>(USER_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId: string = request.user_id;
    const tenantId: string | undefined = request.tenant_id;
    const collectionId = this.resolveCollectionId(request);

    if (!userId) {
      throw new ForbiddenException('User identity not found in request');
    }

    if (!collectionId) {
      throw new BadRequestException('Collection ID is required (param, query, header x-collection-id, or body collection_id)');
    }

    const effectiveRole = await this.membershipRepository.findRoleInCollection(userId, collectionId, tenantId);

    if (!effectiveRole) {
      throw new ForbiddenException('You do not have a role in this collection');
    }

    const effectiveLevel = USER_ROLE_HIERARCHY.indexOf(effectiveRole);
    const hasPermission = requiredRoles.some((requiredRole) => {
      const requiredLevel = USER_ROLE_HIERARCHY.indexOf(requiredRole);
      return effectiveLevel >= requiredLevel;
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient user permissions for this operation');
    }

    request.collection_id = collectionId;
    request.user_role = effectiveRole;

    return true;
  }

  private resolveCollectionId(request: any): string | null {
    const paramId = request.params?.collectionId || request.params?.collection_id;
    if (paramId) {
      return String(paramId);
    }

    const queryId = request.query?.collectionId || request.query?.collection_id;
    if (queryId) {
      return String(queryId);
    }

    const headerId = request.headers?.['x-collection-id'];
    if (headerId) {
      return String(headerId);
    }

    const bodyId = request.body?.collection_id || request.body?.collectionId;
    if (bodyId) {
      return String(bodyId);
    }

    return null;
  }
}