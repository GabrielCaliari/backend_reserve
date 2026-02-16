import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleDTO {
  @ApiProperty({
    description: 'Article title',
    example: 'Getting Started with NestJS',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Article content (rich text/markdown)',
    example: '# Introduction\n\nThis is the article content...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
