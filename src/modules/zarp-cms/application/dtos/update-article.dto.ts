import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateArticleDTO {
  @ApiProperty({
    description: 'Article title',
    example: 'Updated Article Title',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Article content (rich text/markdown)',
    example: '# Updated Introduction\n\nThis is the updated content...',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;
}
