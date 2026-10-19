import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EBotContactAudience } from '../../../../generated/prisma/enums';

export class ListConversationsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ enum: EBotContactAudience, description: 'Filtra pelo tipo de publico do contato.' })
  @IsOptional()
  @IsEnum(EBotContactAudience)
  audience?: EBotContactAudience;
}

/** Paginacao do historico da conversa (de tras pra frente). */
export class DetailConversationQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 200, description: 'Quantidade de mensagens mais recentes.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor opaco devolvido em nextCursor: traz as mensagens anteriores a ele em (ocorrido_em, id). Prefira a before.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @ApiPropertyOptional({
    deprecated: true,
    description: 'Obsoleto, use cursor. ISO: so mensagens com ocorrido_em anterior a este instante (pode pular mensagens empatadas). Ignorado quando cursor vem.',
  })
  @IsOptional()
  @IsISO8601()
  before?: string;
}
