import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';

/**
 * Fonte única de verdade do RBAC Fase 2 (docs/superpowers/plans/2026-07-26-fase2-backend-rbac.md).
 * Alimenta o seed idempotente (prisma/seeds/shared/permissions.seed.ts) e
 * docs/RBAC-MATRIX.md. Nomes são `recurso.ação`, minúsculos, separados por ponto.
 *
 * Deliberadamente ausente:
 * - super_admin: bypassa o PermissionsGuard inteiro — nenhuma linha na tabela.
 * - company_admin: alias legado, normalizado para manager antes de qualquer lookup.
 * - Permissões sem NENHUM grant de papel são super_admin-only por design: a
 *   linha existe para o nome estar declarado, mas só o bypass alcança a rota.
 *
 * Catálogo enxuto: contém só as permissões referenciadas por uma rota real do
 * Reserve hoje (Tasks 9–18 deste plano) — não é uma cópia integral do
 * catálogo da Zarp, que cobre módulos (courses, automations, settings,
 * marketing) que o Reserve não tem.
 */
export const PERMISSIONS = [
  // admins (reserve-auth)
  'admins.create',
  'admins.read',
  'admins.role.update',
  'admins.update',
  'admins.deactivate',
  'admins.activate',
  'admins.delete',
  // Anomalia preservada (Global Constraints): GET /admin/:id/deletion-status
  // é mais estreito que as rotas irmãs de leitura, que caem em admins.read.
  'admins.deletion-status.read',

  // users (reserve-auth — contas de cliente geridas por admin)
  'users.read',
  'users.update',
  'users.deactivate',
  'users.delete',

  // tenants (reserve-auth)
  'tenants.create',
  'tenants.read',
  'tenants.update',
  'tenants.admin.assign',
  'tenants.admin.remove',
  'tenants.admin.read',
  'tenants.deactivate',
  'tenants.activate',
  'tenants.delete',
  'tenants.admin.role.update',

  // post / geração de imagem (reserve-auth)
  'post.image-generation.manage',

  // cms
  'cms.article.create',
  'cms.article.read',
  'cms.article.update',
  'cms.article.delete',
  'cms.article.publish',
  'cms.article-image.create',
  'cms.article-image.read',
  'cms.article-image.update',
  'cms.article-image.delete',
  'cms.author.create',
  'cms.author.read',
  'cms.author.update',
  'cms.author.delete',
  'cms.blog.create',
  'cms.blog.read',
  'cms.blog-asset.create',
  'cms.blog.update',
  'cms.blog.delete',
  'cms.blog.manage-key',
  'cms.media-asset.create',
  'cms.media-asset.read',
  'cms.media-asset.update',
  'cms.media-asset.delete',
  'cms.media-collection.create',
  'cms.media-collection.read',
  'cms.media-collection.update',
  'cms.media-collection.delete',
  'cms.media-relation.create',
  'cms.media-relation.read',
  'cms.media-relation.update',
  'cms.media-relation.delete',

  // leads / appointments
  'appointments.read',
  'appointments.update',
  'appointments.schedule-config.read',
  'appointments.schedule-config.manage',
  'appointments.blocked-period.read',
  'appointments.blocked-period.create',
  'appointments.blocked-period.update',
  'appointments.blocked-period.delete',
  'leads.read',
  'leads.attachment.create',
  'leads.attachment.delete',
  'leads.update',
  'leads.delete',
  'leads.collection.create',
  'leads.collection.read',
  'leads.collection.update',
  'leads.collection.manage-key',
  'leads.collection.delete',

  // mailer
  'mailer.smtp-config.manage',
  'mailer.smtp-config.read',
  'mailer.campaign.manage',
  'mailer.sms.create',
  'mailer.sms.read',
  'mailer.sms.send',
  'mailer.lead.read',
  'mailer.lead.create',

  // notifications
  'notifications.platform.manage',

  // reports (analytics, Reserve-exclusivo)
  'analytics-reports.manage',

  // stats / metrics
  'metrics.dashboard.read',
  'metrics.dashboard.global.read',
  'metrics.integrations.read',
  'metrics.integrations.manage',

  // subscriptions / billing-config por tenant
  'billing-config.read',
  'billing-config.manage',

  // b2c-products (Reserve-exclusivo)
  'b2c-products.read',
  'b2c-products.manage',
  'b2c-fees.read',
  'b2c-fees.manage',

  // client-portal / hotel-portal (Reserve-exclusivo)
  'hotel-portal.clients.manage',
  // Anomalia preservada: DELETE :id é mais estreito que o resto do controller.
  'hotel-portal.clients.deactivate',
  'hotel-portal.metrics.manage',
  'hotel-portal.reservations.manage',
  'hotel-portal.guests.manage',
  'hotel-portal.reports.manage',
  // Anomalia preservada: PATCH :id/publish exige owner, exclui manager.
  'hotel-portal.reports.publish',
  'hotel-portal.whatsapp.manage',
  'hotel-portal.whatsapp-links.manage',
  // Fase 5 (Painel Reserve — narrativa, direção e retenção)
  'hotel-portal.digests.manage',
  // Anomalia preservada (mesmo padrão de hotel-portal.reports.publish): publicar
  // exige owner, exclui manager.
  'hotel-portal.digests.publish',
  'hotel-portal.milestones.manage',
  'hotel-portal.semester-plan.manage',
  'hotel-portal.goals.manage',
  'hotel-portal.bot-config-proposals.manage',

  // Painel Reserve (docs/superpowers/plans/2026-08-04-plano-painel-reserve-backend.md)
  'hotel-portal.attribution.manage',
  'hotel-portal.whatsapp-funnel.manage',
  // Deliberately absent from every role grant array below (super_admin-only
  // by the PermissionsGuard bypass) — §5.8's LGPD export/erase.
  'hotel-portal.whatsapp-contacts.manage',
  // super_admin/owner only — mints the secret N8N key (Fase 3 Task 12).
  'hotel-portal.bot-integration.manage',
  // Painel Reserve — Fase 4 (docs/superpowers/plans/2026-08-04-plano-painel-reserve-backend.md)
  'hotel-portal.content.manage',
  'hotel-portal.activity-log.manage',
  // Painel Reserve — Fase 6 Task 5. super_admin-only by design, never
  // exposed to clients (§7) — deliberately absent from every role grant.
  'hotel-portal.benchmark.read',

  // Motor de reservas (spec §5: admin/owner full, manager opera
  // reservas/bloqueios, "funcionary" = viewer le)
  'motor.read',
  'motor.reservations.manage',
  'motor.blocks.manage',
  'motor.settings.manage',

  // settings (Fase 3, não-gateable)
  'settings.read',
  'settings.manage',
  'settings.modules.read',
  'settings.modules.manage',
  'settings.domains.manage',
] as const;

export type PermissionName = (typeof PERMISSIONS)[number];

const VIEWER: readonly PermissionName[] = [
  'cms.article.read',
  'cms.article-image.read',
  'cms.author.read',
  'cms.blog.read',
  'cms.media-asset.read',
  'cms.media-collection.read',
  'cms.media-relation.read',
  'appointments.read',
  'appointments.schedule-config.read',
  'appointments.blocked-period.read',
  'leads.read',
  'leads.collection.read',
  'mailer.sms.read',
  'mailer.lead.read',
  'metrics.dashboard.read',
  'metrics.integrations.read',
  'billing-config.read',
  'b2c-products.read',
  'b2c-fees.read',
  'motor.read',
  'settings.read',
  'settings.modules.read',
];

const EDITOR: readonly PermissionName[] = [
  ...VIEWER,
  'cms.article.create',
  'cms.article.update',
  'cms.article.delete',
  'cms.article.publish',
  'cms.article-image.create',
  'cms.article-image.update',
  'cms.article-image.delete',
  'cms.author.create',
  'cms.author.update',
  'cms.author.delete',
  'cms.blog-asset.create',
  'cms.blog.update',
  'cms.media-asset.create',
  'cms.media-asset.update',
  'cms.media-asset.delete',
  'cms.media-collection.create',
  'cms.media-collection.update',
  'cms.media-collection.delete',
  'cms.media-relation.create',
  'cms.media-relation.update',
  'cms.media-relation.delete',
  'appointments.update',
  'appointments.schedule-config.manage',
  'appointments.blocked-period.create',
  'appointments.blocked-period.update',
  'appointments.blocked-period.delete',
  'leads.attachment.create',
  'leads.attachment.delete',
  'leads.update',
  // Painel Reserve: viewer excluded, editor+ can move leads (§8 Fase 3 Task 6).
  'hotel-portal.whatsapp-funnel.manage',
  // Painel Reserve: viewer excluded, editor+ manages the content calendar
  // (§8 Fase 4 Task 5).
  'hotel-portal.content.manage',
];

const MANAGER: readonly PermissionName[] = [
  ...EDITOR,
  'admins.create',
  'admins.read',
  'admins.role.update',
  'admins.update',
  'users.read',
  'cms.blog.create',
  'cms.blog.delete',
  'leads.delete',
  'leads.collection.create',
  'leads.collection.update',
  'leads.collection.manage-key',
  'leads.collection.delete',
  'mailer.campaign.manage',
  'mailer.sms.create',
  'mailer.sms.send',
  'mailer.lead.create',
  'metrics.integrations.manage',
  'billing-config.manage',
  'b2c-products.manage',
  'b2c-fees.manage',
  'hotel-portal.clients.manage',
  'hotel-portal.metrics.manage',
  'hotel-portal.reservations.manage',
  'hotel-portal.guests.manage',
  'hotel-portal.reports.manage',
  'hotel-portal.whatsapp.manage',
  'hotel-portal.whatsapp-links.manage',
  'hotel-portal.digests.manage',
  'hotel-portal.milestones.manage',
  'hotel-portal.semester-plan.manage',
  'hotel-portal.goals.manage',
  'hotel-portal.bot-config-proposals.manage',
  'hotel-portal.attribution.manage',
  'hotel-portal.activity-log.manage',
  'motor.reservations.manage',
  'motor.blocks.manage',
  'settings.manage',
];

const OWNER: readonly PermissionName[] = [
  ...MANAGER,
  'cms.blog.manage-key',
  'hotel-portal.reports.publish',
  'hotel-portal.digests.publish',
  'hotel-portal.bot-integration.manage',
  'motor.settings.manage',
];

export const ROLE_GRANTS: Partial<Record<EAdminRole, readonly PermissionName[]>> = {
  [EAdminRole.viewer]: VIEWER,
  [EAdminRole.editor]: EDITOR,
  [EAdminRole.manager]: MANAGER,
  [EAdminRole.owner]: OWNER,
};

export function normalizeAdminRole(role: EAdminRole): EAdminRole {
  return role === EAdminRole.company_admin ? EAdminRole.manager : role;
}
