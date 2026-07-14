import { IsDateString, IsIn, IsString, Length } from 'class-validator';

export const MILESTONE_TYPES = [
  'marco_zero',
  'seguidor',
  'campanha',
  'bot',
  'recorde',
  'custom',
] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

export class CreateMilestoneDto {
  @IsDateString()
  date: string;

  @IsString()
  @Length(1, 200)
  title: string;

  @IsIn(MILESTONE_TYPES)
  type: MilestoneType;
}

export class UpdateMilestoneDto {
  @IsDateString()
  date: string;

  @IsString()
  @Length(1, 200)
  title: string;

  @IsIn(MILESTONE_TYPES)
  type: MilestoneType;
}
