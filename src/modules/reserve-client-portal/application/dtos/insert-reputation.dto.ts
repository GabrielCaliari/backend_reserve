import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InsertReputationDto {
  @IsDateString() reference_month: string;
  @IsOptional() @IsNumber() google_rating?: number;
  @IsOptional() @IsNumber() @Min(0) google_reviews_count?: number;
  @IsOptional() @IsNumber() tripadvisor_rating?: number;
  @IsOptional() @IsNumber() @Min(0) tripadvisor_reviews?: number;
  @IsOptional() @IsNumber() booking_rating?: number;
  @IsOptional() @IsNumber() @Min(0) booking_reviews?: number;
  @IsOptional() @IsString() overall_sentiment?: string;
}
