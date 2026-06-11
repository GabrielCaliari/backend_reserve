import { IsArray, IsInt, IsString, Max, Min } from 'class-validator';

export class UpdateAttributionSettingsDto {
  @IsInt()
  @Min(1)
  @Max(90)
  window_days: number;

  @IsArray()
  @IsString({ each: true })
  source_priority: string[];
}
