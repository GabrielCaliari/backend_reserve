import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsArray, IsUrl } from 'class-validator';
import { EAccessMode } from '@/modules/zarp-leads/domain/enums/access-mode.enum';

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

  @ApiProperty({ enum: EAccessMode, default: EAccessMode.public, description: 'Access mode for the collection' })
  @IsEnum(EAccessMode)
  @IsOptional()
  access_mode?: EAccessMode;

  @ApiProperty({ example: ['https://example.com'], description: 'Allowed domains for private collections', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowed_domains?: string[];
}
