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

  /**
   * Custom slug for the public link (the text after /wa/).
   * Letters, numbers, hyphen and underscore only. If omitted, a random
   * 8-char code is generated.
   */
  @IsOptional()
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'custom_code deve conter apenas letras, números, hífen ou underscore',
  })
  custom_code?: string;

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

  /** Change the public slug (the text after /wa/). Must stay unique. */
  @IsOptional()
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'custom_code deve conter apenas letras, números, hífen ou underscore',
  })
  custom_code?: string;

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
