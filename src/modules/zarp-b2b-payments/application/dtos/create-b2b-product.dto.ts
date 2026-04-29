import { IsString, IsNotEmpty, IsOptional, IsInt, IsPositive, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateB2BProductDTO {
  @ApiProperty({ example: 'Consultoria Premium' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Consultoria especializada de 2 horas' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 500000, description: 'Price in cents (e.g. 500000 = R$ 5.000,00)' })
  @IsInt()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 'brl', enum: ['brl', 'usd', 'eur'] })
  @IsString()
  @IsIn(['brl', 'usd', 'eur'])
  @IsOptional()
  currency?: string;
}
