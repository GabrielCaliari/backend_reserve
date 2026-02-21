import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AttachmentDto {
  @ApiProperty({ description: 'Media asset ID', example: 123 })
  @IsNumber()
  asset_id: number;

  @ApiPropertyOptional({ description: 'Attachment label', example: 'CV' })
  @IsOptional()
  @IsString()
  label?: string;
}
