import { Injectable, Inject } from '@nestjs/common';
import {
  IB2BProductRepository,
  B2B_PRODUCT_REPOSITORY,
} from '../../domain/interfaces/b2b-product.repository.interface';
import { B2BProductEntity } from '../../domain/entities/b2b-product.entity';

@Injectable()
export class ListB2BProductsUseCase {
  constructor(
    @Inject(B2B_PRODUCT_REPOSITORY)
    private readonly productRepo: IB2BProductRepository,
  ) {}

  async execute(tenantId: string): Promise<B2BProductEntity[]> {
    return this.productRepo.findAllByTenant(tenantId);
  }
}
