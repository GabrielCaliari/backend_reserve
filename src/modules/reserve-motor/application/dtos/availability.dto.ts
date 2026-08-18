import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class AvailabilityQueryDto {
  @IsDateString() checkin: string;
  @IsDateString() checkout: string;
  @Type(() => Number) @IsInt() @Min(1) adultos: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) criancas?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) pets?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() cliente_marina?: boolean;
}
