import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'ISO: so mensagens com ocorrido_em anterior a este instante.' })
  @IsOptional()
  @IsISO8601()
  before?: string;
}
