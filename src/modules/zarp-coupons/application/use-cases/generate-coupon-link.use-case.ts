import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IDiscountCouponRepository,
  DISCOUNT_COUPON_REPOSITORY,
} from '../../domain/interfaces/discount-coupon.repository.interface';

export interface CouponLinkResult {
  link: string;
  code: string;
}

@Injectable()
export class GenerateCouponLinkUseCase {
  constructor(
    @Inject(DISCOUNT_COUPON_REPOSITORY)
    private readonly couponRepo: IDiscountCouponRepository,
  ) {}

  async execute(
    id: string,
    tenantId: string,
    baseUrl?: string,
  ): Promise<CouponLinkResult> {
    const coupon = await this.couponRepo.findById(id, tenantId);
    if (!coupon) throw new NotFoundException('Cupom não encontrado');

    const resolvedBase = this.resolveBaseUrl(baseUrl);
    const url = new URL(resolvedBase);
    url.searchParams.set('code', coupon.code);

    return {
      link: url.toString(),
      code: coupon.code,
    };
  }

  private resolveBaseUrl(baseUrl?: string): string {
    if (baseUrl) return baseUrl;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return frontendUrl;
  }
}
