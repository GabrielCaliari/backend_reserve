import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnifiedCartItemDTO {
  @ApiProperty({ example: 'prod_abc123', description: 'ID do produto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'b2b', enum: ['b2b', 'b2c'], description: 'Tipo do produto' })
  @IsString()
  @IsIn(['b2b', 'b2c'])
  type: 'b2b' | 'b2c';

  @ApiPropertyOptional({
    example: 'price_xyz',
    description: 'ID do preço B2C (obrigatório para type=b2c)',
  })
  @IsString()
  @IsOptional()
  priceId?: string;

  @ApiProperty({ example: 1, description: 'Quantidade' })
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class UnifiedCheckoutDTO {
  @ApiProperty({ type: [UnifiedCartItemDTO] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UnifiedCartItemDTO)
  items: UnifiedCartItemDTO[];

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsString()
  @IsOptional()
  leadName?: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail()
  @IsOptional()
  leadEmail?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsString()
  @IsOptional()
  leadPhone?: string;
}

export class UnifiedCalculateCostDTO {
  @ApiProperty({ type: [UnifiedCartItemDTO] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UnifiedCartItemDTO)
  items: UnifiedCartItemDTO[];
}

export class UnifiedCartItemCostDTO {
  productId: string;
  name: string;
  type: 'b2b' | 'b2c';
  quantity: number;
  basePrice: number;
  chipCostAmount: number;
  chipCostPercent: number;
  subtotal: number;
  currency: string;
  requiresShipping: boolean;
}

export class UnifiedCartCostResponseDTO {
  items: UnifiedCartItemCostDTO[];
  totalBasePrice: number;
  totalChipCost: number;
  shippingFee: number;
  total: number;
  currency: string;
}
