import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { FUNNEL_ENTRY_STAGE } from '../../domain/enums/funnel-stage-groups';
import { formatDatasInteresse } from './funnel-metrics.service';

const ULTIMAS_MENSAGENS = 5;

const ESTAGIO_LABEL: Record<string, string> = {
  CONTATO_INICIADO: 'Contato iniciado',
  PUBLICO_IDENTIFICADO: 'Público identificado',
  QUALIFICADO: 'Qualificado',
  ACOMODACAO_APRESENTADA: 'Acomodação apresentada',
  OFERTA_FEITA: 'Oferta feita',
  FECHAMENTO_INICIADO: 'Fechamento iniciado',
  COMPROVANTE_RECEBIDO: 'Comprovante recebido',
  RESERVA_CONFIRMADA: 'Reserva confirmada',
  PERDIDO: 'Perdido',
};

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
/** O Node as vezes formata com NBSP entre "R$" e o valor; normaliza p/ espaco comum. */
const BRL = { format: (v: number) => BRL_FORMATTER.format(v).replace(/\u00a0/g, ' ') };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function dataBr(d: Date): string {
  const [y, m, dd] = isoDate(d).split('-');
  return `${dd}/${m}/${y}`;
}

/**
 * Resumo da conversa para o humano que vai assumir (benchmark P0-4a: "bot
 * posta resumo + contexto como nota interna antes de escalar"). O N8N chama
 * no momento da escalacao e posta `resumoTexto` como nota privada no
 * Chatwoot. Le o que o painel ja sabe — lead, contato, hold vigente e as
 * ultimas mensagens — sem escrever nada.
 */
@Injectable()
export class HandoffSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async build(tenantId: string, numeroContato: string) {
    const contato = await this.prisma.botContact.findUnique({
      where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
    });
    if (!contato) throw new NotFoundException('contato nao encontrado.');

    const [lead, hold, mensagensDesc] = await Promise.all([
      this.prisma.botLead.findUnique({
        where: { tenant_id_numero_contato: { tenant_id: tenantId, numero_contato: numeroContato } },
      }),
      this.prisma.motorHold.findFirst({
        where: { tenant_id: tenantId, contato_whatsapp: numeroContato, status: 'ATIVO' },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.botMessage.findMany({
        where: { tenant_id: tenantId, numero_contato: numeroContato },
        orderBy: { ocorrido_em: 'desc' },
        take: ULTIMAS_MENSAGENS,
        select: { role: true, content_preview: true, ocorrido_em: true },
      }),
    ]);

    const estagio = lead?.current_stage ?? FUNNEL_ENTRY_STAGE;
    const datasInteresse = formatDatasInteresse(lead?.datas_interesse);
    const holdAtivo = hold
      ? {
          holdId: hold.id,
          valorTotal: Number(hold.valor_total),
          valorAntecipado: Number(hold.valor_antecipado),
          checkin: isoDate(hold.checkin),
          checkout: isoDate(hold.checkout),
          expiresAt: hold.expires_at.toISOString(),
        }
      : null;
    const ultimasMensagens = [...mensagensDesc].reverse().map((m) => ({
      role: m.role,
      contentPreview: m.content_preview,
      ocorridoEm: m.ocorrido_em.toISOString(),
    }));

    const linhas: string[] = [
      `Resumo do bot — ${contato.nome ?? numeroContato}`,
      `Estágio: ${ESTAGIO_LABEL[estagio] ?? estagio}`,
    ];
    if (contato.tipo_publico) linhas.push(`Público: ${contato.tipo_publico}`);
    if (contato.motivo_pausa) linhas.push(`Motivo da transferência: ${contato.motivo_pausa}`);
    if (lead?.acomodacao_interesse) linhas.push(`Acomodação de interesse: ${lead.acomodacao_interesse}`);
    if (datasInteresse) linhas.push(`Datas: ${datasInteresse}`);
    if (hold) {
      linhas.push(
        `Hold ativo: ${dataBr(hold.checkin)} → ${dataBr(hold.checkout)} · total ${BRL.format(Number(hold.valor_total))} · antecipado ${BRL.format(Number(hold.valor_antecipado))} · expira ${hold.expires_at.toISOString()}`,
      );
    }
    if (ultimasMensagens.length) {
      linhas.push('Últimas mensagens:');
      for (const m of ultimasMensagens) {
        linhas.push(`- ${m.role === 'user' ? 'Hóspede' : 'Bot'}: ${m.contentPreview ?? '(sem prévia)'}`);
      }
    }

    return {
      numeroContato,
      nome: contato.nome,
      estagio,
      tipoPublico: contato.tipo_publico,
      motivoPausa: contato.motivo_pausa,
      acomodacaoInteresse: lead?.acomodacao_interesse ?? null,
      datasInteresse,
      holdAtivo,
      ultimasMensagens,
      resumoTexto: linhas.join('\n'),
    };
  }
}
