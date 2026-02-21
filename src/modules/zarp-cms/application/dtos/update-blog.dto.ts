import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBlogDTO {
  @ApiPropertyOptional({
    description: 'Blog name',
    example: 'Updated Tech Blog',
    maxLength: 150,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Blog description',
    example: 'Updated description...',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
