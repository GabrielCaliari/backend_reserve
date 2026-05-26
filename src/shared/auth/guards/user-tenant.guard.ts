import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  IUserCollectionMembershipRepository,
  USER_COLLECTION_MEMBERSHIP_REPOSITORY,
} from '../../../modules/reserve-auth/domain/interfaces/user-collection-membership.repository.interface';

@Injectable()
export class UserTenantGuard implements CanActivate {
  constructor(
    @Inject(USER_COLLECTION_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IUserCollectionMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string = request.user_id;

    if (!userId) {
      throw new ForbiddenException('User identity not found in request');
    }

    const tenantId = this.resolveTenantId(request);

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required (param, header x-tenant-id, or body tenant_id)');
    }

    const hasAccess = await this.membershipRepository.hasTenantAccess(userId, tenantId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    request.tenant_id = tenantId;

    return true;
  }

  private resolveTenantId(request: any): string | null {
    const paramId = request.params?.tenantId || request.params?.tenant_id;
    if (paramId) {
      return String(paramId);
    }

    const headerId = request.headers?.['x-tenant-id'];
    if (headerId) {
      return String(headerId);
    }

    const bodyId = request.body?.tenant_id;
    if (bodyId) {
      return String(bodyId);
    }

    return null;
  }
}