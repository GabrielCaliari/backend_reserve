import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

// PdfExportProvider carrega @sparticuz/chromium, que e ESM puro e o ts-jest deste
// repo nao transforma. Aqui so lemos metadata de decorator do controller, entao
// mockar o provider evita puxar o chromium sem afetar o que esta sob teste.
jest.mock('../providers/pdf-export.provider', () => ({ PdfExportProvider: class {} }));
import { IS_PUBLIC_KEY } from '../../../../shared/auth/decorators/public.decorator';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import {
  TENANT_RESOURCE_SCOPE_KEY,
  TenantResourceRef,
  TenantResourceScopeGuard,
} from '../guards/tenant-resource-scope.guard';
import { AdminActivityLogController } from './admin-activity-log.controller';
import { AdminAttributionSettingsController } from './admin-attribution-settings.controller';
import { AdminBenchmarkController } from './admin-benchmark.controller';
import { AdminBotConfigProposalController } from './admin-bot-config-proposal.controller';
import { AdminBotIssuesController } from './admin-bot-issues.controller';
import { AdminBotIntegrationConfigController } from './admin-bot-integration-config.controller';
import { AdminContentPostController } from './admin-content-post.controller';
import { AdminDigestController } from './admin-digest.controller';
import { AdminHotelClientController } from './admin-hotel-client.controller';
import { AdminHotelMetricsController } from './admin-hotel-metrics.controller';
import { AdminMetricGoalController } from './admin-metric-goal.controller';
import { AdminMilestoneController } from './admin-milestone.controller';
import { AdminReservationsController } from './admin-reservations.controller';
import { AdminSemesterPlanController } from './admin-semester-plan.controller';
import { AdminWhatsAppContactController } from './admin-whatsapp-contact.controller';
import { AdminWhatsAppFunnelController } from './admin-whatsapp-funnel.controller';
import { BookingWebhookController } from './booking-webhook.controller';
import { PmsBookingWebhookController } from './pms-booking-webhook.controller';
import { BotEventIngestionController } from './bot-event-ingestion.controller';
import { ClientPortalController } from './client-portal.controller';
import { GuestCrmController } from './guest-crm.controller';
import { PdfExportController } from './pdf-export.controller';
import { ReportController } from './report.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppRedirectController } from './whatsapp-redirect.controller';
import { WhatsAppTrackingController } from './whatsapp-tracking.controller';

/**
 * Controllers cujo tenant sai do proprio caminho da rota
 * (`admin/hotel-portal/:tenantId/...`) ou da superficie do portal
 * (`hotel-portal/...`), que o dashboard chama sempre com `x-tenant-id`.
 */
const TENANT_KEYED_CONTROLLERS = [
  AdminActivityLogController,
  AdminAttributionSettingsController,
  AdminBotConfigProposalController,
  AdminBotIntegrationConfigController,
  AdminBotIssuesController,
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

/**
 * Controllers chaveados por id de RECURSO (`:clientId`, `:guestId`, `:id`) em vez
 * de por `:tenantId`. Alem do gate de modulo eles precisam do
 * TenantResourceScopeGuard: o tenant vem do header, entao sem a checagem de
 * posse qualquer admin passava o id de um recurso de outro cliente.
 */
const RESOURCE_KEYED_CONTROLLERS = [
  AdminDigestController,
  AdminHotelMetricsController,
  GuestCrmController,
  ReportController,
  WhatsAppController,
  WhatsAppTrackingController,
];

const GATED_CONTROLLERS = [...TENANT_KEYED_CONTROLLERS, ...RESOURCE_KEYED_CONTROLLERS];

/** @Public() por design — webhook de booking engine e redirect curto do WhatsApp. */
const PUBLIC_CONTROLLERS = [BookingWebhookController, WhatsAppRedirectController, PmsBookingWebhookController];

function classGuards(target: unknown): unknown[] {
  return Reflect.getMetadata(GUARDS_METADATA, target as object) ?? [];
}

function handlerGuards(target: object, method: string): unknown[] {
  return Reflect.getMetadata(GUARDS_METADATA, (target as any)[method]) ?? [];
}

function scopeRefs(target: unknown): TenantResourceRef[] {
  return Reflect.getMetadata(TENANT_RESOURCE_SCOPE_KEY, target as object) ?? [];
}

describe('reserve-client-portal (client-portal): ModuleAccessGuard wiring', () => {
  it.each(GATED_CONTROLLERS)('%p carries @RequiresModule(client-portal) at class level', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('client-portal');
  });

  it.each(GATED_CONTROLLERS)('%p runs ModuleAccessGuard in its class-level guard chain', (Controller) => {
    expect(classGuards(Controller)).toContain(ModuleAccessGuard);
  });

  // ModuleAccessGuard le request.tenant_id; sem TenantGuard antes dele o guard
  // lanca erro em vez de gatear. A ordem e parte do contrato, nao um detalhe.
  it.each(GATED_CONTROLLERS)('%p roda TenantGuard antes de ModuleAccessGuard', (Controller) => {
    const guards = classGuards(Controller);
    expect(guards.indexOf(TenantGuard)).toBeGreaterThanOrEqual(0);
    expect(guards.indexOf(TenantGuard)).toBeLessThan(guards.indexOf(ModuleAccessGuard));
  });

  it.each(PUBLIC_CONTROLLERS)('%p continua @Public() e fora do gate', (Controller) => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Controller)).toBe(true);
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBeUndefined();
  });

  it('BotEventIngestionController (ingestao por API key) fica fora do gate', () => {
    // Autenticado por BotIngestBearerGuard (chave Bearer do bot), nao por sessao de admin:
    // nao existe tenant administrativo na request para o ModuleAccessGuard ler.
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, BotEventIngestionController)).toBeUndefined();
  });

  it('AdminBenchmarkController (agregado cross-tenant, super_admin) fica fora do gate', () => {
    // Le BenchmarkAggregate agregando varios tenants; nao ha um tenant unico a
    // resolver, e o super_admin ja passa direto pelo ModuleAccessGuard.
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, AdminBenchmarkController)).toBeUndefined();
  });
});

describe('ClientPortalController: isolamento por tenant do :clientId', () => {
  it('confere que o :clientId pertence ao tenant da sessao, depois do TenantGuard', () => {
    const guards = classGuards(ClientPortalController);
    expect(scopeRefs(ClientPortalController)).toEqual([{ kind: 'hotelClient', key: 'clientId' }]);
    expect(guards).toContain(TenantResourceScopeGuard);
    expect(guards.indexOf(TenantGuard)).toBeLessThan(guards.indexOf(TenantResourceScopeGuard));
  });
});

describe('reserve-client-portal: TenantResourceScopeGuard wiring', () => {
  it.each(RESOURCE_KEYED_CONTROLLERS)('%p declara @ScopedToTenantResource', (Controller) => {
    expect(scopeRefs(Controller).length).toBeGreaterThan(0);
  });

  it.each(RESOURCE_KEYED_CONTROLLERS)('%p roda TenantResourceScopeGuard', (Controller) => {
    expect(classGuards(Controller)).toContain(TenantResourceScopeGuard);
  });

  // O guard le request.tenant_id/request.admin_role, que so existem depois do
  // TenantGuard — antes dele ele lanca em vez de validar posse.
  it.each(RESOURCE_KEYED_CONTROLLERS)(
    '%p roda TenantGuard antes de TenantResourceScopeGuard',
    (Controller) => {
      const guards = classGuards(Controller);
      expect(guards.indexOf(TenantGuard)).toBeGreaterThanOrEqual(0);
      expect(guards.indexOf(TenantGuard)).toBeLessThan(guards.indexOf(TenantResourceScopeGuard));
    },
  );

  // PermissionsGuard por ultimo: com request.tenant_id populado ele avalia o
  // papel do admin DENTRO do tenant (e os overrides), nao o papel global.
  it.each(RESOURCE_KEYED_CONTROLLERS)('%p roda PermissionsGuard por ultimo', (Controller) => {
    const guards = classGuards(Controller);
    expect(guards[guards.length - 1]).toBe(PermissionsGuard);
  });

  // Chave errada = guard silencioso: a referencia e ignorada quando a chave nao
  // existe na rota, entao o mapa rota -> chave precisa estar travado por teste.
  it.each([
    [AdminDigestController, [{ kind: 'digestReport', key: 'id' }]],
    [AdminHotelMetricsController, [{ kind: 'hotelClient', key: 'clientId' }]],
    [
      GuestCrmController,
      [
        { kind: 'hotelClient', key: 'clientId' },
        { kind: 'hotelGuest', key: 'guestId' },
      ],
    ],
    [
      ReportController,
      [
        { kind: 'hotelClient', key: 'clientId' },
        { kind: 'monthlyReport', key: 'id' },
        { kind: 'hotelClient', key: 'client_id', source: 'body' },
      ],
    ],
    [WhatsAppController, [{ kind: 'hotelClient', key: 'clientId' }]],
    [
      WhatsAppTrackingController,
      [
        { kind: 'hotelClient', key: 'clientId' },
        { kind: 'whatsAppTrackingLink', key: 'linkId' },
      ],
    ],
    [
      AdminHotelClientController,
      [
        { kind: 'hotelClient', key: 'id' },
        { kind: 'tenant', key: 'tenant_id', source: 'body' },
      ],
    ],
  ])('%p mapeia cada chave de rota para o kind certo', (Controller, expected) => {
    expect(scopeRefs(Controller)).toEqual(expected);
  });
});

/**
 * AdminHotelClientController e o unico com cadeia por metodo: `GET /clients` e a
 * listagem cross-tenant do super admin (`x-skip-tenant: true`, sem
 * `x-tenant-id`), e um TenantGuard de classe a quebraria com 400.
 */
describe('AdminHotelClientController: cadeia por metodo', () => {
  const TENANT_SCOPED_METHODS = [
    'create',
    'findById',
    'update',
    'deactivate',
    'insertOtaData',
    'importBaseline',
    'getOtaData',
  ];

  it('nao declara guards em nivel de classe', () => {
    expect(classGuards(AdminHotelClientController)).toEqual([]);
  });

  it('carrega @RequiresModule(client-portal) em nivel de classe', () => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, AdminHotelClientController)).toBe('client-portal');
  });

  it.each(TENANT_SCOPED_METHODS)('%s roda a cadeia tenant-scoped na ordem', (method) => {
    const guards = handlerGuards(AdminHotelClientController.prototype, method);
    expect(guards).toContain(TenantGuard);
    expect(guards).toContain(ModuleAccessGuard);
    expect(guards).toContain(TenantResourceScopeGuard);
    expect(guards.indexOf(TenantGuard)).toBeLessThan(guards.indexOf(ModuleAccessGuard));
    expect(guards.indexOf(TenantGuard)).toBeLessThan(guards.indexOf(TenantResourceScopeGuard));
    expect(guards[guards.length - 1]).toBe(PermissionsGuard);
  });

  it('findAll (listagem cross-tenant) fica fora da cadeia tenant-scoped', () => {
    const guards = handlerGuards(AdminHotelClientController.prototype, 'findAll');
    expect(guards).not.toContain(TenantGuard);
    expect(guards).not.toContain(ModuleAccessGuard);
    expect(guards).not.toContain(TenantResourceScopeGuard);
  });
});
