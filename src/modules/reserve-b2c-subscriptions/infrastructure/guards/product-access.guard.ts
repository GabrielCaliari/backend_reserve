import { Injectable, CanActivate, ExecutionContext, Inject, ForbiddenException } from '@nestjs/common';
import {
  IUserProductAccessRepository,
  USER_PRODUCT_ACCESS_REPOSITORY,
} from '../../domain/interfaces/user-product-access.repository.interface';

@Injectable()
export class ProductAccessGuard implements CanActivate {
  constructor(
    @Inject(USER_PRODUCT_ACCESS_REPOSITORY)
    private readonly accessRepo: IUserProductAccessRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const productSlug = request.params?.slug;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!productSlug) {
      throw new ForbiddenException('Product slug not provided');
    }

    const hasAccess = await this.accessRepo.hasActiveAccess(userId, productSlug);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this product');
    }

    return true;
  }
}
