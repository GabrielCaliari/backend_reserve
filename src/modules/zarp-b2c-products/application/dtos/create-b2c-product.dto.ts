import { IsString, IsNotEmpty, IsOptional, IsInt, IsPositive, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateB2CProductDTO {
  @ApiProperty({ example: 'Curso de JavaScript' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Do zero ao avançado' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'javascript-avancado', description: 'Unique slug for the product' })
  @IsString()
  @IsNotEmpty()
  slug: string;

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

  @ApiProperty({ example: 'brl' })
  @IsString()
  @IsOptional()
  currency?: string;
}
