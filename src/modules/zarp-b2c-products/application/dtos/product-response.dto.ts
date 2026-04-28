export class ProductPriceResponseDTO {
  id: string;
  stripePriceId: string;
  interval: string;
  intervalCount: number;
  unitAmount: number;
  currency: string;
}

export class ProductResponseDTO {
  id: string;
  stripeProductId: string;
  name: string;
  description?: string;
  slug: string;
  active: boolean;
  prices: ProductPriceResponseDTO[];
  createdAt: Date;
  updatedAt: Date;
}
