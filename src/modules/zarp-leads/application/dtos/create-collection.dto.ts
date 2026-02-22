import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
