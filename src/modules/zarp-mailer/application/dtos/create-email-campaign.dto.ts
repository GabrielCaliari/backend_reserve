import { IsString, IsNotEmpty, IsNumberString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmailCampaignDto {
  @ApiProperty({
    description: 'Nome da campanha de email',
    example: 'Campanha Black Friday 2026',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class EmailCampaignQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    example: '1',
    default: '1',
  })
  @IsNumberString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({
    description: 'Limite de itens por página',
    example: '30',
    default: '30',
  })
  @IsNumberString()
  @IsOptional()
  limit?: string;
}
