import { IsString, IsNotEmpty, IsEmail, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para criar checkout de produto B2B para lead (não autenticado).
 * Captura dados básicos do lead antes de redirecionar para Stripe.
 */
export class CreateLeadCheckoutDTO {
  @ApiProperty({ 
    example: 'cm5abc123',
    description: 'ID do produto B2B'
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ 
    example: 'João Silva',
    description: 'Nome completo do lead'
  })
  @IsString()
  @IsNotEmpty()
  leadName: string;

  @ApiProperty({ 
    example: 'joao@email.com',
    description: 'Email do lead'
  })
  @IsEmail()
  @IsNotEmpty()
  leadEmail: string;

  @ApiProperty({ 
    example: '+5511999999999',
    description: 'Telefone do lead (formato E.164)'
  })
  @IsString()
  @IsNotEmpty()
  leadPhone: string;
}
