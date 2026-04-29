import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentLinkDTO {
  @ApiProperty({ example: 'cm5abc123' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'cliente@empresa.com' })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsString()
  @IsOptional()
  customerPhone?: string;
}
