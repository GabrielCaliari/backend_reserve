import { IsDateString, IsNumber, Min } from 'class-validator';

export class InsertMonthlyKpiDto {
  @IsDateString() reference_month: string;
  @IsNumber() @Min(1) total_rooms: number;
  @IsNumber() @Min(0) occupied_rooms: number;
  @IsNumber() @Min(0) adr: number;
  @IsNumber() @Min(0) total_revenue: number;
  @IsNumber() @Min(0) direct_revenue: number;
}
