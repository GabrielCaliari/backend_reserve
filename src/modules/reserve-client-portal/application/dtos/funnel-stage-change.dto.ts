import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EFunnelStage } from '../../../../generated/prisma/enums';

export class FunnelStageChangeDto {
  @IsEnum(EFunnelStage)
  para_estagio: EFunnelStage;

  @IsOptional()
  @IsString()
  motivo?: string;
}
