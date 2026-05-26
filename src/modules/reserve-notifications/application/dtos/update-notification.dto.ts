import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ENotificationScope } from '../../domain/enums';

export class UpdateNotificationDTO {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional({ enum: ENotificationScope }) @IsOptional() @IsEnum(ENotificationScope) scope?: ENotificationScope;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tenant_ids?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() send_email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduled_at?: string;
}
