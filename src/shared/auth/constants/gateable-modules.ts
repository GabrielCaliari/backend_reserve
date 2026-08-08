/**
 * Platform config (not business logic): which bounded contexts a superadmin can
 * enable/disable per tenant.
 *
 * NEVER add a module here whose shutdown locks the tenant out of the platform:
 * - auth              login, session, tenant selection, admin/tenant management
 * - settings          the only route that can turn a module back on
 * - unified-webhooks  (and every webhooks/* controller) @Public(), no tenant on
 *                     the request, and Stripe reconciliation must not stop
 *
 * Public capture/checkout/redirect routes (public/*, collect, wa/:code, lookup)
 * and the B2C consumer surface are also out of scope: they have no admin tenant
 * context, so @RequiresModule cannot run on them.
 *
 * LACUNA CONHECIDA — 'reports': continua no catalogo (o superadmin liga/desliga
 * o item de menu e /api/tenant-capabilities responde por ele), mas nenhuma rota
 * pode ser gateada hoje: AnalyticsReport nao tem coluna tenant_id, os dados sao
 * globais (telefone -> URL) e a unica rota de leitura e o `lookup` @Public().
 * Gatear exige antes escopar a tabela por tenant. Travado em
 * reserve-reports/infrastructure/controllers/reports-module-access-wiring.spec.ts.
 */
export const GATEABLE_MODULES = [
  'cms',
  'leads',
  'mailer',
  'notifications',
  'stats',
  'reports',
  'coupons',
  'payments',
  'products',
  'client-portal',
] as const;

export type GateableModule = (typeof GATEABLE_MODULES)[number];

/** Documented denylist — asserted against GATEABLE_MODULES by the spec. */
export const NON_GATEABLE_MODULES = ['auth', 'settings', 'unified-webhooks'] as const;

export function isGateableModule(value: string): value is GateableModule {
  return (GATEABLE_MODULES as readonly string[]).includes(value);
}

/** Key under the `platform` settings module that stores the tenant override. */
export function moduleFlagKey(module: GateableModule): string {
  return `module.${module}.enabled`;
}
