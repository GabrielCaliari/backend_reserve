import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  IsIn,
  IsArray,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateB2BProductDTO {
  @ApiProperty({ example: 'Florida Building Code 2023' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Edição completa do código de construção da Flórida' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'florida-building-code-2023',
    description: 'Slug único do produto (letras minúsculas, números e hífens)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug: string;

  @ApiPropertyOptional({
    example: ['livros', 'construção'],
    description: 'Categorias do produto para filtragem',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  categories?: string[];

  @ApiProperty({ example: 4990, description: 'Preço em centavos (ex: 4990 = R$49,90)' })
  @IsInt()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 'brl', enum: ['brl', 'usd', 'eur'] })
  @IsString()
  @IsIn(['brl', 'usd', 'eur'])
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Se o produto é físico e requer envio (books, tabs). Padrão: false',
  })
  @IsBoolean()
  @IsOptional()
  requiresShipping?: boolean;
}
