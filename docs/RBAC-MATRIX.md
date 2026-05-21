# RBAC Matrix — permissão × papel

> Gerado a partir de `src/shared/auth/rbac/permission-matrix.ts` (fonte única
> de verdade — o seed e este documento derivam do mesmo arquivo). Atualize o
> matrix primeiro, rode o seed de novo, depois espelhe a mudança aqui.
> `super_admin` faz bypass do `PermissionsGuard` (acesso total, sem linhas).
> `company_admin` é alias legado normalizado para `manager`.

| Permissão | viewer | editor | manager | owner | super_admin |
|---|---|---|---|---|---|
| `admins.create` | — | — | ✅ | ✅ | ✅ |
| `admins.read` | — | — | ✅ | ✅ | ✅ |
| `admins.role.update` | — | — | ✅ | ✅ | ✅ |
| `admins.update` | — | — | ✅ | ✅ | ✅ |
| `admins.deactivate` | — | — | — | — | ✅ |
| `admins.activate` | — | — | — | — | ✅ |
| `admins.delete` | — | — | — | — | ✅ |
| `admins.deletion-status.read` | — | — | — | — | ✅ |
| `users.read` | — | — | ✅ | ✅ | ✅ |
| `users.update` | — | — | — | — | ✅ |
| `users.deactivate` | — | — | — | — | ✅ |
| `users.delete` | — | — | — | — | ✅ |
| `tenants.create` | — | — | — | — | ✅ |
| `tenants.read` | — | — | — | — | ✅ |
| `tenants.update` | — | — | — | — | ✅ |
| `tenants.admin.assign` | — | — | — | — | ✅ |
| `tenants.admin.remove` | — | — | — | — | ✅ |
| `tenants.admin.read` | — | — | — | — | ✅ |
| `tenants.deactivate` | — | — | — | — | ✅ |
| `tenants.activate` | — | — | — | — | ✅ |
| `tenants.delete` | — | — | — | — | ✅ |
| `tenants.admin.role.update` | — | — | — | — | ✅ |
| `post.image-generation.manage` | — | — | — | — | ✅ |
| `cms.article.create` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.article.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cms.article.update` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.article.delete` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.article.publish` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.article-image.create` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.article-image.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cms.article-image.update` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.article-image.delete` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.author.create` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.author.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cms.author.update` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.author.delete` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.blog.create` | — | — | ✅ | ✅ | ✅ |
| `cms.blog.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cms.blog-asset.create` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.blog.update` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.blog.delete` | — | — | ✅ | ✅ | ✅ |
| `cms.blog.manage-key` | — | — | — | ✅ | ✅ |
| `cms.media-asset.create` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.media-asset.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cms.media-asset.update` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.media-asset.delete` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.media-collection.create` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.media-collection.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cms.media-collection.update` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.media-collection.delete` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.media-relation.create` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.media-relation.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `cms.media-relation.update` | — | ✅ | ✅ | ✅ | ✅ |
| `cms.media-relation.delete` | — | ✅ | ✅ | ✅ | ✅ |
| `appointments.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `appointments.update` | — | ✅ | ✅ | ✅ | ✅ |
| `appointments.schedule-config.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `appointments.schedule-config.manage` | — | ✅ | ✅ | ✅ | ✅ |
| `appointments.blocked-period.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `appointments.blocked-period.create` | — | ✅ | ✅ | ✅ | ✅ |
| `appointments.blocked-period.update` | — | ✅ | ✅ | ✅ | ✅ |
| `appointments.blocked-period.delete` | — | ✅ | ✅ | ✅ | ✅ |
| `leads.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `leads.attachment.create` | — | ✅ | ✅ | ✅ | ✅ |
| `leads.attachment.delete` | — | ✅ | ✅ | ✅ | ✅ |
| `leads.update` | — | ✅ | ✅ | ✅ | ✅ |
| `leads.delete` | — | — | ✅ | ✅ | ✅ |
| `leads.collection.create` | — | — | ✅ | ✅ | ✅ |
| `leads.collection.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `leads.collection.update` | — | — | ✅ | ✅ | ✅ |
| `leads.collection.manage-key` | — | — | ✅ | ✅ | ✅ |
| `leads.collection.delete` | — | — | ✅ | ✅ | ✅ |
| `mailer.smtp-config.manage` | — | — | — | — | ✅ |
| `mailer.smtp-config.read` | — | — | — | — | ✅ |
| `mailer.campaign.manage` | — | — | ✅ | ✅ | ✅ |
| `mailer.sms.create` | — | — | ✅ | ✅ | ✅ |
| `mailer.sms.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `mailer.sms.send` | — | — | ✅ | ✅ | ✅ |
| `mailer.lead.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `mailer.lead.create` | — | — | ✅ | ✅ | ✅ |
| `notifications.platform.manage` | — | — | — | — | ✅ |
| `analytics-reports.manage` | — | — | — | — | ✅ |
| `metrics.dashboard.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `metrics.dashboard.global.read` | — | — | — | — | ✅ |
| `metrics.integrations.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `metrics.integrations.manage` | — | — | ✅ | ✅ | ✅ |
| `billing-config.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `billing-config.manage` | — | — | ✅ | ✅ | ✅ |
| `b2c-products.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `b2c-products.manage` | — | — | ✅ | ✅ | ✅ |
| `b2c-fees.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `b2c-fees.manage` | — | — | ✅ | ✅ | ✅ |
| `hotel-portal.clients.manage` | — | — | ✅ | ✅ | ✅ |
| `hotel-portal.clients.deactivate` | — | — | — | — | ✅ |
| `hotel-portal.metrics.manage` | — | — | ✅ | ✅ | ✅ |
| `hotel-portal.reservations.manage` | — | — | ✅ | ✅ | ✅ |
| `hotel-portal.guests.manage` | — | — | ✅ | ✅ | ✅ |
| `hotel-portal.reports.manage` | — | — | ✅ | ✅ | ✅ |
| `hotel-portal.reports.publish` | — | — | — | ✅ | ✅ |
| `hotel-portal.whatsapp.manage` | — | — | ✅ | ✅ | ✅ |
| `hotel-portal.whatsapp-links.manage` | — | — | ✅ | ✅ | ✅ |

## Anomalias de papel preservadas na migração (Fase 2)

Estas três permissões têm concessão deliberadamente mais estreita que uma
permissão irmã do mesmo controller, porque a rota `@Roles` original já era
mais restrita que as vizinhas antes da migração. Ver `docs/superpowers/plans/2026-07-26-fase2-backend-rbac.md`
(seção Global Constraints e Tasks 9/18) para o achado completo.

- `admins.deletion-status.read` — `admin.controller.ts`, `GET /admin/:id/deletion-status`. As rotas irmãs de leitura (`admins.read`) aceitam `manager`; esta continua `super_admin`-only.
- `hotel-portal.clients.deactivate` — `admin-hotel-client.controller.ts`, `DELETE :id`. O resto do controller aceita `manager`+ (`hotel-portal.clients.manage`); só a desativação continua `super_admin`-only.
- `hotel-portal.reports.publish` — `report.controller.ts`, `PATCH :id/publish`. O resto do controller aceita `manager`+ (`hotel-portal.reports.manage`); só a publicação exige `owner`+.
