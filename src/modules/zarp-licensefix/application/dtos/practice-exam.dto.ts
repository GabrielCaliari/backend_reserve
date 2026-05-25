import { IsString, IsEnum, IsInt, IsOptional, IsBoolean, IsArray, ValidateNested, IsIn, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { EExamSection } from '../../domain/enums/exam-section.enum';

export class CreateOptionDto {
  @IsString() @IsIn(['A', 'B', 'C', 'D']) label: string;
  @IsString() @MinLength(1) text: string;
}

export class CreatePracticeExamDto {
  @IsString() @MinLength(1) title: string;
  @IsEnum(EExamSection) section: EExamSection;
  @IsInt() @Min(1) time_limit: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdatePracticeExamDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsEnum(EExamSection) section?: EExamSection;
  @IsOptional() @IsInt() @Min(1) time_limit?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class CreateQuestionDto {
  @IsString() @MinLength(1) statement: string;
  @IsString() @IsIn(['A', 'B', 'C', 'D']) correct_option: string;
  @IsOptional() @IsString() explanation?: string;
  @IsInt() @Min(0) order: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOptionDto) options: CreateOptionDto[];
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() @MinLength(1) statement?: string;
  @IsOptional() @IsString() @IsIn(['A', 'B', 'C', 'D']) correct_option?: string;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsInt() @Min(0) order?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOptionDto) options?: CreateOptionDto[];
}

export class AnswerQuestionDto {
  @IsString() @IsIn(['A', 'B', 'C', 'D']) selected_option: string;
}

export class FlagQuestionDto {
  @IsBoolean() flagged: boolean;
}

export class CreateExamBundleDto {
  @IsString() @MinLength(1) title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() stripe_product_id?: string;
  @IsArray() @IsString({ each: true }) exam_ids: string[];
}

export class UpdateExamBundleDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() stripe_product_id?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) exam_ids?: string[];
}
