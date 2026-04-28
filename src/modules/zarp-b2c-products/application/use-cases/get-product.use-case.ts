import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../domain/interfaces/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(slug: string): Promise<ProductEntity> {
    const product = await this.productRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return product;
  }
}
