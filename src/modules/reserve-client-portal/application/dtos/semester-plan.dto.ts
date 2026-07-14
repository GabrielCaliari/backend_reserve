import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export const DELIVERY_STATUSES = ['planejado', 'em_andamento', 'concluido'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export class CreateSemesterPlanDto {
  @IsString()
  @Length(1, 10)
  semestre: string;

  @IsString()
  @Length(1, 150)
  titulo: string;

  @IsOptional()
  eixos?: any;
}

export class CreateSemesterPlanDeliveryDto {
  @IsInt()
  @Min(1)
  @Max(6)
  mes: number;

  @IsString()
  @Length(1, 150)
  titulo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsInt()
  ordem?: number;

  @IsOptional()
  @IsString()
  milestone_id?: string;
}

export class UpdateSemesterPlanDeliveryDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  titulo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsIn(DELIVERY_STATUSES)
  status?: DeliveryStatus;

  @IsOptional()
  @IsInt()
  ordem?: number;

  @IsOptional()
  @IsString()
  milestone_id?: string;
}
