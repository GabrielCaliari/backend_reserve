import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { EBotContactAudience, EFunnelStage } from '../../../../generated/prisma/enums';
import { FUNNEL_LOST_STAGE } from '../../domain/enums/funnel-stage-groups';

export class FunnelStageChangeDto {
  @ApiProperty({ description: 'Estagio de destino do lead.', enum: EFunnelStage, example: 'PERDIDO' })
  @IsEnum(EFunnelStage)
  para_estagio: EFunnelStage;

  /**
   * Obrigatorio quando o destino e PERDIDO: perder um lead sem registrar o
   * porque destroi a unica leitura de "por que estamos perdendo". Nos demais
   * estagios continua opcional -- so e validado se vier preenchido.
   *
   * Uma unica condicao no ValidateIf de proposito: o class-validator combina
   * varios ValidateIf com E logico, entao duas condicoes opostas na mesma
   * propriedade desligariam a validacao inteira.
   *
   * A regra e repetida no FunnelService -- o DTO cobre a entrada HTTP, o
   * service cobre qualquer outra chamada -- e o banco segue aceitando NULL para
   * nao invalidar o historico migrado de FRIO.
   *
   * `motivo: null` explicito e tratado como ausente fora do PERDIDO (era o que
   * o @IsOptional anterior fazia): o painel manda o campo limpo como null e
   * quebrar isso seria regressao de contrato. Dentro do PERDIDO, null cai na
   * primeira condicao e o @IsString recusa, que e o desejado.
   */
  @ApiPropertyOptional({
    description: 'Obrigatorio quando para_estagio = PERDIDO (motivo da perda).',
    maxLength: 255,
    example: 'Sem disponibilidade nas datas',
  })
  @ValidateIf(
    (dto: FunnelStageChangeDto) =>
      dto.para_estagio === FUNNEL_LOST_STAGE ||
      (dto.motivo !== undefined && dto.motivo !== null),
  )
  @IsString()
  @Matches(/\S/, {
    message: 'motivo nao pode ser vazio e e obrigatorio ao mover um lead para PERDIDO.',
  })
  @MaxLength(255)
  motivo?: string;

  /**
   * Subtipo do publico, gravado no contato (nao no evento de estagio). Opcional
   * mesmo quando o destino e PUBLICO_IDENTIFICADO: o dono pediu obrigatoriedade
   * so para o motivo do PERDIDO. Quando ausente, o subtipo ja identificado
   * antes e preservado.
   */
  @ApiPropertyOptional({ description: 'Subtipo do publico, gravado no contato.', enum: EBotContactAudience })
  @IsOptional()
  @IsEnum(EBotContactAudience)
  tipo_publico?: EBotContactAudience;
}
