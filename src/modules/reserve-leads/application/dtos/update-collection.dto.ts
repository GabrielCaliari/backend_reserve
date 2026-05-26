import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCollectionDto {
  @ApiPropertyOptional({ example: 'Updated Collection', description: 'Name of the lead collection' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'landing-page-v2', description: 'Internal source identifier' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the collection is active' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
