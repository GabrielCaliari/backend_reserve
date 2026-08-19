import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertDailyInventoryDto {
  @IsString() room_type_id: string;
  @IsDateString() data: string;
  @IsOptional() @IsNumber() @Min(0) preco?: number;
  @IsOptional() @IsInt() @Min(1) min_stay?: number;
  @IsOptional() @IsBoolean() closed_arrival?: boolean;
  @IsOptional() @IsBoolean() closed_departure?: boolean;
  @IsOptional() @IsBoolean() stop_sell?: boolean;
}

/** Atualizacao em massa de preco/restricoes por room_type/periodo/dow_mask, com preview via dry_run. */
export class BulkDailyInventoryDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  room_type_ids!: string[];

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsInt() @Min(1) @Max(127)
  dow_mask!: number;

  @IsOptional() @IsNumber() @Min(0)
  preco?: number;

  @IsOptional() @IsInt() @Min(1)
  min_stay?: number;

  @IsOptional() @IsBoolean()
  stop_sell?: boolean;

  @IsOptional() @IsBoolean()
  closed_arrival?: boolean;

  @IsOptional() @IsBoolean()
  closed_departure?: boolean;

  @IsOptional() @IsBoolean()
  dry_run?: boolean;
}
