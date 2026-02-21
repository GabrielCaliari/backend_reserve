import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsArray, IsObject } from 'class-validator';
import { EAccessMode } from '../../domain/enums/access-mode.enum';

export class CreateCollectionDto {
  @ApiProperty({ example: 'My Collection', description: 'Name of the lead collection' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'landing-page-v1', description: 'Internal source identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  source: string;

  @ApiPropertyOptional({ example: 'career_page', description: 'Source type' })
  @IsString()
  @IsOptional()
  source_type?: string;

  @ApiPropertyOptional({ example: 'organic', description: 'Source channel' })
  @IsString()
  @IsOptional()
  source_channel?: string;

  @ApiPropertyOptional({ example: 'hiring-2026', description: 'Source campaign' })
  @IsString()
  @IsOptional()
  source_campaign?: string;

  @ApiProperty({ enum: EAccessMode, default: EAccessMode.public, description: 'Access mode for the collection' })
  @IsEnum(EAccessMode)
  @IsOptional()
  access_mode?: EAccessMode;

  @ApiProperty({ example: ['https://example.com'], description: 'Allowed domains for private collections', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowed_domains?: string[];

  @ApiPropertyOptional({ example: { department: 'Engineering' }, description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
