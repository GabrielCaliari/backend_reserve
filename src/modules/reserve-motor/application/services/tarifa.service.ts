import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { utcDate } from '../../domain/constants/motor.constants';
import { MotorNotFoundError, MotorValidationError } from '../../domain/errors/motor.errors';
import {
  CreatePolicyDto,
  CreatePriceRuleDto,
  CreateRatePlanDto,
  CreateSeasonDto,
  UpdatePolicyDto,
  UpdatePriceRuleDto,
  UpdateRatePlanDto,
  UpdateSeasonDto,
} from '../dtos/tarifa.dto';
import { DailyInventoryService } from './daily-inventory.service';

@Injectable()
export class TarifaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyInventoryService: DailyInventoryService,
  ) {}

  async overview(tenantId: string) {
    // Sequencial de proposito: pool pg max 3, e a tela carrega uma vez.
    const seasons = await this.prisma.motorSeason.findMany({
      where: { tenant_id: tenantId },
      orderBy: { data_inicio: 'asc' },
    });
    const price_rules = await this.prisma.motorPriceRule.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    });
    const policies = await this.prisma.motorCancellationPolicy.findMany({
      where: { tenant_id: tenantId },
    });
    const rate_plans = await this.prisma.motorRatePlan.findMany({
      where: { tenant_id: tenantId },
    });
    return { seasons, price_rules, policies, rate_plans };
  }

  // ── Seasons ────────────────────────────────────────────────────────────────
  async createSeason(tenantId: string, dto: CreateSeasonDto) {
    this.assertRange(dto.data_inicio, dto.data_fim);
    const season = await this.prisma.motorSeason.create({
      data: {
        tenant_id: tenantId,
        nome: dto.nome,
        data_inicio: utcDate(dto.data_inicio),
        data_fim: utcDate(dto.data_fim),
        prioridade: dto.prioridade ?? 0,
      },
    });
    await this.dailyInventoryService.materializeTenant(tenantId);
    return season;
  }

  async updateSeason(tenantId: string, id: string, dto: UpdateSeasonDto) {
    const exists = await this.mustOwn(this.prisma.motorSeason, tenantId, id, 'season');
    const inicio = dto.data_inicio ?? exists.data_inicio.toISOString().slice(0, 10);
    const fim = dto.data_fim ?? exists.data_fim.toISOString().slice(0, 10);
    this.assertRange(inicio, fim);
    const season = await this.prisma.motorSeason.update({
      where: { id },
      data: {
        ...(dto.nome != null ? { nome: dto.nome } : {}),
        ...(dto.prioridade != null ? { prioridade: dto.prioridade } : {}),
        data_inicio: utcDate(inicio),
        data_fim: utcDate(fim),
      },
    });
    await this.dailyInventoryService.materializeTenant(tenantId);
    return season;
  }

  async deleteSeason(tenantId: string, id: string) {
    await this.mustOwn(this.prisma.motorSeason, tenantId, id, 'season');
    // onDelete: Cascade nas price_rules da season
    const season = await this.prisma.motorSeason.delete({ where: { id } });
    await this.dailyInventoryService.materializeTenant(tenantId);
    return season;
  }

  // ── Price rules ────────────────────────────────────────────────────────────
  async createPriceRule(tenantId: string, dto: CreatePriceRuleDto) {
    const roomType = await this.prisma.motorRoomType.findFirst({
      where: { id: dto.room_type_id, tenant_id: tenantId },
    });
    if (!roomType) throw new MotorNotFoundError('room_type nao encontrado');
    if (dto.season_id) await this.mustOwn(this.prisma.motorSeason, tenantId, dto.season_id, 'season');
    const rule = await this.prisma.motorPriceRule.create({
      data: {
        tenant_id: tenantId,
        room_type_id: dto.room_type_id,
        rate_plan_id: dto.rate_plan_id ?? null,
        season_id: dto.season_id ?? null,
        dow_mask: dto.dow_mask,
        preco_noite: dto.preco_noite,
        min_stay: dto.min_stay ?? 1,
      },
    });
    await this.dailyInventoryService.materializeTenant(tenantId);
    return rule;
  }

  async updatePriceRule(tenantId: string, id: string, dto: UpdatePriceRuleDto) {
    await this.mustOwn(this.prisma.motorPriceRule, tenantId, id, 'price_rule');
    const rule = await this.prisma.motorPriceRule.update({ where: { id }, data: { ...dto } });
    await this.dailyInventoryService.materializeTenant(tenantId);
    return rule;
  }

  async deletePriceRule(tenantId: string, id: string) {
    await this.mustOwn(this.prisma.motorPriceRule, tenantId, id, 'price_rule');
    const rule = await this.prisma.motorPriceRule.delete({ where: { id } });
    await this.dailyInventoryService.materializeTenant(tenantId);
    return rule;
  }

  // ── Cancellation policies ──────────────────────────────────────────────────
  async createPolicy(tenantId: string, dto: CreatePolicyDto) {
    return this.prisma.motorCancellationPolicy.create({ data: { tenant_id: tenantId, ...dto } });
  }

  async updatePolicy(tenantId: string, id: string, dto: UpdatePolicyDto) {
    await this.mustOwn(this.prisma.motorCancellationPolicy, tenantId, id, 'policy');
    return this.prisma.motorCancellationPolicy.update({ where: { id }, data: { ...dto } });
  }

  // ── Rate plans (v1: padrao + "Marina" derivado, spec regra v5) ────────────
  async createRatePlan(tenantId: string, dto: CreateRatePlanDto) {
    const roomType = await this.prisma.motorRoomType.findFirst({
      where: { id: dto.room_type_id, tenant_id: tenantId },
    });
    if (!roomType) throw new MotorNotFoundError('room_type nao encontrado');
    return this.prisma.motorRatePlan.create({
      data: {
        tenant_id: tenantId,
        room_type_id: dto.room_type_id,
        nome: dto.nome,
        cancellation_policy_id: dto.cancellation_policy_id ?? null,
        derivado_de: dto.derivado_de ?? null,
        percentual_ajuste: dto.percentual_ajuste ?? null,
      },
    });
  }

  async updateRatePlan(tenantId: string, id: string, dto: UpdateRatePlanDto) {
    await this.mustOwn(this.prisma.motorRatePlan, tenantId, id, 'rate_plan');
    return this.prisma.motorRatePlan.update({ where: { id }, data: { ...dto } });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private assertRange(inicio: string, fim: string): void {
    if (utcDate(fim) < utcDate(inicio)) {
      throw new MotorValidationError('data_fim deve ser igual ou posterior a data_inicio');
    }
  }

  private async mustOwn(model: any, tenantId: string, id: string, label: string) {
    const found = await model.findFirst({ where: { id, tenant_id: tenantId } });
    if (!found) throw new MotorNotFoundError(`${label} nao encontrado`);
    return found;
  }
}
