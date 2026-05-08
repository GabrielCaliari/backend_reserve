import { IsOptional, IsString, IsInt, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListMovementsQueryDTO {
  @ApiPropertyOptional({
    example: 'b2b',
    enum: ['b2b', 'b2c', 'all'],
    description: 'Filtrar por origem: b2b (one-time), b2c (subscriptions), all (todos)',
  })
  @IsString()
  @IsOptional()
  @IsIn(['b2b', 'b2c', 'all'])
  source?: 'b2b' | 'b2c' | 'all';

  @ApiPropertyOptional({
    example: 'completed',
    description: 'Filtrar por status (completed, pending, canceled, etc.)',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 50, description: 'Limite de resultados (padrão: 50)' })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 0, description: 'Offset para paginação (padrão: 0)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
