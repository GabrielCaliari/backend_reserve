import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { ActivityLogService } from './activity-log.service';
import { CreateBotConfigProposalDto, RejectBotConfigProposalDto } from '../dtos/bot-config-proposal.dto';

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
          valor_atual: dto.valor_atual ?? undefined,
          valor_proposto: dto.valor_proposto,
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
   * Approve publishes the config to N8N best-effort (fire-and-forget, same
   * precedent as Fase 3 Task 7's reverse webhook dispatcher) — a failed
   * publish call does NOT roll back the APROVADA status. This plan's
   * explicit decision (see Fase 5 Task 8): the proposal table is the source
   * of truth for "what was approved"; a failed N8N-side publish is an
   * ops-visible problem to reconcile separately, not a reason to re-litigate
   * the approval. FLAGGED as needing product/eng sign-off — the alternative
   * (block the transition until the webhook succeeds) is equally defensible.
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

      await this.publishToN8n(tenantId, updated.campo, updated.valor_proposto);

      await this.activityLogService.record(tenantId, {
        type: 'auto',
        category: 'bot',
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

  private async publishToN8n(tenantId: string, campo: string, valorProposto: unknown): Promise<void> {
    try {
      const config = await this.prisma.botIntegrationConfig.findUnique({ where: { tenant_id: tenantId } });
      if (!config?.n8n_config_publish_webhook_url) {
        this.logger.warn(`No n8n_config_publish_webhook_url configured for tenant ${tenantId} — skipping publish`);
        return;
      }
      await axios.post(
        config.n8n_config_publish_webhook_url,
        { campo, valor_proposto: valorProposto },
        { timeout: 5000 },
      );
    } catch (error) {
      this.logger.error(`Failed to publish bot config to N8N for tenant ${tenantId}:`, error);
    }
  }
}
