import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateRoomTypeDto {
  @IsString() @Length(1, 120) nome: string;
  @IsOptional() @IsString() @Length(0, 500) descricao_curta?: string;
  @IsInt() @Min(1) capacidade_base: number;
  @IsInt() @Min(1) capacidade_max: number;
  @IsOptional() @IsNumber() @Min(0) valor_pessoa_adicional?: number;
  @IsOptional() @IsBoolean() aceita_pets?: boolean;
  @IsOptional() @IsNumber() @Min(0) taxa_pet_dia?: number;
  @IsOptional() @IsInt() ordem?: number;
}

export class UpdateRoomTypeDto {
  @IsOptional() @IsString() @Length(1, 120) nome?: string;
  @IsOptional() @IsString() @Length(0, 500) descricao_curta?: string;
  @IsOptional() @IsInt() @Min(1) capacidade_base?: number;
  @IsOptional() @IsInt() @Min(1) capacidade_max?: number;
  @IsOptional() @IsNumber() @Min(0) valor_pessoa_adicional?: number;
  @IsOptional() @IsBoolean() aceita_pets?: boolean;
  @IsOptional() @IsNumber() @Min(0) taxa_pet_dia?: number;
  @IsOptional() @IsInt() ordem?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export class CreateUnitDto {
  @IsString() room_type_id: string;
  @IsString() @Length(1, 80) identificador: string;
}

export class UpdateUnitDto {
  @IsOptional() @IsString() @Length(1, 80) identificador?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
