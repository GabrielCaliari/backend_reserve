import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { EActivityLogType } from '../../domain/enums/activity-log-type.enum';
import { EActivityLogCategory } from '../../domain/enums/activity-log-category.enum';

export class CreateActivityLogDto {
  @IsOptional()
  @IsEnum(EActivityLogType)
  type?: EActivityLogType;

  @IsEnum(EActivityLogCategory)
  category: EActivityLogCategory;

  @IsString()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;
}
