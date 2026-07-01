import { IsOptional, IsString } from 'class-validator';

export class PublishDigestDto {
  @IsOptional()
  @IsString()
  executive_summary?: string;

  @IsOptional()
  highlights?: any;

  @IsOptional()
  next_steps?: any;

  @IsOptional()
  @IsString()
  admin_comment?: string;
}
