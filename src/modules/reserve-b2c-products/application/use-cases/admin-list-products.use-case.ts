import { Injectable, Inject } from '@nestjs/common';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../domain/interfaces/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';

@Injectable()
export class AdminListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository,
  ) {}

  async execute(tenantId: string): Promise<ProductEntity[]> {
    return this.productRepo.findAll(tenantId);
  }
}
