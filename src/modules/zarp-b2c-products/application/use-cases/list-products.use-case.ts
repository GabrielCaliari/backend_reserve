import { Injectable, Inject } from '@nestjs/common';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../domain/interfaces/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(tenantId: string): Promise<ProductEntity[]> {
    return this.productRepository.findAllActive(tenantId);
  }
}
