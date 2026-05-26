import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateReportDto {
  @IsString()
  client_id: string;

  @IsDateString()
  reference_month: string;

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

export class PublishReportDto {
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
