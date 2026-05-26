import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ENotificationType, ENotificationScope } from '../../domain/enums';

export class ListNotificationsQueryDTO {
  @ApiPropertyOptional({ enum: ENotificationType }) @IsOptional() @IsEnum(ENotificationType) type?: ENotificationType;
  @ApiPropertyOptional({ enum: ENotificationScope }) @IsOptional() @IsEnum(ENotificationScope) scope?: ENotificationScope;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() published?: boolean;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
