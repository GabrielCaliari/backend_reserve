import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateBlogDTO {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
