import { IsEnum, IsOptional } from 'class-validator';
import { EFunnelStage } from '../../../../generated/prisma/enums';

/**
 * Retomada humana de uma conversa pausada: opcionalmente devolve o lead a um
 * estagio especifico ("retomar no estagio tal"). Sem estagio, o lead permanece
 * onde esta e apenas o bot volta a responder.
 */
export class ResumeConversationDto {
  @IsOptional()
  @IsEnum(EFunnelStage)
  estagio?: EFunnelStage;
}
