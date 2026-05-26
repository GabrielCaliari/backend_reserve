import { IsString, IsNotEmpty, IsOptional, IsInt, IsPositive, IsIn, Matches, MaxLength, IsArray, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SUPPORTED_CURRENCIES = ['brl', 'usd', 'eur', 'gbp', 'cad', 'aud', 'mxn', 'ars', 'cop', 'clp'] as const;

export class CreateB2CProductDTO {
  @ApiProperty({ example: 'Curso de JavaScript' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name: string;

  @ApiPropertyOptional({ example: 'Do zero ao avançado' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'javascript-avancado', description: 'Unique slug for the product (lowercase letters, numbers, and hyphens only)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @ApiPropertyOptional({ example: ['programação', 'javascript', 'frontend'], description: 'Product categories for filtering' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  categories?: string[];

  @ApiProperty({ example: 'month', enum: ['month', 'year', 'week', 'quarter'] })
  @IsString()
  @IsIn(['month', 'year', 'week', 'quarter'])
  interval: 'month' | 'year' | 'week' | 'quarter';

  @ApiProperty({ example: 1, description: 'Interval count (e.g. 3 for quarterly)' })
  @IsInt()
  @IsPositive()
  intervalCount: number;

  @ApiProperty({ example: 4990, description: 'Price in cents (e.g. 4990 = R$ 49,90)' })
  @IsInt()
  @IsPositive()
  unitAmount: number;

  @ApiProperty({ example: 'brl', enum: SUPPORTED_CURRENCIES })
  @IsString()
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES, { message: `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` })
  currency?: string;

  @ApiPropertyOptional({
    example: 200,
    description: 'Chip cost (taxa fixa) em centavos adicionada ao preço final (ex: 200 = R$2,00). Padrão: 0',
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  chipCost?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica se o produto é físico e requer envio pelos Correios (books, tabs). Padrão: false',
  })
  @IsBoolean()
  @IsOptional()
  requiresShipping?: boolean;
}
