# Painel Reserve — Backend Implementation Plan (Fases 1–6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Source:** `frontend_dashboard_reserve/docs/PLANO_PAINEL_RESERVE_1.md` v2.0 (Julho 2026) — sections 4.1 "CONSTRUIR", 4.2 (novas tabelas), 5.6 (API de eventos do bot), 6.4 (cadeia de atribuição), and the backend slice of the six phases in section 8. This plan covers **backend only** — `backend_reserve` (NestJS 11 + Prisma 7). Frontend routes/UI/charts are a separate, parallel plan.

**Goal:** Build the six data/ingestion/service layers the client-facing Painel Reserve needs — bot-event ingestion with idempotency, the append-only funnel log, ad→conversation attribution, Instagram sync, activity/content/milestone tracking, digest generation, ROI analysis, and agency benchmarking — on top of `backend_reserve`'s existing multi-tenant RBAC, without touching the bot's own N8N/Postgres stack (direction is N8N → painel only, per Decisão 14).

**Architecture:** Every new table is keyed by `tenant_id` (not `HotelClient.id`), because the identity the N8N integration key, `TenantGuard`, and `RolesGuard` all resolve around is `Tenant`, not `HotelClient`. Legacy hotel-portal analytics tables (`CampaignMetric`, `DashboardSnapshot`, `MonthlyReport`, `WhatsAppTrackingLink`, ...) are keyed by `HotelClient.id` (`client_id`) instead — a pre-existing split in the codebase, not something this plan introduces. Every service that needs both worlds (ROI analysis, the digest generator, activity-log auto-events) resolves between the two through the existing 1:1 `Tenant.HotelConfig ↔ HotelClient.tenant_id` relation. The bot pushes events to `POST /api/ingest/bot-events`, authenticated by a per-tenant key (`BotIntegrationConfig`), landing first in an idempotency ledger (`BotIngestionEvent`, unique on `(tenant_id, event_id)`) and then fanned out by event type into read projections (`BotContact`, `BotMessage`, `BotLead`) and the append-only `FunnelEvent` (`funil_eventos`) log — state is always "last event wins," never an in-place status write. Human-authored stage moves write the same `FunnelEvent` log and are mirrored back to N8N through a best-effort webhook dispatcher with a reconciliation cron, so the log — not the outbound call — remains the source of truth if delivery fails.

**Tech Stack:** NestJS 11, Prisma 7 (`prisma migrate dev`, `@prisma/adapter-pg`, PostgreSQL), Jest with `*.spec.ts` colocated (`rootDir: src`), `class-validator`/`class-transformer`, `@nestjs/schedule` (`@Cron`), `@nestjs/bull` + `bull` (already a dependency, currently only used by `reserve-mailer`).

---

## Global Constraints

- **RBAC on `main` today is role-based, not permission-based.** `docs/superpowers/plans/2026-07-26-fase2-backend-rbac.md` (`PermissionsGuard`, `@RequirePermissions`) and `...fase3-backend-tenant-settings.md` (`ModuleAccessGuard`, `TenantSetting`) are **plans, not merged code** — `git log` on `main` shows only Fase 1 hardening merged (`109e8f5 Merge branch 'fase1-hardening'`). Every controller in this plan uses the guard chain that exists today: `AdminJwtGuard → TenantGuard → RolesGuard` with `@Roles(EAdminRole...)`, exactly like `AdminHotelClientController`/`ReportController`. If Fase 2/3 RBAC lands first, migrating these controllers to `@RequirePermissions` is a mechanical follow-up (see the fase2 plan's own Tasks 9–18 for the pattern), not a redesign.
- **`EAdminRole` has no `funcionary` value.** The master plan's Decisão #2 says "já implementado: `admin`, `owner`, `manager`, `funcionary`" but the actual enum (`src/modules/reserve-auth/domain/enums/admin-role.enum.ts`) is `super_admin | owner | manager | editor | viewer | company_admin`. This plan uses the real enum throughout (`viewer` for read-only hotel staff, `editor`/`manager` for staff who can act). **Flagged as a product decision** — see final report.
- **Prisma is snake_case.** Every new field is `tenant_id`, `created_at`, `numero_contato`, etc. — never camelCase. Prisma delegate names stay camelCase (derived from the model name), e.g. `prisma.funnelEvent`.
- **`prisma migrate dev`, never `db push`.** Latest migration on `main` is `20260727000001_credential_hardening`. This plan's migrations are timestamped `20260804000001` upward, one per task, in phase order.
- **Money is integer centavos**, matching `OverviewService`'s existing `toCents`/`money` helpers — every new metric that touches currency reuses `src/modules/reserve-client-portal/application/services/overview.service.ts`'s money/metric helpers rather than re-inventing rounding.
- **`tenant_id` vs `client_id` split is pre-existing, not introduced here.** `HotelClient` (hotel-portal's own client entity) has an optional, unique `tenant_id`. All *existing* hotel-portal analytics (`CampaignMetric`, `DashboardSnapshot`, `SiteMetric`, `MonthlyReport`, `WhatsAppTrackingLink`) are keyed by `HotelClient.id`. All tables *this plan* adds are keyed by `tenant_id`, per the master doc's §4.2 schema and because the bot-event ingestion key, `TenantGuard`, and RBAC are all tenant-scoped. Services that need both (ROI analysis, digest generation, activity-log auto-events, benchmark aggregation) resolve through `HotelClient.tenant_id`. **`HotelClient.tenant_id` is nullable today and not enforced NOT NULL at the DB level** — every real Painel Reserve client already has one (portal access requires an `AdminTenant` row), but nothing stops a `HotelClient` from existing without it. Fase 2 Task 1 adds an application-level guard clause (fail loudly, not silently) rather than a schema change, to avoid a breaking migration on existing rows. **Flagged as a product/eng decision** — see final report.
- **Route conventions**: global prefix is `/api` (see `src/main.ts`). Admin-authored/managed routes live under `admin/hotel-portal/...` (existing convention: `AdminHotelClientController`, `ReportController`, `WhatsAppTrackingController`). Client-portal read routes live under `hotel-portal/:clientId/...` guarded only by `AdminJwtGuard` (existing convention: `ClientPortalController`) — this plan's new client-portal reads follow the same shape but resolve `clientId → tenant_id` internally before querying tenant-keyed tables. The bot ingestion endpoint is public-by-tenant-key at `ingest/bot-events`, `@SkipThrottle()`, matching `BookingWebhookController`'s precedent for third-party-authenticated traffic.
- **Idempotency + retry semantics for `POST /api/ingest/bot-events`** (Decisão 14): a duplicate `event_id` for the same tenant is a silent no-op returning `202`. A malformed/unknown `event_type` is logged and acknowledged `202` (never retried — retrying a schema mismatch never succeeds). A transient failure (DB unavailable, unexpected exception during fan-out) returns `5xx` so N8N's own retry queue engages — the ledger row is already committed as `RECEIVED` before fan-out runs, so a retried duplicate after a transient failure is still idempotent.
- **`funil_eventos` is append-only.** No task in this plan ever issues an `UPDATE` against `FunnelEvent`. Current stage is either derived by querying the latest row, or — for hot-path reads (funnel board, metrics) — served from the `BotLead` read projection, which Fase 3's event processor keeps in sync transactionally alongside every `FunnelEvent` insert. `BotLead` is a cache, never the source of truth.
- **LGPD**: `BotMessage` stores a `content_preview` (truncated, not the full transcript) — full conversational content stays in Chatwoot (Decisão 11: painel is read + deep link, never the message store of record). This bounds the retention/purge surface and avoids the painel becoming a second copy of sensitive conversation content. **Flagged as a product decision** — see final report; if product wants full transcript search in-painel, `content_preview`'s truncation length and the retention job both need revisiting.
- **Testing**: `npm test -- <pattern>`; after every task, `npm run build` (exit 0, which also runs `prisma generate`) then `npm test` (full suite green) before committing.
- **Cross-phase dependency the master doc itself introduces**: section 8 orders "Fase 2 — Rastreamento" before "Fase 3 — Módulo de automação WhatsApp," but attribution data (`ConversationAttribution`) is only ever *written* by the bot-event ingestion pipeline that Fase 3 builds (the `conversa.iniciada` event carries `ctwa_clid`/`source_id`/`link_code`). This plan keeps the phases in the master doc's order — Fase 2 builds the schema, settings CRUD, link-code embedding, and read-side query methods (which return empty/zero until data exists) — and Fase 3 Task 4 is where the actual write path (`AttributionService.record()` called from the event processor) gets wired in. Each Fase 2 task's Interfaces section notes this explicitly.

---

## Fase 1 — Fundação do valor (backend slice)

Everything else in section 8's Fase 1 (Home, Bloco Tráfego Pago UI, Glossário, responsividade, deploy) is frontend or ops. The backend already serves campaign/site-analytics data (`CampaignService`, `SiteAnalyticsService`, `OverviewService`) and link-level click stats (`WhatsAppTrackingService.getLinkStats`). Two backend gaps remain.

### Task 1: Extract `PeriodComparisonService` from `OverviewService`

**Problem:** `OverviewService.previousPeriod`/`metric`/`money`/`round1`/`round2` (`src/modules/reserve-client-portal/application/services/overview.service.ts:184-239`) already implement exactly the "período vs. período" comparison the master doc's §4.1 calls out as new work — but it's private and inline to one service. Every later phase (ROI, funnel metrics, Instagram, digest) needs the same previous-period math. Extracting it now avoids five re-implementations later.

**Files:**
- Create: `src/shared/analytics/period-comparison.service.ts`
- Test: `src/shared/analytics/period-comparison.service.spec.ts`
- Modify: `src/modules/reserve-client-portal/application/services/overview.service.ts` (delegate to the new service instead of the private methods; behavior-preserving)
- Modify: `src/modules/reserve-client-portal/reserve-client-portal.module.ts` (register `PeriodComparisonService` as a provider)

**Interfaces:**
- Produces: `class PeriodComparisonService { previousPeriod(from: Date, to: Date): { prevFrom: Date; prevTo: Date }; metric(value: number, previous: number | null, source: 'auto'|'server'|'manual'): { value; previous; delta; source }; money(cents: number): { value; currency: 'BRL' }; moneyWithSource(cents, source): {...}; pct(part, whole): number; ratio(numerator, denominator): number; round1(n): number; round2(n): number; isoDate(d: Date): string }`. Consumed by: Fase 2 Task 5 (campaign performance), Fase 3 Task 10 (module metrics), Fase 4 Task 5 (Instagram overview), Fase 5 Task 1 (ROI), Fase 5 Task 2 (digest).

- [ ] **Step 1: Write the failing test** — port the existing behavior verbatim into `period-comparison.service.spec.ts` (zero-safe division, delta sign, ISO date truncation), e.g.:

```ts
describe('PeriodComparisonService', () => {
  const svc = new PeriodComparisonService();

  it('computes the immediately preceding period of equal length', () => {
    const { prevFrom, prevTo } = svc.previousPeriod(new Date('2026-07-15'), new Date('2026-07-30'));
    expect(prevTo.getTime()).toBe(new Date('2026-07-15').getTime() - 1);
    expect(prevTo.getTime() - prevFrom.getTime()).toBe(new Date('2026-07-30').getTime() - new Date('2026-07-15').getTime());
  });

  it('ratio() and pct() are zero-safe on a zero denominator', () => {
    expect(svc.ratio(100, 0)).toBe(0);
    expect(svc.pct(10, 0)).toBe(0);
  });

  it('metric() computes delta only when a previous value exists', () => {
    expect(svc.metric(120, 100, 'auto')).toEqual({ value: 120, previous: 100, delta: 20, source: 'auto' });
    expect(svc.metric(120, null, 'auto')).toEqual({ value: 120, previous: null, delta: null, source: 'auto' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npm test -- period-comparison.service` → `Cannot find module`.
- [ ] **Step 3: Write the implementation** — move the method bodies verbatim from `OverviewService`, `@Injectable()`, no constructor dependencies (pure functions).
- [ ] **Step 4: Point `OverviewService` at it** — replace `this.previousPeriod(...)`/`this.metric(...)`/etc. calls with `this.periodComparison.previousPeriod(...)`, inject `PeriodComparisonService` in the constructor, delete the now-dead private methods. Run `overview.service.spec.ts` (if present) or the module's e2e-ish tests to confirm the refactor is behavior-preserving.
- [ ] **Step 5:** `npm run build && npm test` → green.
- [ ] **Step 6: Commit** — `git commit -m "refactor(client-portal): extract PeriodComparisonService from OverviewService"`.

### Task 2: Leads Camada 1 aggregate endpoint (cross-link breakdown)

**Problem:** `WhatsAppTrackingService.getLinkStats` gives by-day/device/country/city breakdown **per link**. §3.3's Camada 1 needs the same breakdown aggregated **across every link of a client** (cliques → conversas iniciadas → leads by day/device/city, client-wide).

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/leads-overview.service.ts`
- Test: `src/modules/reserve-client-portal/application/services/leads-overview.service.spec.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/client-portal.controller.ts` — add `GET :clientId/leads-overview?from&to`
- Modify: `reserve-client-portal.module.ts` (register service)

**Interfaces:**
- Consumes: `PrismaService.whatsAppLinkClick`, `PeriodComparisonService` (Task 1).
- Produces: `LeadsOverviewService.getOverview(clientId, from, to): Promise<{ clicks: Metric; byDay: {date,count}[]; byDevice: {...}[]; byCity: {...}[] }>`. This is the backend contract the frontend's `/leads` Camada 1 view reads.

- [ ] **Step 1: Failing test** — mock `prisma.whatsAppLinkClick.groupBy`/`count`, assert the query filters by `Link.client_id`, `clicked_at` range, and that the response shape matches the interface (including the period-over-period `clicks` metric via `PeriodComparisonService`).
- [ ] **Step 2:** `npm test -- leads-overview.service` → fails, module missing.
- [ ] **Step 3: Implement** — one `groupBy` query per breakdown dimension (mirrors the raw-SQL pattern already in `WhatsAppTrackingService.getLinkStats`, but `WHERE Link.client_id = ...` instead of `link_id = ...`), plus one `count` for current and previous period each, combined via `PeriodComparisonService.metric`.
- [ ] **Step 4:** wire the controller route (`AdminJwtGuard` only, matching `ClientPortalController`'s existing routes).
- [ ] **Step 5:** `npm run build && npm test`.
- [ ] **Step 6: Commit** — `git commit -m "feat(client-portal): leads camada-1 aggregate overview across all tracking links"`.

---

## Fase 2 — Rastreamento ponta a ponta (backend slice)

Master doc's Fase 2 also lists "persistir `ctwa_clid`/`source_id` no workflow 1 do bot" — that is N8N-side, out of this repo, and not actionable here. This slice builds everything the backend owns: schema, settings, link-code embedding, and read-side queries (which stay empty until Fase 3's ingestion pipeline writes to them — see Global Constraints).

### Task 1: Prisma models — `ConversationAttribution` (`atribuicao_conversa`) and `AttributionSettings`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260804000001_add_attribution_tables/migration.sql`
- Create: `src/shared/database/migrations.spec.ts` (new file — does not exist on `main`; every later migration task in this plan appends a `describe` block to it, following the pattern in the (unmerged) fase3 plan)

**Interfaces:**
- Produces: `model ConversationAttribution { id, tenant_id, numero_contato, ocorrido_em, fonte EAttributionSource, ad_id?, adset_id?, campaign_id?, ctwa_clid?, link_code?, utm_source?, utm_medium?, utm_campaign?, primeiro_toque Boolean @default(false), ultimo_toque Boolean @default(false), created_at }` `@@map("atribuicao_conversa")`; `model AttributionSettings { id, tenant_id @unique, window_days Int @default(30), source_priority Json @default("[]"), created_at, updated_at }` `@@map("attribution_settings")`; `enum EAttributionSource { anuncio link organico site }`. Consumed by Fase 2 Tasks 3–6, Fase 3 Task 4 (write path), Fase 5 Task 1 (ROI).

- [ ] **Step 1: Write the failing migration test**

```ts
// src/shared/database/migrations.spec.ts
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');
function readMigration(folder: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');
}

describe('20260804000001_add_attribution_tables', () => {
  const sql = readMigration('20260804000001_add_attribution_tables');

  it('creates atribuicao_conversa and attribution_settings in snake_case', () => {
    expect(sql).toContain('CREATE TABLE "atribuicao_conversa"');
    expect(sql).toContain('CREATE TABLE "attribution_settings"');
    expect(sql).toContain('"tenant_id" VARCHAR(25) NOT NULL');
    expect(sql).toContain('"ctwa_clid"');
    expect(sql).toContain('"link_code"');
    expect(sql).not.toMatch(/"tenantId"|"ctwaClid"|"linkCode"/);
  });

  it('gives attribution_settings one row per tenant', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "attribution_settings_tenant_id_key"');
  });

  it('indexes atribuicao_conversa for contact/date and link_code lookups', () => {
    expect(sql).toContain('atribuicao_conversa_tenant_id_numero_contato_idx');
    expect(sql).toContain('atribuicao_conversa_link_code_idx');
  });

  it('cascades on tenant delete', () => {
    expect(sql).toMatch(/atribuicao_conversa_tenant_id_fkey[\s\S]*ON DELETE CASCADE/);
    expect(sql).toMatch(/attribution_settings_tenant_id_fkey[\s\S]*ON DELETE CASCADE/);
  });
});
```

- [ ] **Step 2:** `npm test -- migrations.spec` → fails (`ENOENT`).
- [ ] **Step 3: Schema + migration.** Add to `prisma/schema.prisma`:

```prisma
enum EAttributionSource {
  anuncio
  link
  organico
  site
}

model ConversationAttribution {
  id             String             @id @default(cuid()) @db.VarChar(25)
  tenant_id      String             @db.VarChar(25)
  numero_contato String             @db.VarChar(20)
  ocorrido_em    DateTime
  fonte          EAttributionSource
  ad_id          String?            @db.VarChar(100)
  adset_id       String?            @db.VarChar(100)
  campaign_id    String?            @db.VarChar(100)
  ctwa_clid      String?            @db.VarChar(255)
  link_code      String?            @db.VarChar(20)
  utm_source     String?            @db.VarChar(100)
  utm_medium     String?            @db.VarChar(100)
  utm_campaign   String?            @db.VarChar(100)
  primeiro_toque Boolean            @default(false)
  ultimo_toque   Boolean            @default(false)
  created_at     DateTime           @default(now())
  Tenant         Tenant             @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@index([tenant_id, numero_contato])
  @@index([tenant_id, ocorrido_em])
  @@index([link_code])
  @@map("atribuicao_conversa")
}

model AttributionSettings {
  id              String   @id @default(cuid()) @db.VarChar(25)
  tenant_id       String   @unique @db.VarChar(25)
  window_days     Int      @default(30)
  source_priority Json     @default("[]")
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  Tenant          Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@map("attribution_settings")
}
```

  Add `ConversationAttributions ConversationAttribution[]` and `AttributionSettings AttributionSettings?` to `model Tenant`. Run `npx prisma migrate dev --name add_attribution_tables --create-only`, inspect the generated SQL matches the test's assertions (add the two `@@index` lines and the FK `ON DELETE CASCADE` if Prisma's default differs), then `npx prisma migrate dev` to apply.
- [ ] **Step 4:** `npm test -- migrations.spec && npm run build` → green.
- [ ] **Step 5: Commit** — `git commit -m "feat(attribution): add ConversationAttribution and AttributionSettings models"`.

### Task 2: `AttributionSettingsService` + admin CRUD (`[CRUD-pattern]`)

Follows the exact repository/service/controller shape of `WhatsAppTrackingController` (tenant/client-scoped admin CRUD, `AdminJwtGuard + RolesGuard`, `@Roles(super_admin, owner, manager)`).

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/attribution-settings.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/application/dtos/attribution-settings.dto.ts`
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-attribution-settings.controller.ts`
- Modify: `reserve-client-portal.module.ts`

**Interfaces:** `GET/PUT admin/hotel-portal/:tenantId/attribution-settings` → `{ window_days: number (1-90), source_priority: string[] }`. `AttributionSettingsService.getOrDefault(tenantId)` returns the default (`window_days: 30`) when no row exists yet — the settings screen must never 404 on a fresh tenant.

- [ ] Failing test: `getOrDefault` returns the seeded default `{ window_days: 30, source_priority: [] }` when `prisma.attributionSettings.findUnique` resolves `null`; `upsert` validates `window_days` is `1..90` (class-validator `@Min(1) @Max(90)` on the DTO) and rejects out-of-range with `BadRequestException` (or 400 via `ValidationPipe`, whichever the module already relies on — check `main.ts`'s global `ValidationPipe` config first, it's already global so DTO decorators are enough).
- [ ] Implement service (`getOrDefault`, `upsert` via `prisma.attributionSettings.upsert`), DTO, controller (`@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)` for read; write restricted the same, no anomaly to preserve here).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(attribution): AttributionSettings CRUD with 30-day default"`.

### Task 3: Embed link-code token into the WhatsApp redirect message

**Problem (§6.2):** the redirect already exists (`WhatsAppRedirectController` → `WhatsAppTrackingService.resolveAndTrack`) but the pre-filled `wa.me?text=` message has no way for the bot to recover which link the click came from. The bot-side extraction ("bot extrai `[AbCd3xYz]` da primeira mensagem") is N8N work, out of scope — this task only guarantees the code is present and recoverable in the message text the redirect builds.

**Files:**
- Modify: `src/modules/reserve-client-portal/application/services/whatsapp-tracking.service.ts` (`buildWhatsAppUrl`)
- Test: extend `whatsapp-tracking.service.spec.ts` (create if it doesn't exist yet — check first)

**Interfaces:** `buildWhatsAppUrl(phone, message, shortCode)` appends `\n[${shortCode}]` to whatever message the admin configured (or is the entire message when the link has none), so the bot always finds a `[code]` token in the first message regardless of whether the admin set custom text.

- [ ] Failing test: `buildWhatsAppUrl('5511999999999', 'Olá! Vim pelo site', 'AbCd3xYz')` produces a `text=` query param that URL-decodes to `Olá! Vim pelo site\n[AbCd3xYz]`; a link with no custom `message` still produces `text=` decoding to `[AbCd3xYz]` alone (never an empty/missing text param, since the bot has nothing to parse otherwise).
- [ ] Implement: change the private `buildWhatsAppUrl(phone, message)` signature to accept `shortCode`, thread it through from `resolveAndTrack`'s existing `link.short_code` (already in scope, just not passed today).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(whatsapp-links): embed short_code token in the pre-filled wa.me message"`.

### Task 4: `AttributionService.record()` — write-side contract (called from Fase 3)

Ships now as a standalone, fully-tested unit even though nothing calls it until Fase 3 Task 4 wires the event processor to it — this decouples "the write logic is correct" from "the ingestion pipeline exists," per the Global Constraints note on phase ordering.

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/attribution.service.ts` (+ `.spec.ts`)
- Modify: `reserve-client-portal.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AttributionSettingsService` (Task 2).
- Produces: `AttributionService.record(tenantId, input: { numeroContato, ocorridoEm, ctwaClid?, sourceId?, sourceType?, sourceUrl?, linkCode?, utmSource?, utmMedium?, utmCampaign? }): Promise<void>`. Maps `sourceType` (Meta's `referral.source_type`, values like `ad`/`post`/`unknown`) → `fonte`; a bare `linkCode` with no Meta referral maps to `fonte: 'link'`; neither present maps to `fonte: 'organico'`. Sets `primeiro_toque` on the contact's very first attribution row for the tenant, `ultimo_toque` on every new row (and clears the previous row's `ultimo_toque`, in the same transaction) — so "last touch" is always exactly one row per contact, matching §6.4's "modelo de atribuição: último toque como padrão... primeiro toque registrado para análise interna."

- [ ] Failing test: first call for a contact sets `primeiro_toque: true, ultimo_toque: true`; a second call for the same contact sets the new row's `ultimo_toque: true` and issues an `updateMany` clearing `ultimo_toque` on the contact's prior rows, wrapped in `prisma.$transaction`; `fonte` mapping table covered for all four source values including the `ad_id present but source_type missing → 'anuncio'` fallback (Meta doesn't always populate `source_type`).
- [ ] Implement with `prisma.$transaction([updateMany(...), create(...)])`.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(attribution): AttributionService.record() with first/last-touch bookkeeping"`.

### Task 5: Campaign performance rollup — conversas/qualificados por anúncio

**Problem (§3.2, §8 Fase 2):** `CampaignService`'s existing "desempenho por campanha" table shows spend/clicks only. This task adds conversation and qualified-lead counts per campaign, joined through `ConversationAttribution.campaign_id` → `FunnelEvent`.

**⚠️ Dependency:** the "qualificados" count requires `FunnelEvent` (Fase 3 Task 1). Implement and test this task's query against a **mocked** `FunnelEvent` read (interface-first) so the task is completable in Fase 2's sequence slot; the query is exercised end-to-end once Fase 3 ships.

**Files:**
- Modify: `src/modules/reserve-client-portal/application/services/campaign.service.ts`
- Test: extend `campaign.service.spec.ts`

**Interfaces:** `CampaignService.getCampaignPerformance(clientId, from, to)` gains `conversas: number` and `qualificados: number` per row, sourced by resolving `client_id → tenant_id` (via `HotelClient`), then `groupBy` on `ConversationAttribution.campaign_id` for `conversas`, and a `FunnelEvent` count of distinct `numero_contato` reaching `para_estagio IN (QUALIFICADO, PAGAMENTO, FECHADO)` joined back to the same `campaign_id` via each contact's latest attribution row, for `qualificados`.

- [ ] Failing test asserts the shape and the join logic (mock both `groupBy` calls), including the zero-data case (tenant with no attribution rows yet → `conversas: 0, qualificados: 0` per campaign row, not an error).
- [ ] Implement, resolving `tenant_id` via `hotelClientService`/`prisma.hotelClient.findUnique({ where: { id: clientId }, select: { tenant_id: true } })` and throwing a clear `BadRequestException` if `tenant_id` is null (the Global Constraints guard clause).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(campaigns): add conversas/qualificados columns to campaign performance"`.

### Task 6: Click → conversation conversion rate per link

**Files:**
- Modify: `whatsapp-tracking.service.ts` (`getLinkStats`)
- Test: extend `whatsapp-tracking.service.spec.ts`

**Interfaces:** `getLinkStats` response gains `conversion: { clicks: number; conversations: number; rate: number }` — `conversations` counts `ConversationAttribution` rows with `link_code = link.short_code` in the same window as the click stats; `rate = conversations / clicks` (zero-safe, via `PeriodComparisonService.ratio` — but this service doesn't currently depend on `PeriodComparisonService`, so inject it here).

- [ ] Failing test: `rate` is `0` when `clicks = 0`; `conversations` counts only rows matching this exact `link_code`.
- [ ] Implement + `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(whatsapp-links): click-to-conversation conversion rate per link"`.

---

## Fase 3 — Módulo de automação WhatsApp (backend slice)

The largest phase — matches the master doc's own "Alta" complexity rating. N8N-side work (the three workflow nodes with `continueOnFail`) is out of repo; this slice is everything the painel owns.

### Task 1: Prisma models — bot integration, ingestion ledger, funnel log, read projections

One migration, six models — grouped because they're introduced together and several have FK relationships to each other via `tenant_id` (not direct FKs between them, to keep the append-only log decoupled from the projections it feeds).

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260804000002_add_bot_automation_tables/migration.sql`
- Modify: `src/shared/database/migrations.spec.ts` (append `describe` block)

**Interfaces:**

```prisma
enum EBotContactStatus { ATIVO PAUSADO }
enum EBotMessageRole   { user assistant human }
enum EBotMessageType   { texto audio imagem }
enum EFunnelStage      { NOVO QUALIFICADO PAGAMENTO FECHADO FRIO }
enum EFunnelEventAuthor { bot humano }

model BotIntegrationConfig {
  id                             String    @id @default(cuid()) @db.VarChar(25)
  tenant_id                      String    @unique @db.VarChar(25)
  tenant_key_hash                String
  tenant_key_salt                String
  active                         Boolean   @default(true)
  n8n_stage_webhook_url          String?   @db.VarChar(500)
  n8n_config_publish_webhook_url String?   @db.VarChar(500)
  last_heartbeat_at              DateTime?
  created_at                     DateTime  @default(now())
  updated_at                     DateTime  @updatedAt
  Tenant                         Tenant    @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@map("bot_integration_configs")
}

model BotIngestionEvent {
  id           String    @id @default(cuid()) @db.VarChar(25)
  tenant_id    String    @db.VarChar(25)
  event_id     String    @db.VarChar(100)
  event_type   String    @db.VarChar(50)
  occurred_at  DateTime
  payload      Json
  status       String    @default("RECEIVED") @db.VarChar(20) // RECEIVED | PROCESSED | FAILED
  error_message String?  @db.Text
  received_at  DateTime  @default(now())
  processed_at DateTime?

  @@unique([tenant_id, event_id])
  @@index([tenant_id, event_type, received_at])
  @@map("bot_ingestion_events")
}

model BotContact {
  id                 String            @id @default(cuid()) @db.VarChar(25)
  tenant_id          String            @db.VarChar(25)
  numero_contato     String            @db.VarChar(20)
  nome               String?           @db.VarChar(150)
  origem             String?           @db.VarChar(20) // anuncio | organico
  status_bot         EBotContactStatus @default(ATIVO)
  motivo_pausa       String?           @db.VarChar(255)
  janela_expira      DateTime?
  consentimento_lgpd Boolean           @default(false)
  last_message_at    DateTime?
  created_at         DateTime          @default(now())
  updated_at         DateTime          @updatedAt

  @@unique([tenant_id, numero_contato])
  @@map("bot_contacts")
}

model BotMessage {
  id              String          @id @default(cuid()) @db.VarChar(25)
  tenant_id       String          @db.VarChar(25)
  numero_contato  String          @db.VarChar(20)
  role            EBotMessageRole
  tipo            EBotMessageType
  content_preview String?         @db.VarChar(280)
  ocorrido_em     DateTime
  created_at      DateTime        @default(now())

  @@index([tenant_id, numero_contato, ocorrido_em])
  @@map("bot_messages")
}

model FunnelEvent {
  id             String              @id @default(cuid()) @db.VarChar(25)
  tenant_id      String              @db.VarChar(25)
  numero_contato String              @db.VarChar(20)
  de_estagio     EFunnelStage?
  para_estagio   EFunnelStage
  autor_tipo     EFunnelEventAuthor
  autor_id       String?             @db.VarChar(25)
  motivo         String?             @db.VarChar(255)
  ocorrido_em    DateTime
  created_at     DateTime            @default(now())

  @@index([tenant_id, numero_contato, ocorrido_em])
  @@index([tenant_id, para_estagio])
  @@map("funil_eventos")
}

model BotLead {
  id                    String       @id @default(cuid()) @db.VarChar(25)
  tenant_id             String       @db.VarChar(25)
  numero_contato        String       @db.VarChar(20)
  current_stage         EFunnelStage @default(NOVO)
  perfil                String?      @db.VarChar(100)
  acomodacao_interesse  String?      @db.VarChar(255)
  datas_interesse       Json?
  updated_at            DateTime     @updatedAt

  @@unique([tenant_id, numero_contato])
  @@map("bot_leads")
}
```

  Add the reverse relation `BotIntegrationConfig BotIntegrationConfig?` to `model Tenant` (the other five models are tenant-scoped by convention/index, not FK, exactly like `ConversationAttribution`'s siblings would be if not FK'd — **decision**: `BotContact`/`BotMessage`/`FunnelEvent`/`BotLead` intentionally have **no** `Tenant` relation field to avoid five more reverse-relation arrays cluttering `model Tenant`; they're queried by `tenant_id` directly like `Lead.tenant_id` already is. `BotIntegrationConfig` gets the FK because it's 1:1 and config-like, matching `TenantBillingConfig`'s existing precedent).

- [ ] **Step 1:** extend `migrations.spec.ts` with a `describe('20260804000002_add_bot_automation_tables', ...)` asserting: all six tables created, `bot_ingestion_events` has `CREATE UNIQUE INDEX ..._tenant_id_event_id_key`, `bot_contacts`/`bot_leads` have their `tenant_id_numero_contato` unique index, `funil_eventos` has **no** `UPDATE`-enabling unique constraint on `(tenant_id, numero_contato)` (only non-unique indexes) — this is the assertion that encodes "append-only" at the schema level: a test that greps the SQL and fails if a future edit accidentally adds a uniqueness constraint that would force upserts.
- [ ] **Step 2:** `npm test -- migrations.spec` → fails.
- [ ] **Step 3:** write schema + `npx prisma migrate dev --name add_bot_automation_tables`.
- [ ] **Step 4:** `npm test -- migrations.spec && npm run build`.
- [ ] **Step 5: Commit** — `git commit -m "feat(bot-automation): add BotIntegrationConfig, BotIngestionEvent, BotContact, BotMessage, FunnelEvent, BotLead"`.

### Task 2: `BotEventKeyGuard` — per-tenant key auth for the ingestion endpoint

Mirrors `TenantKeyGuard` (`reserve-leads`) but keyed by `BotIntegrationConfig` instead of `LeadCollection`, and resolves `tenant_id` from the URL, not by scanning every row (only one config per tenant, so a direct `findUnique` is correct here — `TenantKeyGuard`'s O(n) scan-and-hash-compare is a pattern to *not* copy, since a single tenant lookup makes a timing-safe compare straightforward).

**Files:**
- Create: `src/modules/reserve-client-portal/infrastructure/guards/bot-event-key.guard.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/providers/bot-key.provider.ts` (+ `.spec.ts`) — hash/verify, PBKDF2-SHA512 matching `TenantKeyGuard`'s "new format" branch (no legacy SHA-256 fallback needed, this is a new table).
- Create: `src/modules/reserve-client-portal/application/dtos/bot-integration-config.dto.ts`

**Interfaces:** `BotKeyProvider.hash(rawKey): { hash, salt }`, `BotKeyProvider.verify(rawKey, hash, salt): boolean` (timing-safe via `crypto.timingSafeEqual`). `BotEventKeyGuard.canActivate` reads `x-tenant-key` header + `tenant_id` (route param or resolved from a tenant-scoped path — this endpoint takes `tenant_id` as a header too, `x-tenant-id`, since the ingestion payload carries no tenant identity of its own and N8N's node config is "one key + one tenant id per client," matching Decisão 14's "cada novo cliente com bot precisa apenas da chave de tenant no nó de eventos"), looks up `BotIntegrationConfig` by `tenant_id`, verifies, sets `request.tenant_id` and `request.bot_integration_config_id`.

- [ ] Failing test: missing `x-tenant-key` or `x-tenant-id` → `UnauthorizedException`; unknown `tenant_id` → `UnauthorizedException` (not `NotFoundException` — never leak tenant existence to an unauthenticated caller); wrong key → `UnauthorizedException`; `active: false` config → `UnauthorizedException` (a deactivated integration must reject, not silently accept); correct key → `canActivate` resolves `true` and sets `request.tenant_id`.
- [ ] Implement `BotKeyProvider` (copy `TenantKeyGuard`'s PBKDF2 parameters: 856 iterations, SHA-512, salted with `ENCRYPT_PRIVATE_KEY`) and the guard.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(bot-events): BotEventKeyGuard with per-tenant PBKDF2 key verification"`.

### Task 3: `POST /api/ingest/bot-events` — idempotent ingestion endpoint

**Files:**
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/bot-event-ingestion.controller.ts`
- Create: `src/modules/reserve-client-portal/application/services/bot-event-ingestion.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/application/dtos/bot-event.dto.ts`

**Interfaces:**
- Consumes: `BotEventKeyGuard` (Task 2), `BotEventProcessor` (Task 4, injected but not yet functional until that task lands — build against its interface now).
- Produces: `BotEventIngestionService.ingest(tenantId, dto: { event_id, event_type, occurred_at, payload }): Promise<{ status: 202 | 400 | 500 }>`.

```ts
// Contract shape, from §5.6
class BotEventDto {
  @IsUUID() event_id: string;
  @IsString() event_type: string;
  @IsISO8601() occurred_at: string;
  @IsObject() payload: Record<string, unknown>;
}
```

- [ ] Failing test: duplicate `event_id` for the same `tenant_id` → ledger `create` throws Prisma unique-constraint error (`P2002`), service catches it and returns `202` without calling the processor a second time (idempotency); first-time event → ledger row created `status: RECEIVED`, processor invoked, ledger updated to `PROCESSED` on success; processor throwing → ledger updated to `FAILED` with `error_message`, service returns `500` (triggers N8N retry — a retried call then hits the duplicate-`event_id` branch, so a subsequently-successful processor run on retry does **not** happen automatically; see Task 4's note on this exact edge case: the plan accepts "the ledger is written once; failed processing needs its own reconciliation," and Task 4 adds a small cron sweep of `FAILED`/stuck-`RECEIVED` rows rather than relying on N8N's retry to re-drive processing, because idempotency-by-`event_id` and reprocessing-on-retry are in tension and the ledger, not the HTTP retry, is the correct place to resolve it).
- [ ] Implement service: `prisma.$transaction` is *not* used here on purpose — the ledger insert must commit even if the processor later fails, so failure is recorded, not rolled back into invisibility. Sequence: `try { create ledger RECEIVED } catch (P2002) { return 202 }`, then `try { await processor.process(tenantId, dto) ; update ledger PROCESSED } catch (e) { update ledger FAILED, error_message; return 500 }`, else `return 202`.
- [ ] Controller: `@SkipThrottle()`, `@UseGuards(BotEventKeyGuard)`, `@Post()` at `ingest/bot-events`, always returns the status the service computed (matching `BookingWebhookController`'s `@Res()` + explicit status pattern).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(bot-events): POST /api/ingest/bot-events with idempotent ledger"`.

### Task 4: `BotEventProcessor` — fan-out for contact/attribution/message events

Split into this task (contact lifecycle + attribution + messages — the `conversa.iniciada`/`mensagem.recebida`/`mensagem.enviada` family) and Task 5 (funnel/payment events) to keep each TDD cycle focused, matching how the master doc's own event catalog (§5.6) groups them.

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/bot-event-processor.service.ts` (+ `.spec.ts`)
- Modify: `bot-event-ingestion.service.ts` (inject the real processor)

**Interfaces:**
- Consumes: `AttributionService.record()` (Fase 2 Task 4 — this is the wiring point referenced in Global Constraints), `PrismaService` (`botContact.upsert`, `botMessage.create`).
- Produces: `BotEventProcessor.process(tenantId, event: BotEventDto): Promise<void>`, dispatching on `event.event_type`:
  - `conversa.iniciada` → `botContact.upsert` (create if new, touch `last_message_at`/`origem`) + `attributionService.record(tenantId, { numeroContato: payload.contato, ocorridoEm, ctwaClid: payload.ctwa_clid, sourceId: payload.source_id, linkCode: payload.link_code, ... })`.
  - `mensagem.recebida` / `mensagem.enviada` → `botMessage.create` with `role` derived from event type (`recebida→user`, `enviada→assistant`; a third event type isn't in the catalog for `human` — `human`-authored messages arrive from Chatwoot, out of this event catalog's scope today, `role: human` is reserved for future use, not written by this processor) and `content_preview` truncated to 280 chars server-side regardless of what N8N sends (defense in depth for the LGPD constraint).
  - unknown `event_type` → no-op, logged at `warn`, **does not throw** (Global Constraints: unknown type is a `202`, not a retry).

- [ ] Failing test per branch: `conversa.iniciada` calls both `botContact.upsert` and `attributionService.record` with correctly mapped fields; a message event truncates a 400-char payload string to 280 chars in `content_preview`; an unrecognized `event_type` resolves without throwing and without any Prisma call.
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(bot-events): process conversa.iniciada / mensagem.* into BotContact, BotMessage, ConversationAttribution"`.

### Task 5: `BotEventProcessor` — funnel, payment, pause/reactivate, heartbeat, follow-up

**Files:**
- Modify: `bot-event-processor.service.ts` (+ `.spec.ts`)
- Modify: `prisma/schema.prisma` — add `FollowupAttempt` (needed for §5.7's "efetividade do follow-up" metric, not explicitly in §4.2's table list but required by an explicitly-listed metric)
- Create: `prisma/migrations/20260804000003_add_followup_attempts/migration.sql`

**Interfaces:**

```prisma
model FollowupAttempt {
  id             String   @id @default(cuid()) @db.VarChar(25)
  tenant_id      String   @db.VarChar(25)
  numero_contato String   @db.VarChar(20)
  tentativa      Int      @db.SmallInt // 1-4
  tipo_janela    String   @db.VarChar(10) // 4h | 24h | 72h | 7d
  status         String   @db.VarChar(20) // AGUARDANDO | RESPONDEU | FRIO
  ocorrido_em    DateTime
  created_at     DateTime @default(now())

  @@index([tenant_id, numero_contato])
  @@map("bot_followup_attempts")
}
```

  `BotEventProcessor.process` dispatch extended:
  - `lead.estagio_alterado` → read `botLead` current stage (or default `NOVO` if none), `funnelEvent.create({ de_estagio: current, para_estagio: payload.para, autor_tipo: 'bot' })`, then `botLead.upsert` to the new stage — **both writes in one `$transaction`**, this is the append-only invariant's enforcement point.
  - `lead.pronto_para_fechar` → same pattern, `para_estagio: QUALIFICADO`... — **ambiguity**: the event catalog (§5.6) lists `lead.pronto_para_fechar` as distinct from `lead.estagio_alterado`, but §3.3 says "prontos para fechar" is the `[TRANSFERIR]` tag, and §5.4's stage list is `NOVO/QUALIFICADO/PAGAMENTO/FECHADO/FRIO` with no explicit "pronto para fechar" stage. This plan treats `lead.pronto_para_fechar` as a **non-stage-changing** marker event (insert a `FunnelEvent` row with `de_estagio: null, para_estagio: current_stage` — i.e. a same-stage annotation event carrying `motivo: 'TRANSFERIR'`) rather than inventing a sixth `EFunnelStage` value not in the master doc's own list. **Flagged as a product decision** — see final report.
  - `pagamento.solicitado` → `FunnelEvent` to `PAGAMENTO` + `botLead` update.
  - `lead.fechado` → `FunnelEvent` to `FECHADO` + `botLead` update.
  - `bot.pausado` / `bot.reativado` → `botContact.update({ status_bot, motivo_pausa })`.
  - `sistema.heartbeat` → `botIntegrationConfig.update({ last_heartbeat_at: event.occurred_at })`.
  - `followup.enviado` → `followupAttempt.create`.

- [ ] Failing tests: `lead.estagio_alterado` writes exactly one `FunnelEvent` and one `botLead` upsert inside a single `$transaction` call (assert `prisma.$transaction` invoked with an array of two operations, not two separate calls — this is the assertion that would catch a future edit accidentally breaking atomicity); `bot.pausado` updates `status_bot: PAUSADO` and stores `motivo_pausa`; `sistema.heartbeat` updates `last_heartbeat_at` to the event's `occurred_at`, not `now()` (heartbeat events can arrive slightly delayed; store what N8N reported).
- [ ] Implement, migrate `FollowupAttempt` (Steps mirror Task 1's migration pattern — schema, migration, `migrations.spec.ts` block, `prisma migrate dev`).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(bot-events): process funnel, payment, pause/reactivate, heartbeat, and follow-up events"`.

### Task 6: Human-authored funnel stage moves (`PATCH .../funnel/:contactId/stage`)

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/funnel.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/application/dtos/funnel-stage-change.dto.ts`
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-whatsapp-funnel.controller.ts`
- Modify: `reserve-client-portal.module.ts`

**Interfaces:** `FunnelService.moveStage(tenantId, numeroContato, paraEstagio, adminId, motivo?)` — same `$transaction([funnelEvent.create({ autor_tipo: 'humano', autor_id: adminId }), botLead.upsert])` shape as Task 5's bot-authored path, then enqueues a reverse-webhook dispatch (Task 7). Route: `PATCH admin/hotel-portal/:tenantId/whatsapp/funnel/:contactId/stage`, `AdminJwtGuard + TenantGuard + RolesGuard`, `@Roles(viewer excluded — viewer cannot move leads; editor, manager, owner, super_admin can)`.

- [ ] Failing test: writes the `FunnelEvent` with `autor_tipo: 'humano'` and the caller's `admin_id`; rejects a `paraEstagio` equal to the current stage with `BadRequestException` (moving to the same stage is a no-op the UI shouldn't allow, and a same-stage `FunnelEvent` would break the "tempo médio por estágio" metric's assumption that consecutive events differ).
- [ ] Implement + controller.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(whatsapp-funnel): human-authored stage moves via append-only FunnelEvent"`.

### Task 7: Reverse webhook dispatcher + reconciliation cron (§5.4 "sincronização de volta")

**Files:**
- Modify: `prisma/schema.prisma` — `BotStageWebhookDispatch`
- Create: `prisma/migrations/20260804000004_add_stage_webhook_dispatch/migration.sql`
- Create: `src/modules/reserve-client-portal/infrastructure/providers/bot-stage-webhook.provider.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/providers/bot-reconciliation-cron.provider.ts` (+ `.spec.ts`)
- Modify: `funnel.service.ts` (enqueue dispatch after Task 6's stage write)

**Interfaces:**

```prisma
model BotStageWebhookDispatch {
  id              String   @id @default(cuid()) @db.VarChar(25)
  tenant_id       String   @db.VarChar(25)
  funnel_event_id String   @db.VarChar(25)
  status          String   @default("PENDING") @db.VarChar(10) // PENDING | SENT | FAILED
  attempts        Int      @default(0) @db.SmallInt
  last_attempt_at DateTime?
  created_at      DateTime @default(now())

  @@index([tenant_id, status])
  @@map("bot_stage_webhook_dispatches")
}
```

  `BotStageWebhookProvider.dispatch(tenantId, funnelEventId): Promise<void>` — `axios.post(config.n8n_stage_webhook_url, { numero_contato, para_estagio, ocorrido_em }, { timeout: 5000 })`; on success, `botStageWebhookDispatch.update({ status: SENT })`; on any error (timeout, non-2xx, missing `n8n_stage_webhook_url`), `update({ status: FAILED, attempts: increment(1), last_attempt_at: now() })` — **never throws**, since a human just moved a lead in the painel and that action must succeed regardless of N8N's reachability (§5.4: "se a chamada falhar, o log de eventos permanece como verdade e um job reconcilia").

  `BotReconciliationCronProvider` — `@Cron(CronExpression.EVERY_10_MINUTES)`, re-dispatches every `FAILED` row with `attempts < 5`, giving up (leaving `FAILED`, surfaced on an admin health screen — not built in this plan, flagged as a Fase 6 monitoring follow-up) beyond that.

- [ ] Failing tests: dispatch success → `status: SENT`; dispatch failure (mock `axios.post` rejecting) → `status: FAILED, attempts: 1`, and the call **resolves**, not rejects (the caller — `FunnelService.moveStage` — must never fail the user-facing request because of this); reconciliation cron re-dispatches only rows with `attempts < 5` and skips `SENT` rows.
- [ ] Implement (migration first, following Task 1's pattern), providers, wire into `funnel.service.ts` as fire-and-forget (`.catch(() => {})` at the call site is redundant given the provider never throws, but keep it as documented defense-in-depth, matching `whatsapp-tracking.service.ts`'s own comment on the same pattern).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(whatsapp-funnel): reverse webhook dispatch to N8N with 10-minute reconciliation cron"`.

### Task 8: Bloco Canais — `GET .../whatsapp/channels`

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/bot-channel-health.service.ts` (+ `.spec.ts`)
- Modify: `client-portal.controller.ts` — add `GET :clientId/whatsapp/channels`

**Interfaces:** resolves `client_id → tenant_id`, returns `{ whatsapp: { connected: boolean; botEnabled: boolean; heartbeatAgeMinutes: number | null; heartbeatStale: boolean (> 90 min); activeConversations: number (BotContact with last_message_at within 24h); pausedAwaitingHuman: number (BotContact status_bot=PAUSADO) }; instagram: {...} (stubbed until Fase 4); metaAds: { connected, tokenStatus } (from existing HotelApiCredential) }`.

- [ ] Failing test: `heartbeatStale` true when `last_heartbeat_at` is null or older than 90 minutes; `pausedAwaitingHuman` count matches a `botContact.count({ where: { tenant_id, status_bot: 'PAUSADO' } })`.
- [ ] Implement + route.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(whatsapp-channels): channel health endpoint (heartbeat, paused contacts, tokens)"`.

### Task 9: Bloco Conversas — list/search/detail (read-only) + Chatwoot deep link

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/bot-conversation.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/application/dtos/list-conversations-query.dto.ts`
- Modify: `client-portal.controller.ts` — `GET :clientId/whatsapp/conversations`, `GET :clientId/whatsapp/conversations/:numeroContato`

**Interfaces:** list supports `search` (by `numero_contato`/`nome`), `from`/`to`, `stage` filter (joins `BotLead.current_stage`); each row includes `chatwootDeepLink: string` built from a per-tenant Chatwoot base URL — **new field needed**: `BotIntegrationConfig.chatwoot_base_url String?` (add via a small migration, e.g. `.../chatwoot.reservemkt.com.br/app/accounts/:id/conversations`, exact URL shape **ambiguous — needs Chatwoot account/inbox ID convention from the ops team**, flagged in final report). Detail endpoint returns the contact + its `BotMessage` history ordered by `ocorrido_em`, with `role`/`tipo` as-is (client already renders bot/human/user distinctly per §5.3).

- [ ] Failing test: search filters correctly; deep link is built from `chatwoot_base_url` + `numero_contato`, and is `null` when the tenant has no `chatwoot_base_url` configured (never a broken link).
- [ ] Implement (small migration for `chatwoot_base_url` first).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(whatsapp-conversations): read-only list/search/detail with Chatwoot deep link"`.

### Task 10: Bloco Funil — board + metrics (§5.7)

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/funnel-metrics.service.ts` (+ `.spec.ts`)
- Modify: `client-portal.controller.ts` — `GET :clientId/whatsapp/funnel`, `GET :clientId/whatsapp/funnel/metrics`

**Interfaces:**
- Board: `{ stage: EFunnelStage; count: number; leads: {numeroContato, nome, acomodacaoInteresse, datasInteresse}[] }[]`, from `botLead.groupBy(['current_stage'])` + per-stage `findMany` (paginated, capped at 50 per stage server-side — a stage column that renders 5,000 cards is a frontend problem this endpoint prevents by design).
- Metrics (all via `PeriodComparisonService` from Fase 1 Task 1): conversas iniciadas w/ variação, taxa de resposta do bot (assistant messages / user messages within the same contact-window), tempo médio primeira resposta (first `assistant` `BotMessage.ocorrido_em` − contact's first `user` message), distribuição do funil, **tempo médio em cada estágio** (self-join `FunnelEvent` per contact: consecutive rows' `ocorrido_em` delta, averaged per `para_estagio` — this is the metric §5.4 calls out as the direct payoff of the append-only log), taxa de qualificação, leads prontos (count of `motivo: 'TRANSFERIR'` annotation events per Task 5's ambiguity resolution, in-window), taxa de conversão por etapa (stage-to-stage funnel percentages, fronteira marked between `PAGAMENTO`→`FECHADO`), efetividade do follow-up (`FollowupAttempt` grouped by `tipo_janela`/`status`), volume por origem (`BotContact.origem` distribution), contatos pausados, áudios transcritos (`BotMessage` count where `tipo = audio`).

- [ ] Failing tests, one per metric family (at minimum: tempo médio por estágio's self-join logic, since it's the least standard query here — use a raw `$queryRaw` with `LAG() OVER (PARTITION BY numero_contato ORDER BY ocorrido_em)` matching the raw-SQL precedent already used in `whatsapp-tracking.service.ts`'s `getLinkStats`).
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(whatsapp-funnel): board view and full §5.7 metrics suite"`.

### Task 11: LGPD — retention setting + purge cron + export/delete

**Files:**
- Modify: `prisma/schema.prisma` — `BotDataRetentionSetting`
- Create: `prisma/migrations/20260804000005_add_bot_retention_setting/migration.sql`
- Create: `src/modules/reserve-client-portal/application/services/bot-retention.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/providers/bot-retention-purge-cron.provider.ts` (+ `.spec.ts`)
- Modify: `admin-whatsapp-funnel.controller.ts` or new `admin-whatsapp-contact.controller.ts` — `POST :tenantId/whatsapp/contacts/:numeroContato/export`, `DELETE :tenantId/whatsapp/contacts/:numeroContato`, both `@Roles(EAdminRole.super_admin)` per §5.8 "exportação e exclusão... disponíveis ao `admin`" (mapped to `super_admin`, since the master doc's "admin" role has no exact match — see the `funcionary`-role ambiguity noted in Global Constraints, same root cause).

**Interfaces:** `BotDataRetentionSetting { tenant_id unique, retention_days Int @default(365) }`. Purge cron (`@Cron(CronExpression.EVERY_DAY_AT_3AM)`) deletes `BotMessage` and `BotIngestionEvent.payload` (nulls the JSON, keeps the ledger row for idempotency history) older than each tenant's `retention_days` — **never** deletes `FunnelEvent` (the audit trail is explicitly the point of the append-only design; §5.8 doesn't ask for funnel-event purge, only conversation content). Export: dumps `BotContact` + all `BotMessage`/`FunnelEvent` rows for the contact as JSON. Delete: removes `BotContact`, `BotMessage`, sets `FunnelEvent.numero_contato` unchanged but **flagged** — deleting the funnel history for a specific contact conflicts with the append-only audit guarantee; this plan's delete endpoint anonymizes `numero_contato` (hash it) on `FunnelEvent`/`BotIngestionEvent` rows rather than deleting them, preserving aggregate metrics while satisfying "right to erasure" on the identifying field. **Flagged as a product/legal decision** — see final report.

- [ ] Failing tests: purge cron only touches rows older than the tenant's configured `retention_days` (default 365 when unset); export returns all rows for the contact; delete anonymizes (not deletes) `FunnelEvent.numero_contato` and hard-deletes `BotMessage`/`BotContact`.
- [ ] Implement (migration first).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(lgpd): per-tenant retention purge cron and contact export/erase endpoints"`.

### Task 12: `BotIntegrationConfig` admin CRUD (`[CRUD-pattern]`) — provisioning a new bot tenant

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/bot-integration-config.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-bot-integration-config.controller.ts`

**Interfaces:** `POST admin/hotel-portal/:tenantId/bot-integration-config` (super_admin/owner only — this mints the secret N8N key) → generates a random key, returns it **once** in the response body (never stored/retrievable again, matching `LeadCollection`'s `secretKeyHash` precedent of never returning the plaintext key on subsequent reads), stores only the hash/salt. `PATCH .../regenerate-key` and `PATCH .../deactivate` follow the same one-time-reveal contract. This is §4.4's onboarding step 4 ("gerar chave de tenant, configurar o nó de eventos no N8N") made concrete.

- [ ] Failing test: create returns the plaintext key once; a subsequent `GET` (if any) never includes it; `verify()` (Task 2's `BotKeyProvider`) succeeds against the returned plaintext.
- [ ] Implement, controller, wire into module.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(bot-integration): admin CRUD for provisioning per-tenant bot event keys"`.

---

## Fase 4 — Instagram + Conteúdo (backend slice)

### Task 1: Add `INSTAGRAM` to `EPlatform`, reuse `HotelApiCredential`

**Problem:** `EPlatform` (`src/modules/reserve-client-portal/domain/enums/platform.enum.ts`) is `GA4 | META_ADS | GOOGLE_ADS` — no `INSTAGRAM`. §3.4 explicitly says "mesma infraestrutura OAuth da Meta já usada para Ads," i.e. reuse `HotelApiCredential`, just widen the enum.

**Files:**
- Modify: `src/modules/reserve-client-portal/domain/enums/platform.enum.ts`
- Modify: `prisma/schema.prisma` (`enum EPlatform` — Prisma enums require a migration to add a value)
- Create: `prisma/migrations/20260804000006_add_instagram_platform/migration.sql` (`ALTER TYPE "EPlatform" ADD VALUE 'INSTAGRAM'` — **note**: Postgres can't add an enum value inside the same transaction as other DDL in older versions; Prisma 7 handles this as a separate statement automatically when using `migrate dev`, verify the generated SQL puts `ALTER TYPE` in its own migration file, which this task already does by isolating it)

**Interfaces:** `EPlatform.INSTAGRAM = 'INSTAGRAM'` in both the Prisma enum and the domain enum (kept in sync manually — no test currently enforces this pairing; this task adds one).

- [ ] Failing test (new `platform.enum.spec.ts` if none exists): domain `EPlatform` values are a subset of Prisma's generated `EPlatform` enum values (import from `src/generated/prisma/enums` and assert equality) — this is the "stay in lockstep" pattern from the (unmerged) fase3 plan's `tenant-type.spec.ts`, applied here since it's directly relevant and cheap.
- [ ] Add the migration, update the domain enum.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(instagram): add INSTAGRAM to EPlatform, reusing HotelApiCredential for OAuth storage"`.

### Task 2: `InstagramProvider` — Graph API client

**Files:**
- Create: `src/modules/reserve-client-portal/infrastructure/providers/instagram.provider.ts` (+ `.spec.ts`)

**Interfaces:** mirrors `GoogleAdsProvider`'s shape (currently a stub — this plan does **not** fix that stub, it's out of scope; flagged in the final report as a pre-existing gap the master doc's §4.1 "JÁ EXISTE" table incorrectly claims is done). `InstagramProvider.fetchProfile(accessToken, igUserId): Promise<{ followersCount, mediaCount }>`, `.fetchInsights(accessToken, igUserId, period: 'day'): Promise<{ reach, accountsEngaged, totalInteractions }>`, `.fetchTopMedia(accessToken, igUserId, limit=3): Promise<{id, caption, mediaUrl, likeCount, commentCount, timestamp}[]>` — three thin `axios.get` wrappers against the exact endpoints §3.4 lists, each returning a typed shape (not the raw Graph API response), following `meta-ads.provider.ts`'s existing thinness (41 lines) rather than `google-ads.provider.ts`'s stub pattern.

- [ ] Failing test: each method builds the correct Graph API URL/params (mock `axios.get`), maps the raw response to the typed shape, and surfaces a clear error (not a raw axios exception) on a non-2xx response.
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(instagram): InstagramProvider (profile, insights, top media)"`.

### Task 3: `SyncInstagramDataUseCase` + cron wiring

**Files:**
- Create: `src/modules/reserve-client-portal/application/use-cases/sync-instagram-data.use-case.ts` (+ `.spec.ts`)
- Modify: `prisma/schema.prisma` — `IgDailySnapshot`
- Create: `prisma/migrations/20260804000007_add_ig_daily_snapshot/migration.sql`
- Modify: `cron-sync.provider.ts` — add `case EPlatform.INSTAGRAM`

**Interfaces:**

```prisma
model IgDailySnapshot {
  id                String   @id @default(cuid()) @db.VarChar(25)
  tenant_id         String   @db.VarChar(25)
  date              DateTime @db.Date
  followers_count   Int      @default(0)
  reach             Int      @default(0)
  engaged_accounts  Int      @default(0)
  total_interactions Int     @default(0)
  created_at        DateTime @default(now())

  @@unique([tenant_id, date])
  @@map("ig_daily_snapshot")
}
```

  `SyncInstagramDataUseCase.execute(clientId)` — resolves `tenant_id` from `client_id`, calls `InstagramProvider`, upserts today's `IgDailySnapshot` (§3.6: "`followers_count` não tem histórico via API → registrar snapshot no dia do onboarding como baseline"). `CronSyncProvider.syncAll`'s existing `switch (cred.platform)` gains `case EPlatform.INSTAGRAM: await this.syncInstagram.execute(cred.client_id); break;`.

- [ ] Failing test: use-case upserts (not creates — running twice same day must not duplicate, `@@unique([tenant_id, date])` backs this) today's snapshot; cron wiring test on `CronSyncProvider` (extend its existing spec if present, or add one — check first) asserts the new case is dispatched for `INSTAGRAM` credentials.
- [ ] Implement (migration, use-case, cron wiring).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(instagram): daily follower/engagement snapshot synced on the existing 6-hour cron"`.

### Task 4: Instagram overview endpoint

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/instagram-overview.service.ts` (+ `.spec.ts`)
- Modify: `client-portal.controller.ts` — `GET :clientId/instagram`

**Interfaces:** `{ followers: Metric (via PeriodComparisonService, delta vs. period-start snapshot); reach: Metric; engagement: { likes, comments, saves, shares, rate: Metric }; topPosts: [...] (live from InstagramProvider.fetchTopMedia, not cached) }`.

- [ ] Failing test: `followers` delta computed from `IgDailySnapshot` at period start vs. period end (not "vs previous period," since followers is a running total, not a per-period flow — this distinction matters and is worth its own assertion).
- [ ] Implement + route.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(instagram): overview endpoint (followers growth, reach, engagement, top posts)"`.

### Task 5: `content_posts` CRUD + calendar view (`[CRUD-pattern]`)

**Files:**
- Modify: `prisma/schema.prisma` — `ContentPost`
- Create: `prisma/migrations/20260804000008_add_content_posts/migration.sql`
- Create: `src/modules/reserve-client-portal/application/services/content-post.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-content-post.controller.ts`
- Modify: `client-portal.controller.ts` — `GET :clientId/content-posts?month=`

**Interfaces:** `model ContentPost { id, tenant_id, platform (instagram|facebook), scheduled_for?, published_at?, status (draft|scheduled|published), caption_preview?, thumbnail_url?, external_id?, permalink?, created_by, created_at, updated_at }` `@@map("content_posts")`. Admin CRUD restricted to editor+; client read is month-scoped (`WHERE scheduled_for BETWEEN :monthStart AND :monthEnd OR published_at BETWEEN ...`).

- [ ] Failing test: create/update/list/delete round-trip; month filter includes posts by either `scheduled_for` or `published_at` falling in range (a post scheduled last month but published this month must show up in the current month's calendar).
- [ ] Implement (migration, service, controllers).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(content-calendar): ContentPost CRUD and month-scoped calendar view"`.

### Task 6: Technical spike — Meta scheduled posts API exposure (documentation task, no code)

Per §8 Fase 4: "validar na prática... posts agendados dentro do Meta Business Suite podem não ser expostos integralmente pela API." This is legitimately a non-code task with a written protocol and a decision gate, not a TDD task.

**Deliverable:** `docs/superpowers/specs/2026-0X-XX-spike-meta-scheduled-posts.md` (create when the spike runs, not now) containing: (1) which Graph API endpoint(s) were tried against the Pousada Dona Tereza's real connected Page/IG account, (2) whether Business-Suite-scheduled posts appear in the response, (3) the resulting decision — **API-backed calendar** (drop `ContentPost.status: scheduled` writes from the admin UI, sync from Meta instead) vs. **`ContentPost` as the sole source of truth** (Meta API only confirms `published_at`/`permalink` after the fact, matching Task 5's schema as designed, which already supports this as the default/fallback per §3.5's explicit fallback language). **This plan's Task 5 schema already assumes the fallback path is the default** — if the spike finds the API does expose scheduled posts fully, Task 5's `ContentPost` gains a sync job (not designed here, deferred to a follow-up task once the spike concludes) rather than being replaced.

- [ ] Run the spike against a real connected account.
- [ ] Record the decision in the spec doc.
- [ ] No commit to application code unless the decision requires revisiting Task 5 (in which case, a follow-up task, not a retroactive edit to this plan).

### Task 7: `activity_log` table + auto-event wiring + feed endpoint

**Files:**
- Modify: `prisma/schema.prisma` — `ActivityLog`
- Create: `prisma/migrations/20260804000009_add_activity_log/migration.sql`
- Create: `src/modules/reserve-client-portal/application/services/activity-log.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-activity-log.controller.ts`
- Modify: `client-portal.controller.ts` — `GET :clientId/activities?page=&limit=`
- Modify: `content-post.service.ts` (publish transition → auto-event), `report.service.ts` (publish → auto-event) — call sites for auto-events; **bot config approval's auto-event is wired in Fase 5 Task 7, once that model exists**

**Interfaces:** `model ActivityLog { id, tenant_id, type (auto|manual), category (post|campaign|report|bot|meeting|other), title, description?, icon?, created_by?, created_at }` `@@map("activity_log")`. `ActivityLogService.record(tenantId, { type, category, title, description?, icon?, createdBy? }): Promise<void>` — a plain injectable service method, **not** an event-emitter/pub-sub bus (the codebase has no existing event bus; introducing one for four call sites is over-engineering relative to the current architecture's direct-service-call convention, matching how `NotificationEventService.dispatch` is called directly from call sites today, not via emitted events).

- [ ] Failing test: `record()` inserts a row with the given fields; feed endpoint paginates newest-first; `ContentPostService.publish()` (extend its existing method, or add if publish isn't modeled yet — check Task 5's implementation) calls `activityLogService.record(..., category: 'post', type: 'auto')`.
- [ ] Implement (migration, service, controllers, the 2 auto-event call sites available at this point in the plan).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(activity-log): activity_log table, auto-event wiring, and feed endpoint"`.

---

## Fase 5 — Narrativa, direção e retenção (backend slice)

### Task 1: ROI Analysis service — Níveis 1 e 2

**Files:**
- Create: `src/modules/reserve-client-portal/application/services/roi-analysis.service.ts` (+ `.spec.ts`)
- Modify: `client-portal.controller.ts` — `GET :clientId/roi`

**Interfaces:** capstone service combining Fases 1–3's outputs, all via `PeriodComparisonService`:
- Nível 1 (every client): `spend` (existing `CampaignMetric`), `conversas` (existing `WhatsAppLinkClick`/`ConversationAttribution`), `costPerConversation`, `costPerConversationTrend` (time series, **color inverted** — a falling cost is positive, per §3.9's explicit "custo por conversa em queda é positivo. Inverter a lógica de cor" — this is a **response field**, `trendDirection: 'improving' | 'worsening'`, computed as `delta < 0 ? 'improving' : 'worsening'` for this one metric only, so the frontend never has to special-case color logic per metric).
- Nível 2 (bot ativo — gate on `BotIntegrationConfig.active`): `costPerQualifiedLead` (`spend ÷ FunnelEvent count where para_estagio=QUALIFICADO in window`), `costPerReadyToClose` (`spend ÷ TRANSFERIR-annotated events`, per Task 5's Fase 3 ambiguity resolution), `qualificationRate`, `roiByCampaign` (from Fase 2 Task 5's rollup).
- Response always includes `attributionWindow: { days, visible: true }` sourced from `AttributionSettings`, per §3.9's "atribuição declarada... janela explícita e visível."
- **Never computes or returns an estimated revenue field** when the client has no booking-engine integration (`HotelClient.booking_engine_type === MANUAL`) — this is enforced by the response DTO simply omitting the field, not by a runtime check the frontend could bypass, per §3.9's "regra inegociável."

- [ ] Failing tests: `trendDirection` inverted correctly for `costPerConversation` only (assert a second metric, e.g. `conversas`, is *not* inverted); Nível 2 fields are `null`/absent when `BotIntegrationConfig.active` is false or missing; no revenue field appears in the response shape for a `MANUAL` booking engine client (type-level test: the DTO literally has no such field when the branch is taken, not a nulled-out field).
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(roi): ROI analysis service — Niveis 1 e 2, inverted cost-per-conversation coloring"`.

### Task 2: `DigestReport` + `DigestRun` models and generation cron

**Problem:** master doc's §4.2 schema for `digest_runs` includes a `report_id` field, implying it references a narrative report entity — but the only existing report table, `MonthlyReport`, is `@@unique([client_id, reference_month])`, incompatible with a twice-a-month cadence (two digests in the same calendar month would collide). **Decision made in this plan**: introduce a new `DigestReport` model, decoupled from `MonthlyReport` (which stays exactly as-is, serving its existing monthly-closing purpose), rather than altering `MonthlyReport`'s uniqueness constraint against a production table with existing rows. **Flagged as a decision needing confirmation** — see final report; the alternative (generalizing `MonthlyReport` to `period_start`/`period_end`) is viable but carries migration risk this plan avoids by default.

**Files:**
- Modify: `prisma/schema.prisma` — `DigestReport`, `DigestRun`
- Create: `prisma/migrations/20260804000010_add_digest_tables/migration.sql`
- Create: `src/modules/reserve-client-portal/application/services/digest.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/providers/digest-generation-cron.provider.ts` (+ `.spec.ts`)

**Interfaces:**

```prisma
enum EDigestStatus { DRAFT PUBLISHED }

model DigestReport {
  id                String       @id @default(cuid()) @db.VarChar(25)
  tenant_id         String       @db.VarChar(25)
  period_start      DateTime     @db.Date
  period_end        DateTime     @db.Date
  status            EDigestStatus @default(DRAFT)
  executive_summary String?      @db.Text
  highlights        Json?
  next_steps        Json?
  admin_comment     String?      @db.Text
  metrics_payload   Json
  published_at      DateTime?
  notification_sent Boolean      @default(false)
  created_at        DateTime     @default(now())
  updated_at        DateTime     @updatedAt

  @@unique([tenant_id, period_start])
  @@map("digest_reports")
}

model DigestRun {
  id              String   @id @default(cuid()) @db.VarChar(25)
  tenant_id       String   @db.VarChar(25)
  period_start    DateTime @db.Date
  period_end      DateTime @db.Date
  status          String   @default("gerado") @db.VarChar(15) // gerado | publicado
  metrics_payload Json
  report_id       String?  @db.VarChar(25)
  generated_at    DateTime @default(now())
  published_at    DateTime?
  DigestReport    DigestReport? @relation(fields: [report_id], references: [id])

  @@map("digest_runs")
}
```

  `DigestGenerationCronProvider` — `@Cron('0 6 1,16 * *')` (06:00 on the 1st and 16th, per §3.7.1). For every tenant with an active `HotelClient`, compute `metrics_payload` via `RoiAnalysisService`/`PeriodComparisonService` for the prior 15-day window, create a `DigestReport` (`status: DRAFT`) + `DigestRun` (`status: 'gerado'`), **does not send email or set `published_at`** — "automação monta, humano assina" (§3.7.1 step 3) is enforced by this cron simply never calling the publish path.

- [ ] Failing tests: cron generates exactly one `DigestReport`/`DigestRun` pair per active `HotelClient` for the correct 15-day window ending "today"; a tenant with an existing `DigestReport` for the same `period_start` (re-run same day) doesn't duplicate (`@@unique([tenant_id, period_start])` backs an upsert, not a blind create); cron never sets `status: PUBLISHED` or `notification_sent: true`.
- [ ] Implement (migration, cron, service).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(digest): DigestReport/DigestRun models and bi-monthly draft generation cron"`.

### Task 3: Digest review/publish flow + email dispatch

**Files:**
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-digest.controller.ts`
- Modify: `digest.service.ts` — `submitForReview`, `publish` (mirrors `ReportController`/`ReportService`'s exact pattern — same two-step state machine)
- Modify: `src/modules/reserve-notifications/domain/constants/notification-events.ts` — add `DIGEST_PUBLISHED: 'digest.published'`
- Modify: `src/modules/reserve-notifications/application/services/notification-event.service.ts` — add the `digest.published` case to `EVENT_TITLES`/`buildEventBody`

**Interfaces:** `PATCH admin/hotel-portal/:tenantId/digests/:id/publish` — `@Roles(super_admin, owner)` (matching `ReportController`'s narrower publish-role precedent, an intentional anomaly to *replicate*, not fix, since it's the same "only the top two roles publish client-facing narrative" policy already established). On publish: `digestReport.update({ status: PUBLISHED, published_at })`, `digestRun.update({ status: 'publicado', published_at })`, `activityLogService.record(..., category: 'report', type: 'auto')`, `notificationEventService.dispatch('digest.published', tenantId, { period_start, period_end, ...key numbers })` — §3.7.1's "os números principais vão no corpo do email" requirement means `buildEventBody` for this event key must interpolate `metrics_payload`'s headline numbers into the email body text, not just link to the painel.

- [ ] Failing test: publish transitions both `DigestReport` and `DigestRun` status together; `notificationEventService.dispatch` called with the digest's key metrics in `metadata`; a non-`super_admin`/`owner` caller gets `403`.
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(digest): review/publish flow with email notification carrying headline numbers"`.

### Task 4: `Milestone` (`milestones`) CRUD + marco-zero auto-creation (`[CRUD-pattern]` + one hook)

**Files:**
- Modify: `prisma/schema.prisma` — `Milestone`
- Create: `prisma/migrations/20260804000011_add_milestones.sql`
- Create: `src/modules/reserve-client-portal/application/services/milestone.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-milestone.controller.ts`
- Modify: `hotel-client.service.ts` — `create()` gains a call to `milestoneService.createMarcoZero(tenantId, contractStart)` right after a `HotelClient` with a linked `tenant_id` is created.

**Interfaces:** `model Milestone { id, tenant_id, date, title, type (marco_zero|seguidor|campanha|bot|recorde|custom), created_at }` `@@map("milestones")`. `createMarcoZero` is idempotent (`upsert` on a synthetic uniqueness of `(tenant_id, type='marco_zero')` enforced at the application layer via a `findFirst` + `create`-if-absent, since two "marco zero" rows for one tenant would be a data bug, not a valid state — no DB-level unique constraint added, since `type` isn't unique for the other five values and a partial unique index is more schema complexity than this warrants for one hook call site).

- [ ] Failing test: CRUD round-trip; `createMarcoZero` called twice for the same tenant creates only one row.
- [ ] Implement (migration, service, controller, hook in `hotel-client.service.ts`).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(timeline): Milestone CRUD and automatic marco-zero on hotel client onboarding"`.

### Task 5: Baseline retroativa job

**Files:**
- Create: `src/modules/reserve-client-portal/application/use-cases/import-historical-baseline.use-case.ts` (+ `.spec.ts`)
- Modify: `admin-hotel-client.controller.ts` — `POST :id/import-baseline` (manual trigger, part of the §4.4 onboarding flow, not a cron — history import is a one-time onboarding action per client, not recurring)

**Interfaces:** `ImportHistoricalBaselineUseCase.execute(clientId, monthsBack = 37)` — calls the *existing* `SyncMetaAdsDataUseCase`/`SyncGa4DataUseCase` in a historical-range mode. **This requires those use-cases to accept a date range parameter; check their current signatures first** — if they're hardcoded to "last 30 days" (a real possibility given `GoogleAdsProvider`'s stub comment says exactly `LAST_30_DAYS`), this task's actual first step is widening those signatures, which is a larger change than it first appears and should be scoped/estimated separately once the existing use-cases are read in full. Also triggers a single baseline `IgDailySnapshot` row dated at onboarding (§3.6: "registrar snapshot no dia do onboarding como baseline").

- [ ] Failing test: use-case invokes the Meta/GA4 sync use-cases with a 37-month range and creates one baseline `IgDailySnapshot`; **write this test against the sync use-cases' actual current signature** (read `sync-meta-ads-data.use-case.ts`/`sync-ga4-data.use-case.ts` in full before writing the mock — do not assume the range-parameter shape guessed above).
- [ ] Implement, adjusting the two existing use-cases' signatures if needed (additive optional parameter, default preserving current 30-day behavior, so the existing 6-hour cron call sites in `cron-sync.provider.ts` don't need to change).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(onboarding): historical baseline import (up to 37 months) plus IG baseline snapshot"`.

### Task 6: `SemesterPlan` / `SemesterPlanDelivery` CRUD (`[CRUD-pattern]` + milestone link)

**Files:**
- Modify: `prisma/schema.prisma` — `SemesterPlan` (`plano_semestral`), `SemesterPlanDelivery` (`plano_entregas`)
- Create: `prisma/migrations/20260804000012_add_semester_plan.sql`
- Create: `src/modules/reserve-client-portal/application/services/semester-plan.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-semester-plan.controller.ts`
- Modify: `client-portal.controller.ts` — `GET :clientId/semester-plan` (read-only)

**Interfaces:**

```prisma
model SemesterPlan {
  id         String                   @id @default(cuid()) @db.VarChar(25)
  tenant_id  String                   @db.VarChar(25)
  semestre   String                   @db.VarChar(10) // e.g. "2026-2"
  titulo     String                   @db.VarChar(150)
  eixos      Json
  criado_por String                   @db.VarChar(25)
  criado_em  DateTime                 @default(now())
  Deliveries SemesterPlanDelivery[]

  @@unique([tenant_id, semestre])
  @@map("plano_semestral")
}

model SemesterPlanDelivery {
  id          String       @id @default(cuid()) @db.VarChar(25)
  plano_id    String       @db.VarChar(25)
  mes         Int          @db.SmallInt // 1-6, ordinal within the semester
  titulo      String       @db.VarChar(150)
  descricao   String?      @db.Text
  status      String       @default("planejado") @db.VarChar(15) // planejado|em_andamento|concluido
  milestone_id String?     @db.VarChar(25)
  ordem       Int          @default(0)
  Plan        SemesterPlan @relation(fields: [plano_id], references: [id], onDelete: Cascade)

  @@index([plano_id])
  @@map("plano_entregas")
}
```

  Admin-only write (`editor+`), client read. Delivery status transition to `concluido` triggers `activityLogService.record(...)` and, when `milestone_id` is set on the delivery, is expected to already point at an existing `Milestone` (created separately by an admin) — this plan does **not** auto-create a `Milestone` from a completed delivery (§3.11 says "quando uma entrega conclui, gera evento no feed de atividades e, **se relevante**, um marco" — "se relevante" is a judgment call left to whoever marks it done, not automatic; the endpoint accepts an optional `milestone_id` in the same PATCH call so an admin can link/create both in one action from the UI).

- [ ] Failing test: CRUD round-trip for both models; marking a delivery `concluido` fires exactly one `activityLogService.record` call; passing `milestone_id` on the same PATCH links it without creating a second `Milestone`.
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(semester-plan): SemesterPlan/SemesterPlanDelivery CRUD with activity-log and milestone linking"`.

### Task 7: `MetricGoal` (`metric_goals`) CRUD + default seeding (`[CRUD-pattern]`)

**Files:**
- Modify: `prisma/schema.prisma` — `MetricGoal`
- Create: `prisma/migrations/20260804000013_add_metric_goals.sql`
- Create: `src/modules/reserve-client-portal/application/services/metric-goal.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-metric-goal.controller.ts`
- Modify: `hotel-client.service.ts` — `create()` seeds the WhatsApp-leads default goal (`show_goal: true`) per Decisão #3 ("default: exibir meta apenas para leads de WhatsApp").

**Interfaces:** `model MetricGoal { id, tenant_id, metric_key, period (biweekly|monthly), target_value Float, show_goal Boolean @default(false), created_at, updated_at }` `@@map("metric_goals")`, `@@unique([tenant_id, metric_key, period])`.

- [ ] Failing test: CRUD round-trip; `HotelClientService.create` seeds exactly one `MetricGoal` row (`metric_key: 'whatsapp_leads', period: 'biweekly', show_goal: true, target_value: 0`) for a client with a linked tenant, and seeds nothing when the client has no `tenant_id` (a `HotelClient` created before its `Tenant` link exists — matches the existing nullable-`tenant_id` reality noted in Global Constraints, handled gracefully rather than throwing).
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(goals): MetricGoal CRUD with default WhatsApp-leads goal seeded on client creation"`.

### Task 8: `BotConfigProposal` (`bot_config_propostas`) CRUD + approval flow

**Files:**
- Modify: `prisma/schema.prisma` — `BotConfigProposal`
- Create: `prisma/migrations/20260804000014_add_bot_config_proposals.sql`
- Create: `src/modules/reserve-client-portal/application/services/bot-config-proposal.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-bot-config-proposal.controller.ts`
- Modify: `client-portal.controller.ts` — `POST :clientId/bot-config-proposals` (client submits), `GET :clientId/bot-config-proposals` (client reads own status)
- Modify: `bot-integration-config.entity`/schema — `n8n_config_publish_webhook_url` already added in Fase 3 Task 1; this task's approve action calls it.

**Interfaces:**

```prisma
model BotConfigProposal {
  id             String   @id @default(cuid()) @db.VarChar(25)
  tenant_id      String   @db.VarChar(25)
  campo          String   @db.VarChar(100)
  categoria      String   @db.VarChar(20) // pricing | policies | packages | hours
  valor_atual    Json?
  valor_proposto Json
  status         String   @default("PENDENTE") @db.VarChar(10) // PENDENTE|APROVADA|REJEITADA
  autor_id       String   @db.VarChar(25)
  revisor_id     String?  @db.VarChar(25)
  justificativa  String?  @db.Text
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  @@index([tenant_id, status])
  @@map("bot_config_propostas")
}
```

  **Server-side enforcement of §5.5's "dados sim, comportamento não" boundary**: `categoria` is a closed enum-like string validated against exactly `['pricing', 'policies', 'packages', 'hours']` — there is no `categoria: 'behavior'` or `'system_prompt'` value the API accepts, so the boundary is enforced by the DTO's `@IsIn([...])`, not by trusting the client/N8N to only ever send safe categories. Approve action (`PATCH :id/approve`, `@Roles(super_admin, owner, manager)`) calls `axios.post(config.n8n_config_publish_webhook_url, { campo, valor_proposto })` (best-effort — logs failure, does **not** roll back the `APROVADA` status, since the config table itself is the source of truth for "what was approved," and a failed publish call is an ops-visible N8N-side problem, not a reason to re-litigate the approval — **flagged as a decision**: an alternative design blocks the status transition until the webhook call succeeds; this plan chose fire-and-forget to match the reverse-webhook precedent in Fase 3 Task 7, but the two cases differ (a failed *stage sync* self-heals via the funnel log; a failed *config publish* leaves the hotel's actual bot config out of sync with what the painel shows as "approved" until someone notices) — **needs product/eng sign-off**, see final report), then `activityLogService.record(..., category: 'bot', type: 'auto')`.

- [ ] Failing test: `categoria` outside the four allowed values → `400`; approve transitions status and calls the publish webhook; reject requires `justificativa` (non-empty, per §5.5's "REJEITADA: volta com justificativa" — enforce this as a DTO-level conditional requirement, not just a UI hint).
- [ ] Implement (migration, service, controllers).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(bot-config): BotConfigProposal CRUD with data/behavior boundary enforced server-side"`.

---

## Fase 6 — Acabamento e escala (backend slice)

### Task 1: PDF export

**Problem:** no PDF library is currently a dependency, and the codebase's existing serverless-platform comments (`whatsapp-redirect.controller.ts`'s Vercel-function-freeze notes) suggest headless-Chrome PDF rendering (Puppeteer/Playwright) is a real infra decision, not just an `npm install` — Puppeteer needs `@sparticuz/chromium` (or equivalent) to run inside a Vercel serverless function, adds real cold-start latency, and increases deployment bundle size non-trivially. **Flagged as a decision needing confirmation before this task starts** — see final report; this task assumes Puppeteer + `@sparticuz/chromium`, the standard combination for Vercel, but a lighter alternative (`pdfkit` / `@react-pdf/renderer`, building the PDF programmatically instead of rendering an HTML page) avoids the headless-Chrome cold-start entirely at the cost of maintaining two rendering paths (screen + PDF) instead of one shared template.

**Files:**
- Create: `src/modules/reserve-client-portal/infrastructure/providers/pdf-export.provider.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/pdf-export.controller.ts`
- Modify: `package.json` (add the chosen dependency once confirmed)

**Interfaces:** `PdfExportProvider.render(html: string): Promise<Buffer>`. `GET hotel-portal/:clientId/export/report?from=&to=&section=` builds the section's data (reusing `OverviewService`/`RoiAnalysisService`/etc., same contract the screen uses — no separate "PDF data" query path), renders it through a minimal server-side HTML template (RÉSERVE header, hotel name, period), and streams the resulting PDF (`Content-Type: application/pdf`).

- [ ] Failing test: `render()` given a trivial HTML string returns a non-empty `Buffer` starting with the PDF magic bytes (`%PDF`) — the one assertion that's meaningful without a real browser in the test environment; mock the underlying library for all other tests (route wiring, correct sections included) rather than actually launching Chromium in Jest.
- [ ] Implement once the library decision is confirmed.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(pdf-export): server-side PDF rendering for period/report export"`.

### Task 2: ROI Nível 3 (ROAS, ticket médio, taxa lead→reserva)

**Files:**
- Modify: `roi-analysis.service.ts` (Fase 5 Task 1)

**Interfaces:** gated on `HotelClient.booking_engine_type !== 'MANUAL'` (the existing `mode === 'conversion'` check already used in `OverviewService.resolveMode`). Adds `revenueAttributed` (from existing `HotelReservation.total_amount` within `AttributionSettings.window_days` of the lead's attribution), `roas` (`revenueAttributed / spend`), `avgTicket`, `leadToReservationRate` (`HotelReservation` count matched to `ConversationAttribution.numero_contato` via guest phone / linked lead, ÷ total leads in window) — **matching by phone number between `HotelReservation.guest_phone` and `ConversationAttribution.numero_contato`/`BotContact.numero_contato` requires both to be normalized to the same format; check `ReservationService`'s adapters for how `guest_phone` is currently stored (raw from each booking engine, likely unnormalized) before implementing the match — this is very likely a real, non-trivial data-cleaning problem, not a one-line join, and is flagged as such**.

- [ ] Failing test: Nível 3 fields absent for `MANUAL` engine type; present and computed correctly for a `conversion`-mode client with mocked matching reservations.
- [ ] Implement (after resolving the phone-normalization question above).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(roi): ROI Nivel 3 (ROAS, ticket medio, lead-to-reservation) gated on booking-engine integration"`.

### Task 3: WhatsApp digest notifications (template-approved)

**Files:**
- Create: `src/modules/reserve-client-portal/infrastructure/providers/whatsapp-cloud-api.provider.ts` (+ `.spec.ts`) — extends the existing `whatsapp.provider.ts` (currently pre-arrival/post-stay template sends) with a digest-summary template send.
- Modify: `notification-event.service.ts` / `digest.service.ts` — publish flow gains a WhatsApp send alongside the existing email send, gated on a tenant opting in.

**Interfaces:** `WhatsAppCloudApiProvider.sendTemplate(phone, templateName, params[])` — **the actual approved template name/parameter order is a Meta Business Manager artifact this plan cannot define; it must be created and approved in Meta's template review process before this task's `templateName` constant has a real value.** **Flagged as an external dependency/decision** — see final report. Implement against a configurable template name (env var) so the code ships correctly regardless of when the template gets approved.

- [ ] Failing test: `sendTemplate` builds the correct Cloud API request shape (mock `axios.post`); digest publish flow calls it only when the tenant has WhatsApp notifications enabled (new `TenantNotificationSettings`-style flag, or reuse the existing `event_settings` JSON on `TenantNotificationSettings` — check that model's existing read/write pattern in `notification-settings.service.ts` before adding a new column).
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(digest): WhatsApp Cloud API template send for digest publish, opt-in per tenant"`.

### Task 4: Google Ads sync — close the stub (pre-existing gap, not new scope, but blocking)

**Problem found during this plan's research, not in the master doc**: §4.1's "JÁ EXISTE" table claims "Meta Ads + Google Ads sync agendado" is done — it is not. `GoogleAdsProvider.fetchCampaignMetrics` (`src/modules/reserve-client-portal/infrastructure/providers/google-ads.provider.ts`) is a stub returning nothing, with a `TODO: Replace with actual google-ads-api SDK calls` and a `logger.warn`. Section 8 Fase 6 lists "Google Ads no bloco de tráfego" as a Fase 6 item, which — read charitably — may mean the master doc's author already knew this and mis-stated it in §4.1's inventory table. **Flagged as a doc inconsistency needing confirmation** — see final report.

**Files:**
- Modify: `google-ads.provider.ts` (+ `.spec.ts`)

**Interfaces:** unchanged (`fetchCampaignMetrics(accessToken, clientId): Promise<IGoogleAdsCampaignMetric[]>`), implementation wired to the real `google-ads-api` npm package (new dependency) and a real GAQL query matching the TODO comment already left in the stub.

- [ ] Failing test: builds the GAQL query string correctly, maps the SDK response to `IGoogleAdsCampaignMetric[]`.
- [ ] Implement (new dependency, real OAuth2 flow via the existing `HotelApiCredential` token storage — reuse `AesEncryptionProvider` exactly as `meta-ads.provider.ts` does).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "fix(google-ads): replace stub with real Google Ads API integration"`.

### Task 5: Benchmark agregado da agência

**Files:**
- Modify: `prisma/schema.prisma` — `BenchmarkAggregate`
- Create: `prisma/migrations/20260804000015_add_benchmark_aggregate.sql`
- Create: `src/modules/reserve-client-portal/application/services/benchmark-eligibility.service.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/providers/benchmark-aggregation-cron.provider.ts` (+ `.spec.ts`)
- Create: `src/modules/reserve-client-portal/infrastructure/controllers/admin-benchmark.controller.ts` (`@Roles(super_admin)` only — never exposed to clients, per §7)

**Interfaces:**

```prisma
model BenchmarkAggregate {
  id                  String   @id @default(cuid()) @db.VarChar(25)
  cohort_metric       String   @db.VarChar(50) // e.g. "conversas_30d_growth"
  tenant_count        Int
  min_contract_months Int
  period_label        String   @db.VarChar(50)
  value_json          Json     // aggregated stats only — never per-tenant identifiable data
  computed_at         DateTime @default(now())

  @@map("benchmark_agregado")
}
```

  `BenchmarkEligibilityService.isPubliclyUsable(): Promise<boolean>` — implements Decisão 16's hard gate: `≥5` tenants with `HotelClient.contract_start` at least 6 months ago **and** active. This is a pure eligibility check, separate from the aggregation cron itself, so the "can we say this publicly" question is testable independent of whatever metrics get aggregated. The aggregation cron (`@Cron(CronExpression.EVERY_WEEK)`) computes and stores `BenchmarkAggregate` rows regardless of eligibility ("coleta começa já," §7) — eligibility only gates the **read** endpoint (`GET admin/hotel-portal/benchmark` returns `403` with a clear message when `!isPubliclyUsable()`, never a silently-empty `200`, so nobody building a proposal deck mistakes "no data returned" for "we have no benchmark," which is a materially different, more dangerous failure mode than a loud 403).

- [ ] Failing test: `isPubliclyUsable()` false with 4 eligible tenants, true with 5; false with 5 tenants but only 4 of them past 6 months; endpoint returns `403` (not `200` with empty data) when ineligible.
- [ ] Implement (migration, eligibility service, cron, controller).
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(benchmark): agency benchmark aggregation with the 5-client/6-month eligibility gate"`.

### Task 6: Integration health monitoring + internal alerts

**Files:**
- Create: `src/modules/reserve-client-portal/infrastructure/providers/integration-health-cron.provider.ts` (+ `.spec.ts`)

**Interfaces:** `@Cron(CronExpression.EVERY_HOUR)` — scans `HotelApiCredential` for `sync_status: ERROR` or `token_expires_at < now + 48h`, and `BotIntegrationConfig` for stale `last_heartbeat_at` (reuses Fase 3 Task 8's 90-minute staleness threshold). For each finding, calls the existing `NotificationService`'s broadcast-to-`super_admin` path (check `notification.service.ts`'s existing `scope: broadcast` creation pattern first — reuse it exactly, targeting an internal "ops" tenant list or a `super_admin`-only broadcast, whichever the existing broadcast mechanism actually supports; **the exact targeting mechanism for "internal Reserve team only, not clients" needs to be confirmed against `notification.service.ts`'s real capabilities before this task is estimated** — flagged in final report if broadcast-to-super-admins-only isn't already a first-class concept there).

- [ ] Failing test: cron identifies exactly the credentials/configs past their thresholds and calls the notification path once per finding (not once per cron tick regardless of findings — a healthy tenant must not generate a notification every hour).
- [ ] Implement.
- [ ] `npm run build && npm test`.
- [ ] Commit — `git commit -m "feat(monitoring): hourly integration health check with internal alerting"`.

---

## Summary of new Prisma models by phase

| Phase | Models added |
|---|---|
| 2 | `ConversationAttribution` (`atribuicao_conversa`), `AttributionSettings` |
| 3 | `BotIntegrationConfig`, `BotIngestionEvent`, `BotContact`, `BotMessage`, `FunnelEvent` (`funil_eventos`), `BotLead`, `FollowupAttempt`, `BotStageWebhookDispatch`, `BotDataRetentionSetting` |
| 4 | `IgDailySnapshot`, `ContentPost`, `ActivityLog` |
| 5 | `DigestReport`, `DigestRun`, `Milestone`, `SemesterPlan` (`plano_semestral`), `SemesterPlanDelivery` (`plano_entregas`), `MetricGoal`, `BotConfigProposal` |
| 6 | `BenchmarkAggregate` |

21 new models total against the master doc's §4.2 list of 11 — the delta is explained by tables the master doc's high-level schema didn't enumerate but its own event catalog (§5.6) and metric list (§5.7) require to be buildable: `BotIntegrationConfig`, `BotIngestionEvent`, `BotContact`, `BotMessage`, `BotLead`, `FollowupAttempt`, `BotStageWebhookDispatch`, `BotDataRetentionSetting`, and `DigestReport` (split from `digest_runs` for the reason given in Fase 5 Task 2).
