import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ECouponAppliesTo } from '../../domain/enums/coupon-applies-to.enum';

export class UpdateCouponDTO {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountValue?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({ enum: ECouponAppliesTo })
  @IsEnum(ECouponAppliesTo)
  @IsOptional()
  appliesTo?: ECouponAppliesTo;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  cumulative?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number | null;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  maxDiscountAmount?: number | null;

  @ApiPropertyOptional()
  @IsInt()
  @IsPositive()
  @IsOptional()
  maxRedemptions?: number | null;

  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  expiresAt?: string | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
