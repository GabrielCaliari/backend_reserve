import { IsString, IsNotEmpty, IsNumberString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmailCampaignDto {
  @ApiProperty({
    description: 'Email campaign name',
    example: 'Black Friday Campaign 2026',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class EmailCampaignQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: '1',
    default: '1',
  })
  @IsNumberString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: '30',
    default: '30',
  })
  @IsNumberString()
  @IsOptional()
  limit?: string;
}
