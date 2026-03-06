import { IsEmail, IsIP, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitLeadDto {
  @ApiProperty({
    description: 'Lead name',
    example: 'John Smith',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Lead email address',
    example: 'john.smith@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Lead phone number',
    example: '+5511999999999',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Lead message or inquiry',
    example: 'Interested in premium plan',
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'Lead source identifier',
    example: 'free-consultation-modal',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'Additional lead data in JSON format',
    example: {
      projectTypes: ['patio', 'driveway', 'pool-deck'],
      timeline: { start: 7, end: 30, label: '7-30 days' },
      contactTime: 'morning',
    },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Client IP address',
    example: '192.168.1.1',
  })
  @IsString()
  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Client user agent',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsString()
  @IsOptional()
  userAgent?: string;
}
