import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EBotContactAudience } from '../../../../generated/prisma/enums';

/**
 * Matching por sufixo de digitos, mesmo precedente do
 * roi-analysis.service.ts (normalizeForMatch): tolera DDI faltando/sobrando
 * entre o telefone da reserva e o numero_contato do bot.
 */
export const GUEST_MATCH_SUFFIX_LEN = 8;

/**
 * Inteligencia de hospede: contato do bot com estadia ATIVA no motor
 * (checkin <= hoje < checkout, reserva CONFIRMADA/CHECKIN_FEITO) vira
 * HOSPEDE_EM_ESTADIA; quando a estadia termina, volta a LEAD. Subtipos
 * curados a mao (MENSALISTA/MARINA/EQUIPE) NUNCA sao tocados. O bot le o
 * tipo_publico do contato e muda o tom da conversa sozinho.
 */
@Injectable()
export class GuestStatusService {
  private readonly logger = new Logger(GuestStatusService.name);

  constructor(private readonly prisma: PrismaService) {}

  private digits(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  async syncAll(): Promise<{ promovidos: number; revertidos: number }> {
    const agora = new Date();
    const hoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));

    const estadias = await this.prisma.motorReservation.findMany({
      where: {
        status: { in: ['CONFIRMADA', 'CHECKIN_FEITO'] },
        checkin: { lte: hoje },
        checkout: { gt: hoje },
        hospede_telefone: { not: null },
      },
      select: { tenant_id: true, hospede_telefone: true },
    });

    // Indice por tenant: digitos completos + sufixo (tolerancia de DDI).
    const porTenant = new Map<string, { full: Set<string>; sufixos: Set<string> }>();
    for (const estadia of estadias) {
      const d = this.digits(estadia.hospede_telefone ?? '');
      if (d.length < GUEST_MATCH_SUFFIX_LEN) continue;
      let entry = porTenant.get(estadia.tenant_id);
      if (!entry) {
        entry = { full: new Set(), sufixos: new Set() };
        porTenant.set(estadia.tenant_id, entry);
      }
      entry.full.add(d);
      entry.sufixos.add(d.slice(-GUEST_MATCH_SUFFIX_LEN));
    }

    // Candidatos: contatos dos tenants com estadia (promocao) e qualquer
    // contato ja marcado hospede (reversao no checkout).
    const contatos = await this.prisma.botContact.findMany({
      where: {
        OR: [
          { tenant_id: { in: [...porTenant.keys()] } },
          { tipo_publico: EBotContactAudience.HOSPEDE_EM_ESTADIA },
        ],
      },
      select: { id: true, tenant_id: true, numero_contato: true, tipo_publico: true },
    });

    const promover: string[] = [];
    const reverter: string[] = [];
    for (const contato of contatos) {
      const entry = porTenant.get(contato.tenant_id);
      const d = this.digits(contato.numero_contato);
      const emEstadia =
        !!entry &&
        d.length >= GUEST_MATCH_SUFFIX_LEN &&
        (entry.full.has(d) || entry.sufixos.has(d.slice(-GUEST_MATCH_SUFFIX_LEN)));

      if (
        emEstadia &&
        (contato.tipo_publico === null || contato.tipo_publico === EBotContactAudience.LEAD)
      ) {
        promover.push(contato.id);
      } else if (!emEstadia && contato.tipo_publico === EBotContactAudience.HOSPEDE_EM_ESTADIA) {
        reverter.push(contato.id);
      }
      // MENSALISTA/MARINA/EQUIPE: intocados por construcao.
    }

    if (promover.length) {
      await this.prisma.botContact.updateMany({
        where: { id: { in: promover } },
        data: { tipo_publico: EBotContactAudience.HOSPEDE_EM_ESTADIA },
      });
    }
    if (reverter.length) {
      await this.prisma.botContact.updateMany({
        where: { id: { in: reverter } },
        data: { tipo_publico: EBotContactAudience.LEAD },
      });
    }
    if (promover.length || reverter.length) {
      this.logger.log(`hospedes sincronizados: +${promover.length} / -${reverter.length}`);
    }
    return { promovidos: promover.length, revertidos: reverter.length };
  }
}
