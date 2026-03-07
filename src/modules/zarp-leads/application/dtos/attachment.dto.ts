import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AttachmentDto {
  @ApiProperty({ description: 'Media asset ID', example: 'clh8x2...' })
  @IsString()
  asset_id: string;

  @ApiPropertyOptional({ description: 'Attachment label', example: 'CV' })
  @IsOptional()
  @IsString()
  label?: string;
}
