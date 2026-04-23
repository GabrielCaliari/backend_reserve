import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  IsEnum,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EBillingInterval, EBillingCollectionMode } from '../../domain/enums/billing-interval.enum';

// ─── Create ──────────────────────────────────────────────────────────────────

export class CreateTenantBillingConfigDTO {
  @ApiPropertyOptional({
    description: 'Stripe publishable key for this tenant (pk_live_... or pk_test_...)',
    example: 'pk_live_51...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripePublishableKey?: string;

  @ApiPropertyOptional({
    description: 'Stripe secret key for this tenant (sk_live_... or sk_test_...). Stored encrypted.',
    example: 'sk_live_51...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripeSecretKey?: string;

  @ApiPropertyOptional({
    description: 'Stripe webhook signing secret (whsec_...). Stored encrypted.',
    example: 'whsec_...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripeWebhookSecret?: string;

  @ApiPropertyOptional({
    description: 'Map of billing interval → Stripe Price ID. Allows different prices per period.',
    example: {
      monthly: 'price_1ABC',
      quarterly: 'price_1DEF',
      semiannual: 'price_1GHI',
      annual: 'price_1JKL',
    },
  })
  @IsOptional()
  @IsObject()
  stripePriceIds?: Record<string, string>;

  @ApiProperty({
    description: 'Default billing interval for this tenant',
    enum: EBillingInterval,
    example: EBillingInterval.MONTHLY,
  })
  @IsEnum(EBillingInterval)
  billingInterval: EBillingInterval;

  @ApiProperty({
    description:
      'How the billing is collected. "upfront" = full period charged at once. "installments" = monthly installments with discount.',
    enum: EBillingCollectionMode,
    example: EBillingCollectionMode.UPFRONT,
  })
  @IsEnum(EBillingCollectionMode)
  billingCollectionMode: EBillingCollectionMode;

  @ApiPropertyOptional({ description: 'Enable trial period', example: true })
  @IsOptional()
  @IsBoolean()
  trialEnabled?: boolean = false;

  @ApiPropertyOptional({ description: 'Trial duration in days', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  trialDays?: number = 7;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', example: 'brl' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'brl';

  @ApiPropertyOptional({ description: 'Plan display name', example: 'Plano Profissional' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  planName?: string;

  @ApiPropertyOptional({ description: 'Plan description shown in the panel', example: 'Acesso completo à plataforma' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  planDescription?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata for panel rendering (feature flags, UI hints, etc.)',
    example: { showAnnualToggle: true, highlightPlan: 'annual' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ─── Update ──────────────────────────────────────────────────────────────────

export class UpdateTenantBillingConfigDTO {
  @ApiPropertyOptional({ example: 'pk_live_51...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripePublishableKey?: string;

  @ApiPropertyOptional({ example: 'sk_live_51...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripeSecretKey?: string;

  @ApiPropertyOptional({ example: 'whsec_...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripeWebhookSecret?: string;

  @ApiPropertyOptional({
    example: { monthly: 'price_1ABC', annual: 'price_1JKL' },
  })
  @IsOptional()
  @IsObject()
  stripePriceIds?: Record<string, string>;

  @ApiPropertyOptional({ enum: EBillingInterval })
  @IsOptional()
  @IsEnum(EBillingInterval)
  billingInterval?: EBillingInterval;

  @ApiPropertyOptional({ enum: EBillingCollectionMode })
  @IsOptional()
  @IsEnum(EBillingCollectionMode)
  billingCollectionMode?: EBillingCollectionMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trialEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  trialDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  planName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  planDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export class TenantBillingConfigResponseDTO {
  @ApiProperty({ example: 'cma1abc...' })
  id: string;

  @ApiProperty({ example: 'cma1tenant...' })
  tenantId: string;

  @ApiProperty({
    description: 'Stripe publishable key (safe to expose to frontend)',
    example: 'pk_live_51...',
    nullable: true,
  })
  stripePublishableKey: string | null;

  @ApiProperty({
    description: 'Whether a Stripe secret key is configured (value is never returned)',
    example: true,
  })
  hasStripeSecretKey: boolean;

  @ApiProperty({
    description: 'Whether a Stripe webhook secret is configured (value is never returned)',
    example: true,
  })
  hasStripeWebhookSecret: boolean;

  @ApiProperty({
    description: 'Stripe Price IDs per interval',
    example: { monthly: 'price_1ABC', annual: 'price_1JKL' },
    nullable: true,
  })
  stripePriceIds: Record<string, string> | null;

  @ApiProperty({ enum: EBillingInterval, example: EBillingInterval.MONTHLY })
  billingInterval: EBillingInterval;

  @ApiProperty({ enum: EBillingCollectionMode, example: EBillingCollectionMode.UPFRONT })
  billingCollectionMode: EBillingCollectionMode;

  @ApiProperty({ example: false })
  trialEnabled: boolean;

  @ApiProperty({ example: 7 })
  trialDays: number;

  @ApiProperty({ example: 'brl' })
  currency: string;

  @ApiProperty({ example: 'Plano Profissional', nullable: true })
  planName: string | null;

  @ApiProperty({ example: 'Acesso completo à plataforma', nullable: true })
  planDescription: string | null;

  @ApiProperty({ nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
