import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

// PdfExportProvider carrega @sparticuz/chromium, que e ESM puro e o ts-jest deste
// repo nao transforma. Aqui so lemos metadata de decorator do controller, entao
// mockar o provider evita puxar o chromium sem afetar o que esta sob teste.
jest.mock('../providers/pdf-export.provider', () => ({ PdfExportProvider: class {} }));
import { IS_PUBLIC_KEY } from '../../../../shared/auth/decorators/public.decorator';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { AdminActivityLogController } from './admin-activity-log.controller';
import { AdminAttributionSettingsController } from './admin-attribution-settings.controller';
import { AdminBenchmarkController } from './admin-benchmark.controller';
import { AdminBotConfigProposalController } from './admin-bot-config-proposal.controller';
import { AdminBotIntegrationConfigController } from './admin-bot-integration-config.controller';
import { AdminContentPostController } from './admin-content-post.controller';
import { AdminHotelClientController } from './admin-hotel-client.controller';
import { AdminMetricGoalController } from './admin-metric-goal.controller';
import { AdminMilestoneController } from './admin-milestone.controller';
import { AdminReservationsController } from './admin-reservations.controller';
import { AdminSemesterPlanController } from './admin-semester-plan.controller';
import { AdminWhatsAppContactController } from './admin-whatsapp-contact.controller';
import { AdminWhatsAppFunnelController } from './admin-whatsapp-funnel.controller';
import { BookingWebhookController } from './booking-webhook.controller';
import { BotEventIngestionController } from './bot-event-ingestion.controller';
import { ClientPortalController } from './client-portal.controller';
import { PdfExportController } from './pdf-export.controller';
import { WhatsAppRedirectController } from './whatsapp-redirect.controller';

/**
 * Gateados: os controllers cujo tenant sai do proprio caminho da rota
 * (`admin/hotel-portal/:tenantId/...`) e a superficie do portal
 * (`hotel-portal/...`), que o dashboard chama sempre com `x-tenant-id`.
 */
const GATED_CONTROLLERS = [
  AdminActivityLogController,
  AdminAttributionSettingsController,
  AdminBotConfigProposalController,
  AdminBotIntegrationConfigController,
  AdminContentPostController,
  AdminMetricGoalController,
  AdminMilestoneController,
  AdminReservationsController,
  AdminSemesterPlanController,
  AdminWhatsAppContactController,
  AdminWhatsAppFunnelController,
  ClientPortalController,
  PdfExportController,
];

/** @Public() por design — webhook de booking engine e redirect curto do WhatsApp. */
const PUBLIC_CONTROLLERS = [BookingWebhookController, WhatsAppRedirectController];

describe('reserve-client-portal (client-portal): ModuleAccessGuard wiring', () => {
  it.each(GATED_CONTROLLERS)('%p carries @RequiresModule(client-portal) at class level', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('client-portal');
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

  it.each(PUBLIC_CONTROLLERS)('%p continua @Public() e fora do gate', (Controller) => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Controller)).toBe(true);
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBeUndefined();
  });

  it('BotEventIngestionController (ingestao por API key) fica fora do gate', () => {
    // Autenticado por BotEventKeyGuard (chave do bot), nao por sessao de admin:
    // nao existe tenant administrativo na request para o ModuleAccessGuard ler.
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, BotEventIngestionController)).toBeUndefined();
  });

  it('AdminBenchmarkController (agregado cross-tenant, super_admin) fica fora do gate', () => {
    // Le BenchmarkAggregate agregando varios tenants; nao ha um tenant unico a
    // resolver, e o super_admin ja passa direto pelo ModuleAccessGuard.
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, AdminBenchmarkController)).toBeUndefined();
  });

  it('AdminHotelClientController (listagem cross-tenant via x-skip-tenant) fica fora do gate', () => {
    // GET /admin/hotel-portal/clients aceita `x-skip-tenant: true` para listar
    // todos os clientes; o dashboard remove o `x-tenant-id` nessas chamadas,
    // entao TenantGuard responderia 400 e quebraria a tela.
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, AdminHotelClientController)).toBeUndefined();
  });
});
