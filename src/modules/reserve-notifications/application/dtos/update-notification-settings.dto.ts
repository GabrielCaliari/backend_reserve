import { IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingsDTO {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() email_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() inapp_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() event_settings?: Record<string, boolean>;
  @ApiPropertyOptional() @IsOptional() @IsObject() cron_settings?: Record<string, boolean>;
}
