import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsPositive,
  ValidateNested,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EDiscountType } from '../../domain/enums/discount-type.enum';
import { ECouponScope } from '../../domain/enums/coupon-scope.enum';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

export class ProductOverrideDTO {
  @ApiProperty({ example: 'prod_abc123', description: 'ID do produto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ enum: EDiscountType, example: EDiscountType.FIXED_AMOUNT })
  @IsEnum(EDiscountType)
  discountType: EDiscountType;

  @ApiProperty({
    example: 4000,
    description: 'Percentual (0-100) ou valor em centavos. Deve ser > 0.',
  })
  @IsNumber()
  @Min(1)
  discountValue: number;
}

export class CreateCouponDTO {
  @ApiProperty({ example: 'PROMO10', description: 'Código único do cupom (convertido para maiúsculas)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).toUpperCase().trim())
  code: string;

  @ApiProperty({ example: '10% de desconto em todos os produtos' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Válido até o final do mês' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: EDiscountType, example: EDiscountType.PERCENTAGE })
  @IsEnum(EDiscountType)
  discountType: EDiscountType;

  @ApiProperty({ example: 10, description: 'Percentual (0-100) ou valor em centavos' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ enum: ECouponScope, example: ECouponScope.ORDER })
  @IsEnum(ECouponScope)
  scope: ECouponScope;

  @ApiPropertyOptional({ type: [String], example: ['prod_abc123'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @ApiPropertyOptional({ type: [String], example: ['cat_abc123'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ enum: ECouponAppliesTo, example: ECouponAppliesTo.BOTH })
  @IsEnum(ECouponAppliesTo)
  appliesTo: ECouponAppliesTo;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  cumulative?: boolean;

  @ApiPropertyOptional({ example: 5000, description: 'Valor mínimo do pedido em centavos' })
  @IsInt()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Desconto máximo em centavos' })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Máximo de resgates (null = ilimitado)' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  maxRedemptions?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsISO8601()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    type: [ProductOverrideDTO],
    description:
      'Descontos específicos por produto. Válido apenas quando scope="product". ' +
      'Cada productId deve estar presente em productIds. ' +
      'O discountValue global serve como fallback para produtos sem override.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOverrideDTO)
  @ArrayMaxSize(50)
  @IsOptional()
  productOverrides?: ProductOverrideDTO[];
}
