import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutSessionDTO {
  @ApiProperty({ description: 'Product price ID (internal, not Stripe price ID)' })
  @IsString()
  @IsNotEmpty()
  priceId: string;

  // ─── Lead fields (optional — only required when not authenticated) ──────────

  @ApiPropertyOptional({ example: 'João Silva', description: 'Nome do lead (obrigatório se não autenticado)' })
  @IsString()
  @IsOptional()
  leadName?: string;

  @ApiPropertyOptional({ example: 'joao@email.com', description: 'Email do lead (obrigatório se não autenticado)' })
  @IsEmail()
  @IsOptional()
  leadEmail?: string;

  @ApiPropertyOptional({ example: '+5511999999999', description: 'Telefone do lead (obrigatório se não autenticado)' })
  @IsString()
  @IsOptional()
  leadPhone?: string;
}
