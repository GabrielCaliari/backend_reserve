import { IsDateString, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { EContentPlatform } from '../../domain/enums/content-platform.enum';
import { EContentPostStatus } from '../../domain/enums/content-post-status.enum';

export class CreateContentPostDto {
  @IsEnum(EContentPlatform)
  platform: EContentPlatform;

  @IsOptional()
  @IsDateString()
  scheduled_for?: string;

  @IsOptional()
  @IsDateString()
  published_at?: string;

  @IsOptional()
  @IsEnum(EContentPostStatus)
  status?: EContentPostStatus;

  @IsOptional()
  @IsString()
  @Length(1, 280)
  caption_preview?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  thumbnail_url?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  external_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  permalink?: string;
}

export class UpdateContentPostDto {
  @IsOptional()
  @IsEnum(EContentPlatform)
  platform?: EContentPlatform;

  @IsOptional()
  @IsDateString()
  scheduled_for?: string;

  @IsOptional()
  @IsDateString()
  published_at?: string;

  @IsOptional()
  @IsEnum(EContentPostStatus)
  status?: EContentPostStatus;

  @IsOptional()
  @IsString()
  @Length(1, 280)
  caption_preview?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  thumbnail_url?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  external_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  permalink?: string;
}
