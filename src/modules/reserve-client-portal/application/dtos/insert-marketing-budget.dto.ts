import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InsertMarketingBudgetDto {
  @IsDateString() reference_month: string;
  @IsNumber() @Min(0) total_budget: number;
  @IsOptional() @IsNumber() @Min(0) meta_ads_budget?: number;
  @IsOptional() @IsNumber() @Min(0) google_ads_budget?: number;
  @IsOptional() @IsNumber() @Min(0) other_budget?: number;
  @IsOptional() @IsString() notes?: string;
}
