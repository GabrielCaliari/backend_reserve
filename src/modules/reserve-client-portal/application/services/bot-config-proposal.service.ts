import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { ActivityLogService } from './activity-log.service';
import { EActivityLogType } from '../../domain/enums/activity-log-type.enum';
import { EActivityLogCategory } from '../../domain/enums/activity-log-category.enum';
import { CreateBotConfigProposalDto, RejectBotConfigProposalDto } from '../dtos/bot-config-proposal.dto';
import { BotPanelActionProvider } from '../../infrastructure/providers/bot-panel-action.provider';

/**
 * `BotConfigProposal` (§5.5): dados operacionais do bot (preço, política,
 * pacote, horário) propostos pelo cliente e aprovados/rejeitados pela
 * agência antes de irem ao vivo. Server-side enforcement of the
 * "dados sim, comportamento não" boundary lives in the DTO's closed
 * `categoria` set, not here.
 */
@Injectable()
export class BotConfigProposalService {
  private readonly logger = new Logger(BotConfigProposalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly panelActions: BotPanelActionProvider,
  ) {}

  /** Client-portal write: resolves clientId -> tenant_id before submitting (Global Constraints pattern). */
  async submitByClientId(clientId: string, authorId: string, dto: CreateBotConfigProposalDto) {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    if (!client) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
    if (!client.tenant_id) return errorResponse('400:HOTEL_CLIENT_WITHOUT_TENANT', 400);
    return this.submit(client.tenant_id, authorId, dto);
  }

  /** Client-portal read: resolves clientId -> tenant_id before querying. */
  async findByClientId(clientId: string) {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });
    if (!client) return errorResponse('404:HOTEL_CLIENT_NOT_FOUND', 404);
    if (!client.tenant_id) return errorResponse('400:HOTEL_CLIENT_WITHOUT_TENANT', 400);
    return this.findByTenantId(client.tenant_id);
  }

  async submit(tenantId: string, authorId: string, dto: CreateBotConfigProposalDto) {
    try {
      const proposal = await this.prisma.botConfigProposal.create({
        data: {
          tenant_id: tenantId,
          campo: dto.campo,
          categoria: dto.categoria,
          valor_atual: (dto.valor_atual ?? undefined) as any,
          valor_proposto: dto.valor_proposto as any,
          justificativa_cliente: dto.justificativa?.trim() || null,
          autor_id: authorId,
          status: 'PENDENTE',
        },
      });
      return successResponse(proposal, 201);
    } catch (error) {
      return errorResponse('500:BOT_CONFIG_PROPOSAL_NOT_CREATED', 500, error);
    }
  }

  async findByTenantId(tenantId: string, status?: string) {
    try {
      const proposals = await this.prisma.botConfigProposal.findMany({
        where: { tenant_id: tenantId, ...(status ? { status } : {}) },
        orderBy: { created_at: 'desc' },
      });
      return successResponse(proposals);
    } catch (error) {
      return errorResponse('500:BOT_CONFIG_PROPOSALS_NOT_LISTED', 500, error);
    }
  }

  /**
   * Aprovar aplica a chave no bot pelo Canal B (contrato v2 §6). A proposta
   * aprovada e a fonte da verdade; falha de envio nao desfaz a aprovacao, o
   * outbox (bot_panel_actions) guarda a acao e o cron de reconciliacao reenvia.
   */
  async approve(tenantId: string, id: string, revisorId: string) {
    try {
      const proposal = await this.prisma.botConfigProposal.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!proposal) return errorResponse('404:BOT_CONFIG_PROPOSAL_NOT_FOUND', 404);
      if (proposal.status !== 'PENDENTE') {
        return errorResponse('409:BOT_CONFIG_PROPOSAL_NOT_PENDING', 409);
      }

      const updated = await this.prisma.botConfigProposal.update({
        where: { id },
        data: { status: 'APROVADA', revisor_id: revisorId },
      });

      // Contrato v2 §6 passo 3: a aprovacao aplica a chave no bot pelo Canal B.
      // A proposta aprovada e a verdade; se o bot estiver fora do ar, o cron
      // de reconciliacao reenvia o apply_config.
      await this.panelActions.dispatch(tenantId, 'apply_config', {
        actorId: revisorId,
        payload: { key: updated.campo, value: updated.valor_proposto },
      });

      await this.activityLogService.record(tenantId, {
        type: EActivityLogType.AUTO,
        category: EActivityLogCategory.BOT,
        title: `Proposta de configuração aprovada: ${updated.campo}`,
      });

      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:BOT_CONFIG_PROPOSAL_NOT_APPROVED', 500, error);
    }
  }

  async reject(tenantId: string, id: string, revisorId: string, dto: RejectBotConfigProposalDto) {
    try {
      const proposal = await this.prisma.botConfigProposal.findFirst({
        where: { id, tenant_id: tenantId },
      });
      if (!proposal) return errorResponse('404:BOT_CONFIG_PROPOSAL_NOT_FOUND', 404);
      if (proposal.status !== 'PENDENTE') {
        return errorResponse('409:BOT_CONFIG_PROPOSAL_NOT_PENDING', 409);
      }

      const updated = await this.prisma.botConfigProposal.update({
        where: { id },
        data: { status: 'REJEITADA', revisor_id: revisorId, justificativa: dto.justificativa },
      });
      return successResponse(updated);
    } catch (error) {
      return errorResponse('500:BOT_CONFIG_PROPOSAL_NOT_REJECTED', 500, error);
    }
  }
}
