import { Injectable, Inject } from '@nestjs/common';
import {
  IB2BPurchaseRepository,
  B2B_PURCHASE_REPOSITORY,
  ListB2BPurchasesFilter,
} from '../../domain/interfaces/b2b-purchase.repository.interface';
import { B2BPurchaseEntity } from '../../domain/entities/b2b-purchase.entity';

@Injectable()
export class ListPurchasesUseCase {
  constructor(
    @Inject(B2B_PURCHASE_REPOSITORY)
    private readonly purchaseRepo: IB2BPurchaseRepository,
  ) {}

  async execute(
    tenantId: string,
    filter: ListB2BPurchasesFilter,
  ): Promise<{ data: B2BPurchaseEntity[]; total: number }> {
    return this.purchaseRepo.findAllByTenant(tenantId, filter);
  }
}
