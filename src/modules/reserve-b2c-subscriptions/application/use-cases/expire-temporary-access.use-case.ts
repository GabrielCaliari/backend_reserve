import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IUserProductAccessRepository,
  USER_PRODUCT_ACCESS_REPOSITORY,
} from '../../domain/interfaces/user-product-access.repository.interface';

@Injectable()
export class ExpireTemporaryAccessUseCase {
  private readonly logger = new Logger(ExpireTemporaryAccessUseCase.name);

  constructor(
    @Inject(USER_PRODUCT_ACCESS_REPOSITORY)
    private readonly accessRepo: IUserProductAccessRepository,
  ) {}

  async execute(): Promise<void> {
    const now = new Date();
    const expiredAccesses = await this.accessRepo.findExpiredAccess(now);

    for (const access of expiredAccesses) {
      await this.accessRepo.update(access.id, {
        status: 'expired',
      });

      this.logger.log(`Expired temporary access for user ${access.user_id}, product ${access.product_id}`);
    }

    this.logger.log(`Expired ${expiredAccesses.length} temporary accesses`);
  }
}
