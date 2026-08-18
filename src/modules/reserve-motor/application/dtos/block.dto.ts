import { IsDateString, IsIn, IsOptional, IsString, Length } from 'class-validator';

export const BLOCK_MOTIVOS = ['MANUTENCAO', 'USO_PROPRIO', 'MENSALISTA', 'OUTRO'] as const;

export class CreateBlockDto {
  @IsString() unit_id: string;
  @IsDateString() data_inicio: string;
  @IsOptional() @IsDateString() data_fim?: string;
  @IsIn(BLOCK_MOTIVOS) motivo: string;
  @IsOptional() @IsString() @Length(0, 500) nota?: string;
}
