import { Injectable, Inject } from '@nestjs/common';
import {
  IUserProductAccessRepository,
  USER_PRODUCT_ACCESS_REPOSITORY,
} from '../../domain/interfaces/user-product-access.repository.interface';
import { UserProductAccess } from '../../domain/entities/user-product-access.entity';

@Injectable()
export class ListMySubscriptionsUseCase {
  constructor(
    @Inject(USER_PRODUCT_ACCESS_REPOSITORY)
    private readonly accessRepo: IUserProductAccessRepository,
  ) {}

  async execute(userId: string): Promise<UserProductAccess[]> {
    return this.accessRepo.findByUserId(userId);
  }
}

