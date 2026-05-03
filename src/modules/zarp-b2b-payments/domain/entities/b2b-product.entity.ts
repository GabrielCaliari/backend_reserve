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
  ) {}

  isActive(): boolean {
    return this.active;
  }
}
