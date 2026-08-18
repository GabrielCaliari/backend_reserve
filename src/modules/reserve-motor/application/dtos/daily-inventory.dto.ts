import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertDailyInventoryDto {
  @IsString() room_type_id: string;
  @IsDateString() data: string;
  @IsOptional() @IsNumber() @Min(0) preco?: number;
  @IsOptional() @IsInt() @Min(1) min_stay?: number;
  @IsOptional() @IsBoolean() closed_arrival?: boolean;
  @IsOptional() @IsBoolean() closed_departure?: boolean;
  @IsOptional() @IsBoolean() stop_sell?: boolean;
}
