import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../../../../shared/auth/decorators/public.decorator';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { AnalyticsReportController } from './analytics-report.controller';
import { PublicAnalyticsReportController } from './public-analytics-report.controller';

/**
 * A lacuna que este spec travava foi fechada: `AnalyticsReport` ganhou
 * `tenant_id` (migration 20260808000001) e o repositorio filtra por tenant em
 * toda leitura e escrita, entao o TenantGuard tem o que resolver e o
 * ModuleAccessGuard tem politica a consultar.
 *
 * Continua de fora, por design e nao por lacuna, o `lookup` @Public(): nao ha
 * tenant na request e a rota esta na lista de nao-gateaveis em
 * shared/auth/constants/gateable-modules.ts.
 */
const GATED_CONTROLLERS = [AnalyticsReportController];

describe('reserve-reports (reports): ModuleAccessGuard wiring', () => {
  it.each(GATED_CONTROLLERS)('%p carries @RequiresModule(reports) at class level', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('reports');
  });

  it.each(GATED_CONTROLLERS)('%p runs ModuleAccessGuard in its class-level guard chain', (Controller) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, Controller) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });

  // ModuleAccessGuard le request.tenant_id; sem TenantGuard antes dele o guard
  // lanca erro em vez de gatear. A ordem e parte do contrato, nao um detalhe.
  it.each(GATED_CONTROLLERS)('%p roda TenantGuard antes de ModuleAccessGuard', (Controller) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, Controller) ?? [];
    expect(guards.indexOf(TenantGuard)).toBeGreaterThanOrEqual(0);
    expect(guards.indexOf(TenantGuard)).toBeLessThan(guards.indexOf(ModuleAccessGuard));
  });

  it('PublicAnalyticsReportController (rota lookup) continua @Public() e fora do gate', () => {
    // Desligar `reports` nao pode derrubar o lookup: e rota publica, sem tenant
    // na request, e o ModuleAccessGuard nao teria de onde ler a politica.
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicAnalyticsReportController)).toBe(true);
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, PublicAnalyticsReportController)).toBeUndefined();
    const guards: unknown[] =
      Reflect.getMetadata(GUARDS_METADATA, PublicAnalyticsReportController) ?? [];
    expect(guards).not.toContain(ModuleAccessGuard);
  });
});
