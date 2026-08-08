import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '../../../../shared/auth/decorators/public.decorator';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { AnalyticsReportController } from './analytics-report.controller';
import { PublicAnalyticsReportController } from './public-analytics-report.controller';

/**
 * `reports` esta no GATEABLE_MODULES (o superadmin liga/desliga o item de menu
 * e o /api/tenant-capabilities responde por ele), mas NAO tem como ser gateado
 * no backend hoje — e uma lacuna estrutural, nao um esquecimento de fiacao:
 *
 * - `AnalyticsReport` (prisma/schema.prisma) nao tem coluna `tenant_id`. A
 *   tabela mapeia telefone -> URL de relatorio de forma global, e o
 *   `AnalyticsReportService` nunca filtra por tenant. Nao existe tenant a
 *   resolver, entao TenantGuard nao tem de onde tirar `request.tenant_id` e o
 *   ModuleAccessGuard nao teria politica que consultar.
 * - `PublicAnalyticsReportController` e `lookup` — citado nominalmente na lista
 *   de rotas nao-gateaveis em shared/auth/constants/gateable-modules.ts.
 *
 * Gatear so seria possivel depois de escopar `AnalyticsReport` por tenant
 * (migration + backfill + filtro no repositorio). Este spec trava o estado atual
 * para que a lacuna seja uma decisao explicita e revisada, nao um acidente.
 */
describe('reserve-reports (reports): gate nao aplicavel — sem contexto de tenant', () => {
  it('AnalyticsReportController nao carrega @RequiresModule (dados globais, sem tenant_id)', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, AnalyticsReportController)).toBeUndefined();
  });

  it('PublicAnalyticsReportController (rota lookup) continua @Public() e fora do gate', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicAnalyticsReportController)).toBe(true);
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, PublicAnalyticsReportController)).toBeUndefined();
  });
});
