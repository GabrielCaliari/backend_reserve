export class B2BProductEntity {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly stripeProductId: string,
    public readonly stripePriceId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly categories: string[],
    public readonly price: number, // cents
    public readonly currency: string,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Fee overrides — null = herda da categoria ou taxa global do tenant
    public readonly categoryId: string | null = null,
    public readonly chipCostOverride: number | null = null,
    public readonly shippingFeeOverride: number | null = null,
    public readonly requiresShipping: boolean = false,
    public readonly slug: string = '',
  ) {}

  isActive(): boolean {
    return this.active;
  }
}
