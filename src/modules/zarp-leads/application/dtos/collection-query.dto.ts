import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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

  @ApiProperty({ required: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  active?: boolean;
}
