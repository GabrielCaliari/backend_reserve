import { IsString, IsUrl, IsOptional, IsInt, Min, IsObject } from 'class-validator';

export class CreateCheckoutSessionDTO {
  @IsString()
  tenantId: string;

  @IsString()
  priceId: string;

  @IsUrl({ require_tld: false })
  successUrl: string;

  @IsUrl({ require_tld: false })
  cancelUrl: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  trialPeriodDays?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
