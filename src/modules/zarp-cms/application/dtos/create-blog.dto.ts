import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogDTO {
  @ApiProperty({
    description: 'Blog name',
    example: 'Tech Blog',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Blog description',
    example: 'A blog about technology and software development',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
