import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateAnalyticsReportDto {
  @ApiProperty({ example: '5511999999999', description: 'Phone number (unique identifier)' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'https://drive.google.com/...', description: 'Analytics report URL' })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: 'Relatório João Silva', description: 'Optional label for identification' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  label?: string;
}
