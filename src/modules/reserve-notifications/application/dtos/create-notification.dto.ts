import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ENotificationType, ENotificationScope } from '../../domain/enums';

export class CreateNotificationDTO {
  @ApiProperty() @IsString() @MaxLength(255) title: string;
  @ApiProperty() @IsString() body: string;
  @ApiProperty({ enum: ENotificationType }) @IsEnum(ENotificationType) type: ENotificationType;
  @ApiProperty({ enum: ENotificationScope }) @IsEnum(ENotificationScope) scope: ENotificationScope;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tenant_ids?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() send_email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduled_at?: string;
}
