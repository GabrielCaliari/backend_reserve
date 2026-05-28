import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateWhatsAppTrackingLinkDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;

  @IsString()
  @Length(8, 20)
  phone_number: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  utm_source?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  utm_medium?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  utm_campaign?: string;
}

export class UpdateWhatsAppTrackingLinkDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  utm_source?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  utm_medium?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  utm_campaign?: string;
}
