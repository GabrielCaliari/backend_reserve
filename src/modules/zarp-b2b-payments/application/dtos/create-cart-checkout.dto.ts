import { IsString, IsNotEmpty, IsEmail, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CartItemDTO {
  @ApiProperty({ example: 'cm5abc123', description: 'ID do produto B2B' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1, description: 'Quantidade', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateCartCheckoutDTO {
  @ApiProperty({
    type: [CartItemDTO],
    description: 'Lista de produtos e quantidades',
    example: [
      { productId: 'cm5abc123', quantity: 1 },
      { productId: 'cm5xyz789', quantity: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDTO)
  items: CartItemDTO[];

  @ApiProperty({ example: 'João Silva', description: 'Nome completo do lead' })
  @IsString()
  @IsNotEmpty()
  leadName: string;

  @ApiProperty({ example: 'joao@email.com', description: 'Email do lead' })
  @IsEmail()
  @IsNotEmpty()
  leadEmail: string;

  @ApiProperty({ example: '+5511999999999', description: 'Telefone do lead (formato E.164)' })
  @IsString()
  @IsNotEmpty()
  leadPhone: string;
}
