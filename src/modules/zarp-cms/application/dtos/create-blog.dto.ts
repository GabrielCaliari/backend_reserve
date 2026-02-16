import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateBlogDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
