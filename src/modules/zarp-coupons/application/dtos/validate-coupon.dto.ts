import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponCartItemDTO {
  @ApiProperty({ example: 'prod_abc123' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ example: 'cat_xyz456' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 10000, description: 'Preço base em centavos (por unidade)' })
  @IsInt()
  @Min(1)
  basePrice: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: false, description: 'true se o item é uma assinatura recorrente (billing_mode unlimited ou limited)' })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    enum: ['b2b', 'b2c'],
    example: 'b2c',
    description: 'Tipo do item no carrinho. Usado para restringir cupons B2B-only ou B2C-only em carrinhos mistos.',
  })
  @IsIn(['b2b', 'b2c'])
  @IsOptional()
  itemType?: 'b2b' | 'b2c';
}

export class ValidateCouponDTO {
  @ApiProperty({ type: [String], example: ['PROMO10', 'FRETE20'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  codes: string[];

  @ApiProperty({ type: [ValidateCouponCartItemDTO] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateCouponCartItemDTO)
  cartItems: ValidateCouponCartItemDTO[];

  @ApiProperty({
    enum: ['b2b', 'b2c', 'unified'],
    example: 'b2c',
    description:
      "'b2b' = carrinho puro B2B; 'b2c' = carrinho puro B2C; " +
      "'unified' = carrinho misto (eligibilidade determinada pelo itemType de cada item)",
  })
  @IsEnum(['b2b', 'b2c', 'unified'])
  context: 'b2b' | 'b2c' | 'unified';
}
