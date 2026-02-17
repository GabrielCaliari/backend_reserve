import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EAccessMode } from '@/modules/zarp-leads/domain/enums/access-mode.enum';

export class CollectionQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ enum: EAccessMode, required: false })
  @IsEnum(EAccessMode)
  @IsOptional()
  access_mode?: EAccessMode;

  @ApiProperty({ required: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  active?: boolean;
}
