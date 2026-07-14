import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export const METRIC_GOAL_PERIODS = ['biweekly', 'monthly'] as const;
export type MetricGoalPeriod = (typeof METRIC_GOAL_PERIODS)[number];

export class UpsertMetricGoalDto {
  @IsString()
  @Length(1, 50)
  metric_key: string;

  @IsIn(METRIC_GOAL_PERIODS)
  period: MetricGoalPeriod;

  @IsNumber()
  target_value: number;

  @IsOptional()
  @IsBoolean()
  show_goal?: boolean;
}
