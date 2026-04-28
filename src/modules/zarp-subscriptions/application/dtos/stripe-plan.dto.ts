import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsIn,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Billing interval mapping ─────────────────────────────────────────────────
// 1 = weekly | 2 = monthly | 3 = quarterly (3 months) | 4 = annual
export const BILLING_INTERVAL_MAP: Record<
  number,
  { interval: 'day' | 'week' | 'month' | 'year'; intervalCount: number }
> = {
  1: { interval: 'week', intervalCount: 1 },
  2: { interval: 'month', intervalCount: 1 },
  3: { interval: 'month', intervalCount: 3 },
  4: { interval: 'year', intervalCount: 1 },
};

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreateStripePlanDTO {
  @ApiProperty({ example: 'cm9abc123xyz', description: 'Tenant ID — used to resolve the Stripe secret key from billing config' })
  @IsNotEmpty()
  @IsString()
  tenant_id: string;

  @ApiProperty({ example: 'basico', description: 'Unique slug for the plan' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens only' })
  slug: string;

  @ApiProperty({ example: 'Plano Básico' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  plan_name: string;

  @ApiPropertyOptional({ example: 'Ideal para pequenas empresas' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 9990,
    description: 'Price in cents (e.g. 9990 = R$ 99,90)',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @Min(0)
  unit_amount: number;

  @ApiProperty({ example: 'brl', enum: ['brl', 'usd'] })
  @IsNotEmpty()
  @IsIn(['brl', 'usd'])
  currency: string;

  @ApiProperty({
    example: 2,
    description: '1=weekly | 2=monthly | 3=quarterly | 4=annual',
    enum: [1, 2, 3, 4],
  })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsIn([1, 2, 3, 4])
  billing_interval: number;

  @ApiProperty({ example: 100, description: 'Credits released per billing cycle' })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @Min(0)
  released_credits: number;

  @ApiPropertyOptional({ example: 20, description: 'Credits released during trial period' })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  credits_released_trial_period?: number;

  @ApiPropertyOptional({ example: 7, description: 'Trial period in days (0 = no trial)' })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  trial_days?: number;

  @ApiPropertyOptional({ example: 3, description: 'Maximum number of guest users' })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  guest_limit?: number;
}

// ─── Update (metadata only — Stripe IDs are immutable) ───────────────────────

export class UpdateStripePlanDTO {
  @ApiPropertyOptional({ example: 'Plano Básico Plus' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  plan_name?: string;

  @ApiPropertyOptional({ example: 'Descrição atualizada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  released_credits?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  credits_released_trial_period?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  guest_limit?: number;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  trial_days?: number;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export class StripePlanResponseDTO {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() plan_name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() stripe_product_id: string;
  @ApiProperty() stripe_price_id: string;
  @ApiPropertyOptional() stripe_trial_price_id?: string;
  @ApiProperty() billing_interval: number;
  @ApiProperty() unit_amount: number;
  @ApiProperty() currency: string;
  @ApiProperty() released_credits: number;
  @ApiProperty() credits_released_trial_period: number;
  @ApiProperty() guest_limit: number;
  @ApiProperty() trial_days: number;
  @ApiProperty() active: boolean;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}
