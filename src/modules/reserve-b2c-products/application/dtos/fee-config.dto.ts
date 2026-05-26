import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
  MaxLength,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Taxa Global do Tenant ────────────────────────────────────────────────────

export class UpsertFeeConfigDTO {
  @ApiProperty({
    example: 2.5,
    description: 'Chip cost percentual global (ex: 2.5 = 2.5% sobre o preço do produto). Aplicado a todos os produtos sem override.',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  chipCostPercent: number;

  @ApiProperty({
    example: 1500,
    description: 'Frete fixo global em centavos (ex: 1500 = R$15,00). Aplicado a produtos físicos sem override.',
  })
  @IsInt()
  @Min(0)
  shippingFee: number;
}

// ─── Categorias de Produto ────────────────────────────────────────────────────

export class CreateProductCategoryDTO {
  @ApiProperty({ example: 'Books', description: 'Nome da categoria' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'books',
    description: 'Slug único da categoria (letras minúsculas, números e hífens)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug: string;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Chip cost % para esta categoria. null = herda da taxa global do tenant.',
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  chipCostPercent?: number | null;

  @ApiPropertyOptional({
    example: 1500,
    description: 'Frete fixo em centavos para esta categoria. null = herda da taxa global.',
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  shippingFee?: number | null;
}

export class UpdateProductCategoryDTO {
  @ApiPropertyOptional({ example: 'Books' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 2.5, nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  chipCostPercent?: number | null;

  @ApiPropertyOptional({ example: 1500, nullable: true })
  @IsInt()
  @IsOptional()
  @Min(0)
  shippingFee?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

// ─── Override por Produto ─────────────────────────────────────────────────────

export class UpdateProductFeesDTO {
  @ApiPropertyOptional({
    example: 'cat_abc123',
    description: 'ID da categoria do produto. null = sem categoria (usa taxa global).',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({
    example: 3.0,
    description: 'Override de chip cost % para este produto específico. null = remove override (herda da categoria/global).',
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  chipCostOverride?: number | null;

  @ApiPropertyOptional({
    example: 2000,
    description: 'Override de frete em centavos para este produto. null = remove override.',
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  shippingFeeOverride?: number | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Se o produto é físico e requer envio (books, tabs).',
  })
  @IsBoolean()
  @IsOptional()
  requiresShipping?: boolean;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export class OrderCostBreakdownResponseDTO {
  @ApiProperty({ example: 6500, description: 'Preço base em centavos' })
  basePrice: number;

  @ApiProperty({ example: 162, description: 'Valor do chip cost em centavos (basePrice × chipCostPercent%)' })
  chipCostAmount: number;

  @ApiProperty({ example: 1500, description: 'Frete em centavos (fixo por pedido, 0 para digitais)' })
  shippingFee: number;

  @ApiProperty({ example: 8162, description: 'Total final em centavos' })
  total: number;

  @ApiProperty({ example: 'brl' })
  currency: string;

  @ApiProperty({ example: 2.5, description: 'Percentual de chip cost aplicado' })
  chipCostPercent: number;

  @ApiProperty({ example: 'category', enum: ['product', 'category', 'global', 'none'] })
  chipCostSource: string;

  @ApiProperty({ example: 'global', enum: ['product', 'category', 'global', 'none'] })
  shippingFeeSource: string;

  @ApiProperty({ example: true })
  requiresShipping: boolean;
}
