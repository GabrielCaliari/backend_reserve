import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { nightsBetween, utcDate } from '../../domain/constants/motor.constants';
import { MotorTipoEsgotadoError } from '../../domain/errors/motor.errors';
import { ImportReservationLineDto, ImportReservationsDto } from '../dtos/reservation-import.dto';
import { AvailabilityService } from './availability.service';
import { ChannelPushService } from './channel-push.service';
import { isExclusionViolation } from './hold.service';

export type ImportLineResultado =
  | 'ok'
  | 'conflito'
  | 'room_type_desconhecido'
  | 'unit_desconhecida'
  | 'duplicada'
  | 'invalida';

export interface ImportLineResult {
  indice: number;
  resultado: ImportLineResultado;
  detalhe?: string;
  reservation_id?: string;
}

export interface ImportResumo {
  total: number;
  ok: number;
  gravadas: number;
  conflitos: number;
  duplicadas: number;
  erros: number;
}

export interface ImportResult {
  commit: boolean;
  linhas: ImportLineResult[];
  resumo: ImportResumo;
}

/** Reserva "ativa" para fins de duplicata exata (mesma regra do busyUnitIds). */
const STATUS_ATIVOS = ['HOLD', 'CONFIRMADA', 'CHECKIN_FEITO'];

interface SimulatedInterval {
  unit_id: string;
  from: Date;
  to: Date;
}

/**
 * Importador de reservas do cutover (plano Fase 3, Task DEV-1): traz o export
 * do HBOOK para o motor. Dry-run por padrao — valida TODAS as linhas e reporta
 * linha a linha sem gravar nada; commit:true grava as validas com o MESMO
 * protocolo de lock da reserva manual (FOR UPDATE + constraint de exclusao
 * como rede). Idempotente por external_ref (gravado em external_id): reimportar
 * o mesmo export marca as linhas como duplicadas em vez de regravar.
 */
@Injectable()
export class ReservationImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    // Opcional como no ReservationService; enqueue nunca lanca.
    private readonly channelPush?: ChannelPushService,
  ) {}

  async import(tenantId: string, dto: ImportReservationsDto, autor: string): Promise<ImportResult> {
    const commit = dto.commit === true;
    const roomTypes = await this.prisma.motorRoomType.findMany({
      where: { tenant_id: tenantId, ativo: true },
      include: { units: { where: { ativo: true } } },
    });
    const typesByNome = new Map<string, any>(
      roomTypes.map((rt: any) => [rt.nome.trim().toLowerCase(), rt]),
    );

    // Idempotencia: refs ja gravadas no tenant, em UMA query (pool max 3).
    const refs = dto.linhas
      .map((l) => l.external_ref)
      .filter((r): r is string => typeof r === 'string' && r.length > 0);
    const existentes = refs.length
      ? await this.prisma.motorReservation.findMany({
          where: { tenant_id: tenantId, external_id: { in: refs } },
          select: { external_id: true },
        })
      : [];
    const refsConhecidas = new Set<string>(existentes.map((r: any) => r.external_id));

    // Dedup dentro do proprio arquivo (duas linhas iguais no mesmo import).
    const chavesVistas = new Set<string>();
    // Dry-run simula as alocacoes das linhas anteriores para o resultado
    // prever o commit (duas linhas disputando a ultima unit: a segunda conflita).
    const simuladas: SimulatedInterval[] = [];

    const linhas: ImportLineResult[] = [];
    const resumo: ImportResumo = {
      total: dto.linhas.length,
      ok: 0,
      gravadas: 0,
      conflitos: 0,
      duplicadas: 0,
      erros: 0,
    };

    for (let indice = 0; indice < dto.linhas.length; indice++) {
      const result = await this.processLine(
        tenantId,
        dto.linhas[indice],
        indice,
        commit,
        autor,
        typesByNome,
        refsConhecidas,
        chavesVistas,
        simuladas,
      );
      linhas.push(result);
      if (result.resultado === 'ok') {
        resumo.ok += 1;
        if (commit) resumo.gravadas += 1;
      } else if (result.resultado === 'conflito') {
        resumo.conflitos += 1;
      } else if (result.resultado === 'duplicada') {
        resumo.duplicadas += 1;
      } else {
        resumo.erros += 1;
      }
    }

    return { commit, linhas, resumo };
  }

  private async processLine(
    tenantId: string,
    linha: ImportReservationLineDto,
    indice: number,
    commit: boolean,
    autor: string,
    typesByNome: Map<string, any>,
    refsConhecidas: Set<string>,
    chavesVistas: Set<string>,
    simuladas: SimulatedInterval[],
  ): Promise<ImportLineResult> {
    const checkin = utcDate(linha.checkin);
    const checkout = utcDate(linha.checkout);
    if (nightsBetween(checkin, checkout) < 1) {
      return { indice, resultado: 'invalida', detalhe: 'checkout deve ser posterior ao checkin' };
    }

    const roomType = typesByNome.get(linha.room_type_nome.trim().toLowerCase());
    if (!roomType) {
      return {
        indice,
        resultado: 'room_type_desconhecido',
        detalhe: `room_type "${linha.room_type_nome}" nao encontrado no tenant`,
      };
    }

    let unitId: string | undefined;
    if (linha.unit_identificador) {
      const alvo = linha.unit_identificador.trim().toLowerCase();
      const unit = roomType.units.find((u: any) => u.identificador.trim().toLowerCase() === alvo);
      if (!unit) {
        return {
          indice,
          resultado: 'unit_desconhecida',
          detalhe: `unit "${linha.unit_identificador}" nao encontrada em ${roomType.nome}`,
        };
      }
      unitId = unit.id;
    }

    // Idempotencia: external_ref ja gravado (ou repetido no arquivo) = duplicada.
    const chave = linha.external_ref
      ? `ref:${linha.external_ref}`
      : `exata:${roomType.id}:${linha.checkin}:${linha.checkout}:${linha.hospede_nome.trim().toLowerCase()}`;
    if (chavesVistas.has(chave)) {
      return { indice, resultado: 'duplicada', detalhe: 'linha repetida no proprio arquivo' };
    }
    if (linha.external_ref) {
      if (refsConhecidas.has(linha.external_ref)) {
        return {
          indice,
          resultado: 'duplicada',
          detalhe: `external_ref "${linha.external_ref}" ja importado`,
        };
      }
    } else {
      // Sem external_ref: duplicata exata = mesma reserva ativa no tenant.
      const igual = await this.prisma.motorReservation.findFirst({
        where: {
          tenant_id: tenantId,
          room_type_id: roomType.id,
          checkin,
          checkout,
          hospede_nome: linha.hospede_nome,
          status: { in: STATUS_ATIVOS as any },
        },
        select: { id: true },
      });
      if (igual) {
        return { indice, resultado: 'duplicada', detalhe: `reserva identica ja existe (${igual.id})` };
      }
    }

    const result = commit
      ? await this.gravar(tenantId, linha, indice, autor, roomType, unitId, checkin, checkout)
      : await this.simular(tenantId, indice, roomType, unitId, checkin, checkout, simuladas);
    if (result.resultado === 'ok') chavesVistas.add(chave);
    return result;
  }

  /** Dry-run: mesma checagem de units livres, sem transacao e sem gravar. */
  private async simular(
    tenantId: string,
    indice: number,
    roomType: any,
    unitId: string | undefined,
    checkin: Date,
    checkout: Date,
    simuladas: SimulatedInterval[],
  ): Promise<ImportLineResult> {
    const freeIds = await this.availability.freeUnitIds(
      this.prisma,
      tenantId,
      roomType.id,
      checkin,
      checkout,
    );
    const ocupadasNoArquivo = new Set(
      simuladas.filter((s) => s.from < checkout && s.to > checkin).map((s) => s.unit_id),
    );
    const candidatas = (unitId ? freeIds.filter((id) => id === unitId) : freeIds).filter(
      (id) => !ocupadasNoArquivo.has(id),
    );
    if (candidatas.length === 0) {
      return {
        indice,
        resultado: 'conflito',
        detalhe: unitId ? 'unidade ocupada no periodo' : 'sem unidade livre no periodo',
      };
    }
    simuladas.push({ unit_id: candidatas[0], from: checkin, to: checkout });
    return { indice, resultado: 'ok' };
  }

  /**
   * Commit: protocolo de lock da Fase 1 (FOR UPDATE nas units + loop com a
   * constraint de exclusao como rede). Conflito NAO aborta as demais linhas.
   */
  private async gravar(
    tenantId: string,
    linha: ImportReservationLineDto,
    indice: number,
    autor: string,
    roomType: any,
    unitId: string | undefined,
    checkin: Date,
    checkout: Date,
  ): Promise<ImportLineResult> {
    const valorTotal = linha.valor_total ?? 0;
    try {
      const created = await this.prisma.$transaction(async (tx: any) => {
        await tx.$queryRaw`
          SELECT id FROM "motor_units"
          WHERE tenant_id = ${tenantId} AND room_type_id = ${roomType.id} AND ativo = true
          FOR UPDATE
        `;
        const freeIds = await this.availability.freeUnitIds(
          tx,
          tenantId,
          roomType.id,
          checkin,
          checkout,
        );
        const candidatas = unitId ? freeIds.filter((id) => id === unitId) : freeIds;
        for (const candidata of candidatas) {
          try {
            const reservation = await tx.motorReservation.create({
              data: {
                tenant_id: tenantId,
                room_type_id: roomType.id,
                unit_id: candidata,
                checkin,
                checkout,
                status: 'CONFIRMADA',
                origem: linha.origem as any,
                external_id: linha.external_ref ?? null,
                hospede_nome: linha.hospede_nome,
                hospede_telefone: linha.hospede_telefone ?? null,
                // Pagamento do legado fica com a operacao: importa o total e
                // deixa o saldo integral para conferencia no check-in.
                valor_total: valorTotal,
                valor_pago: 0,
                saldo_checkin: valorTotal,
              },
            });
            await tx.motorReservationEvent.create({
              data: {
                reservation_id: reservation.id,
                tipo: 'CRIADA',
                autor,
                payload: { import: true, external_ref: linha.external_ref ?? null },
              },
            });
            return reservation;
          } catch (error) {
            if (isExclusionViolation(error)) continue;
            throw error;
          }
        }
        throw new MotorTipoEsgotadoError();
      });
      // Reserva importada decrementa o numAvail nas OTAs (gatilho de push §3.3).
      void this.channelPush?.enqueue(tenantId, roomType.id, checkin, checkout);
      return { indice, resultado: 'ok', reservation_id: created.id };
    } catch (error) {
      if (error instanceof MotorTipoEsgotadoError) {
        return {
          indice,
          resultado: 'conflito',
          detalhe: unitId ? 'unidade ocupada no periodo' : 'sem unidade livre no periodo',
        };
      }
      throw error;
    }
  }
}
