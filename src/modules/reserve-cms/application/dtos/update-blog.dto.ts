import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'Media collection ID used by this blog for article uploads',
    example: 'cm8abc123def456ghi789jklm',
  })
  @IsString()
  @IsOptional()
  mediaCollectionId?: string;

  @ApiPropertyOptional({
    description: 'Whether the blog is active and can be consumed by the public API',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
