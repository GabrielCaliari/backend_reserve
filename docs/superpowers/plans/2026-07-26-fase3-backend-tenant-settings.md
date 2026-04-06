# Fase 3 — Backend: identidade de tenant, módulos e settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Reserve identidade de tenant multi-domínio (com CORS dinâmico), tipo de tenant, settings por tenant e gating de módulos por política — e fechar a tipagem de resposta do Swagger que o codegen do painel vai consumir na Fase 4.

**Architecture:** `TenantDomain` substitui a coluna única `Tenant.domain` como fonte de verdade da allowlist de CORS, lida por um `CorsOriginService` com cache em memória invalidado na escrita. `TenantSetting` guarda configuração por `(tenant_id, module, key)` validada contra um registry de definições em código; as flags de módulo são um caso particular dessas settings (`platform.module.<nome>.enabled`) resolvidas contra `TenantTypeModulePolicy` e o tipo do tenant, produzindo `{ enabled, source }`. O `ModuleAccessGuard` entra na cadeia entre `TenantGuard` e `PermissionsGuard` e traduz módulo desligado em 403; `GET /api/tenant-capabilities` passa a devolver tipo de tenant, flag de master e o mapa de módulos resolvido, que é o contrato que o painel usa para apagar navegação.

**Tech Stack:** NestJS 11, Prisma 7 (`prisma migrate`, PostgreSQL, adapter `@prisma/adapter-pg`), TypeScript 5, Jest 29 + ts-jest, `@nestjs/swagger` 11, `class-validator`.

## Global Constraints

- **Prisma em snake_case.** Todo campo novo usa `tenant_id`, `created_at`, `updated_at`, `is_primary`, `tenant_type`, `module_key`, `updated_by`. NUNCA camelCase. Código copiado da Zarp (que normalizou para camelCase) **não compila** sem adaptar os nomes — adapte na cópia, não normalize o schema do Reserve.
- **Nomes de delegate vs. nomes de campo.** Os delegates do Prisma Client continuam camelCase (`prisma.tenantDomain`, `prisma.tenantSetting`, `prisma.tenantTypeModulePolicy`) porque derivam do nome do *model*. Só os *campos* são snake_case. Chaves compostas geradas: `tenant_id_module_key` (TenantSetting) e `tenant_type_module_key` (TenantTypeModulePolicy).
- **`prisma migrate`, nunca `db push`.** Cada modelo novo é uma pasta `prisma/migrations/<timestamp>_<nome>/migration.sql`. Os timestamps deste plano são `20260726000001` … `20260726000004`, seguindo o padrão já usado em `prisma/migrations/20260528000001_add_whatsapp_tracking_links`. Criar migração com `npx prisma migrate dev --name <nome> --create-only`, depois editar o SQL à mão quando houver migração de dados.
- **A migração `Tenant.domain` → `TenantDomain` tem SQL de dados, não só de schema.** Ver Task 2. A coluna antiga é **mantida** e passa a ser nullable/deprecada.
- **Testes:** Jest, `*.spec.ts` colocado ao lado do arquivo, `rootDir: src`, `testRegex: ".*\\.spec\\.ts$"`. Rodar com `npm test -- <padrão>`.
- **Gerenciador de pacotes:** o repositório tem `package-lock.json` **e** `pnpm-lock.yaml` coexistindo (ambiguidade registrada na análise §4 decisão #3 e resolvida na Fase 1 Task 1). Todos os comandos deste plano usam `npm`. Se a Fase 1 já removeu um dos lockfiles, mantenha `npm`; se não removeu, **não** resolva a ambiguidade aqui — só registre.
- **CORS: cliente sem header `Origin` DEVE passar.** curl, chamada servidor-a-servidor e webhook do Stripe não mandam `Origin`; CORS não se aplica a eles. O callback retorna `callback(null, true)` antes de qualquer consulta. Isso não é opcional — sem essa cláusula todos os webhooks (`/api/webhooks/stripe`, `/api/webhooks/b2b`, `/api/webhooks/b2c`, `/api/webhooks/booking-engine`) quebram.
- **Cache de CORS:** TTL de 5 min em caso de sucesso, 30 s em caso de falha (para não cachear conjunto vazio pelo TTL cheio), `invalidate()` obrigatório após qualquer escrita em `TenantDomain`.
- **Objetos de request do Reserve são snake_case.** `TenantGuard` (`src/shared/auth/guards/tenant.guard.ts:79-92`) grava `request.tenant_id` e `request.admin_role`. A Zarp usa `request.tenantId`/`request.adminRole` — ao copiar guards, troque. `CurrentAdminPayload` do Reserve expõe `admin_id`, `tenant_id`, `admin_role`, `tenant_role`.
- **Ordem da cadeia de guards:** `AdminJwtGuard → TenantGuard → ModuleAccessGuard → PermissionsGuard`. `ModuleAccessGuard` lê `request.tenant_id`, por isso **nunca** roda antes do `TenantGuard`.
- **Símbolos herdados da Fase 2** (RBAC) consumidos aqui com estas assinaturas exatas. Se a Fase 2 usou outro nome, ajuste **apenas o import**, nada mais:
  - `@RequirePermissions(...perms: string[])` — `src/shared/auth/decorators/require-permissions.decorator.ts`
  - `PermissionsGuard` — `src/shared/auth/guards/permissions.guard.ts`
  - `@Public()` — `src/shared/auth/decorators/public.decorator.ts`
  - `normalizeAdminRole(role: EAdminRole): EAdminRole` — `src/shared/auth/rbac/permission-matrix.ts`
  - `TenantPermissionPolicyService.resolve(adminId: string, tenantId: string, role: EAdminRole): Promise<Set<string>>` — `src/shared/auth/rbac/tenant-permission-policy.service.ts`
  - `GetTenantCapabilitiesUseCase` — `src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.ts`
  - `TenantCapabilitiesController` — `src/modules/reserve-auth/infrastructure/controllers/tenant-capabilities.controller.ts`
  - Permissões novas desta fase, a adicionar à `permission-matrix.ts` da Fase 2 na Task 16: `settings.read`, `settings.manage`, `settings.modules.read`, `settings.modules.manage`, `settings.domains.manage`.
- **`auth` e `settings` nunca são gateable.** Desligar `auth` tranca o admin fora (login, sessão, seleção de tenant); desligar `settings` remove o único caminho de religar um módulo e torna o estado irreversível. Ver Task 7.
- **Rotas públicas e de webhook não recebem `@RequiresModule`.** São `@Public()`, não têm `tenant_id` resolvido na request, e parar a reconciliação do Stripe corrompe estado de cobrança.
- **Após cada task:** `npm run build` passa, `npm test` 100% verde, commit. `npm run build` roda `prisma generate` antes do `nest build`, então toda task que muda `prisma/schema.prisma` precisa do build para o tipo novo aparecer.
- Não editar `src/generated/prisma/**` à mão — é saída de `prisma generate`.

---

### Task 1: Enum `ETenantType` e coluna `Tenant.tenant_type`

**Files:**
- Create: `prisma/migrations/20260726000001_add_tenant_type/migration.sql`
- Create: `src/shared/auth/constants/tenant-type.ts`
- Modify: `prisma/schema.prisma:191-236` (model `Tenant`) e fim do arquivo (blocos `enum`)
- Test: `src/shared/auth/constants/tenant-type.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `TENANT_TYPES` (`readonly ['MASTER','COMMON','EDUCATIONAL']`), `type TenantType = 'MASTER'|'COMMON'|'EDUCATIONAL'`, `DEFAULT_TENANT_TYPE: TenantType`, `isTenantType(value: unknown): value is TenantType`; coluna `Tenant.tenant_type` com default `COMMON`.

- [ ] **Step 1: Write the failing test**

`src/shared/auth/constants/tenant-type.spec.ts`:

```ts
import { ETenantType } from '../../../generated/prisma/enums';
import {
  DEFAULT_TENANT_TYPE,
  TENANT_TYPES,
  TenantType,
  isTenantType,
} from './tenant-type';

describe('tenant-type constants', () => {
  it('lists exactly the three platform tenant types', () => {
    expect(TENANT_TYPES).toEqual(['MASTER', 'COMMON', 'EDUCATIONAL']);
  });

  it('stays in lockstep with the Prisma ETenantType enum', () => {
    expect([...TENANT_TYPES].sort()).toEqual(Object.values(ETenantType).sort());
  });

  it('defaults to COMMON, matching the column default', () => {
    expect(DEFAULT_TENANT_TYPE).toBe<TenantType>('COMMON');
  });

  it('narrows only known values', () => {
    expect(isTenantType('MASTER')).toBe(true);
    expect(isTenantType('EDUCATIONAL')).toBe(true);
    expect(isTenantType('master')).toBe(false);
    expect(isTenantType(undefined)).toBe(false);
    expect(isTenantType(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tenant-type.spec`
Expected: FAIL com "Cannot find module './tenant-type'" (e, antes disso, "Module '\"../../../generated/prisma/enums\"' has no exported member 'ETenantType'").

- [ ] **Step 3: Write minimal implementation**

`prisma/schema.prisma` — adicionar o enum junto aos outros blocos `enum` no fim do arquivo:

```prisma
enum ETenantType {
  MASTER
  COMMON
  EDUCATIONAL
}
```

`prisma/schema.prisma` — no model `Tenant`, adicionar o campo depois de `timezone` e o índice junto aos `@@index` existentes:

```prisma
  tenant_type               ETenantType                 @default(COMMON)
```

```prisma
  @@index([tenant_type])
```

`prisma/migrations/20260726000001_add_tenant_type/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "ETenantType" AS ENUM ('MASTER', 'COMMON', 'EDUCATIONAL');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "tenant_type" "ETenantType" NOT NULL DEFAULT 'COMMON';

-- CreateIndex
CREATE INDEX "Tenant_tenant_type_idx" ON "Tenant"("tenant_type");
```

`src/shared/auth/constants/tenant-type.ts`:

```ts
/**
 * Platform tenant types. Mirrors the Prisma `ETenantType` enum — the spec
 * asserts both stay in lockstep, so add a value in both places or neither.
 *
 * MASTER      operator tenant: every gateable module is always on
 * COMMON      default commercial tenant
 * EDUCATIONAL reserved for education-shaped tenants (module policy differs)
 */
export const TENANT_TYPES = ['MASTER', 'COMMON', 'EDUCATIONAL'] as const;

export type TenantType = (typeof TENANT_TYPES)[number];

/** Matches the `@default(COMMON)` on Tenant.tenant_type. */
export const DEFAULT_TENANT_TYPE: TenantType = 'COMMON';

export function isTenantType(value: unknown): value is TenantType {
  return typeof value === 'string' && (TENANT_TYPES as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx prisma migrate dev` (aplica a migração e regenera o client) e depois `npm test -- tenant-type.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260726000001_add_tenant_type src/shared/auth/constants/tenant-type.ts src/shared/auth/constants/tenant-type.spec.ts
git commit -m "feat(tenant): add ETenantType enum and Tenant.tenant_type column"
```

---

### Task 2: Modelo `TenantDomain` e migração de dados de `Tenant.domain`

**Decisão travada:** a coluna `Tenant.domain` é **mantida por compatibilidade** e passa a ser **nullable + deprecada**; `TenantDomain` é a fonte de verdade. Três razões: (1) `Tenant.domain` é lida hoje em `src/modules/reserve-auth/application/services/admin.service.ts:180,187,425,433` e devolvida no payload de tenant que o painel consome — removê-la agora quebraria o painel entre a Fase 3 e a Fase 4; (2) o repositório já grava `domain: data.domain ?? null` (`src/modules/reserve-auth/infrastructure/repositories/tenant.repository.ts:20`) contra uma coluna `NOT NULL`, ou seja, criar tenant sem domínio falha hoje — tornar a coluna nullable **corrige** esse bug latente no mesmo movimento; (3) `prisma migrate` é forward-only aqui e dropar uma coluna `NOT NULL` é perda de dado irreversível. A remoção fica registrada como dívida para a fase que remover a última leitura no painel.

**Files:**
- Create: `prisma/migrations/20260726000002_add_tenant_domain/migration.sql`
- Modify: `prisma/schema.prisma:191-236` (model `Tenant`: `domain` vira `String?`, relação `TenantDomains`) e novo model `TenantDomain`
- Test: `src/shared/database/migrations.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: model `TenantDomain { id, tenant_id, type, value, is_primary, active, created_at, updated_at }` com `@@unique` em `value` e `@@index([tenant_id])`; `Tenant.domain` nullable.

- [ ] **Step 1: Write the failing test**

`src/shared/database/migrations.spec.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');

function readMigration(folder: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');
}

describe('20260726000002_add_tenant_domain', () => {
  const sql = readMigration('20260726000002_add_tenant_domain');

  it('creates the TenantDomain table in snake_case', () => {
    expect(sql).toContain('CREATE TABLE "TenantDomain"');
    expect(sql).toContain('"tenant_id" VARCHAR(25) NOT NULL');
    expect(sql).toContain('"is_primary" BOOLEAN NOT NULL DEFAULT false');
    expect(sql).toContain('"created_at"');
    expect(sql).toContain('"updated_at"');
    expect(sql).not.toMatch(/"tenantId"|"isPrimary"|"createdAt"/);
  });

  it('enforces a unique value and indexes tenant_id', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "TenantDomain_value_key"');
    expect(sql).toContain('CREATE INDEX "TenantDomain_tenant_id_idx"');
  });

  it('cascades on tenant delete', () => {
    expect(sql).toMatch(/TenantDomain_tenant_id_fkey[\s\S]*ON DELETE CASCADE/);
  });

  it('backfills a primary row from the existing Tenant.domain column', () => {
    expect(sql).toContain('INSERT INTO "TenantDomain"');
    expect(sql).toContain('FROM "Tenant"');
    // is_primary true for the migrated value
    expect(sql).toMatch(/INSERT INTO "TenantDomain"[\s\S]*true/);
  });

  it('normalizes scheme and trailing slash while backfilling', () => {
    expect(sql).toContain("regexp_replace");
    expect(sql).toContain("'^https?://'");
  });

  it('deduplicates domains shared by more than one tenant', () => {
    expect(sql).toContain('DISTINCT ON');
  });

  it('keeps Tenant.domain but relaxes NOT NULL for backward compatibility', () => {
    expect(sql).toContain('ALTER TABLE "Tenant" ALTER COLUMN "domain" DROP NOT NULL');
    expect(sql).not.toContain('DROP COLUMN "domain"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- migrations.spec`
Expected: FAIL com "ENOENT: no such file or directory, open '...prisma\\migrations\\20260726000002_add_tenant_domain\\migration.sql'".

- [ ] **Step 3: Write minimal implementation**

`prisma/schema.prisma` — no model `Tenant`, trocar a linha do `domain` e acrescentar a relação:

```prisma
  /// @deprecated Fonte de verdade é TenantDomain (is_primary = true). Mantida
  /// por compatibilidade com o payload de tenant que o painel consome; será
  /// removida quando a última leitura sair do frontend.
  domain                    String?                     @db.VarChar(255)
```

```prisma
  TenantDomains             TenantDomain[]
```

`prisma/schema.prisma` — novo model, ao lado do model `Tenant`:

```prisma
model TenantDomain {
  id         String   @id @default(cuid()) @db.VarChar(25)
  tenant_id  String   @db.VarChar(25)
  /// "domain" = host + subdomínios, https only. "regex" = padrão casado literalmente contra o Origin.
  type       String   @default("domain") @db.VarChar(10)
  value      String   @unique @db.VarChar(500)
  is_primary Boolean  @default(false)
  active     Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  Tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@index([tenant_id])
}
```

`prisma/migrations/20260726000002_add_tenant_domain/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "type" VARCHAR(10) NOT NULL DEFAULT 'domain',
    "value" VARCHAR(500) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_value_key" ON "TenantDomain"("value");

-- CreateIndex
CREATE INDEX "TenantDomain_tenant_id_idx" ON "TenantDomain"("tenant_id");

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: promote the single legacy Tenant.domain value to a primary
-- TenantDomain row. Value is normalized (lowercased, scheme and trailing slash
-- stripped) because CorsOriginService stores bare hosts. TenantDomain.value is
-- UNIQUE and two tenants may share a domain today, so DISTINCT ON keeps the
-- oldest tenant deterministically; any loser is reported by the audit query
-- below and re-added by hand as a regex/extra domain if it is legitimate.
INSERT INTO "TenantDomain" ("id", "tenant_id", "type", "value", "is_primary", "active", "created_at", "updated_at")
SELECT DISTINCT ON (normalized.value)
    'c' || substr(md5(random()::text || normalized.tenant_id), 1, 24),
    normalized.tenant_id,
    'domain',
    normalized.value,
    true,
    true,
    NOW(),
    NOW()
FROM (
    SELECT
        t."id" AS tenant_id,
        t."created_at" AS created_at,
        regexp_replace(
            regexp_replace(lower(btrim(t."domain")), '^https?://', ''),
            '/+$', ''
        ) AS value
    FROM "Tenant" t
    WHERE t."domain" IS NOT NULL AND btrim(t."domain") <> ''
) AS normalized
WHERE normalized.value <> ''
ORDER BY normalized.value, normalized.created_at ASC;

-- AlterTable: keep the legacy column (the tenant payload the dashboard reads
-- still exposes it) but drop NOT NULL. TenantRepository.create already writes
-- `domain: data.domain ?? null`, which fails today against a NOT NULL column.
ALTER TABLE "Tenant" ALTER COLUMN "domain" DROP NOT NULL;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx prisma migrate dev && npm test -- migrations.spec`
Expected: PASS

Auditoria manual de domínios perdidos na deduplicação (rodar uma vez após a migração, deve retornar 0 linhas):

```sql
SELECT t."id", t."domain"
FROM "Tenant" t
WHERE t."domain" IS NOT NULL AND btrim(t."domain") <> ''
  AND NOT EXISTS (SELECT 1 FROM "TenantDomain" d WHERE d."tenant_id" = t."id");
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260726000002_add_tenant_domain src/shared/database/migrations.spec.ts
git commit -m "feat(tenant): add TenantDomain model and backfill it from Tenant.domain"
```

---

### Task 3: `CorsOriginService` e `CorsModule`

**Files:**
- Create: `src/shared/cors/cors-origin.service.ts`
- Create: `src/shared/cors/cors.module.ts`
- Test: `src/shared/cors/cors-origin.service.spec.ts`

**Interfaces:**
- Consumes: `prisma.tenantDomain.findMany({ where: { active: true, Tenant: { active: true } }, select: { type: true, value: true } })` (Task 2), `PrismaService` de `src/shared/database/prisma.service.ts`.
- Produces: `CorsOriginService` com `isAllowed(origin: string): Promise<boolean>` e `invalidate(): void`; `CorsModule` (`@Global()`, exporta `CorsOriginService`).

- [ ] **Step 1: Write the failing test**

`src/shared/cors/cors-origin.service.spec.ts`:

```ts
import { CorsOriginService } from './cors-origin.service';

describe('CorsOriginService', () => {
  const ORIGINAL_ENV = process.env.CORS_ORIGINS;
  let findMany: jest.Mock;
  let prisma: any;

  const makeService = () => new CorsOriginService(prisma);

  beforeEach(() => {
    process.env.CORS_ORIGINS = 'https://admin.reserve.com, https://reserve.com/';
    findMany = jest.fn().mockResolvedValue([]);
    prisma = { tenantDomain: { findMany } };
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = ORIGINAL_ENV;
  });

  it('allows an env origin without querying the database', async () => {
    const service = makeService();
    await expect(service.isAllowed('https://admin.reserve.com')).resolves.toBe(true);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('normalizes trailing slashes in env origins and in the incoming origin', async () => {
    const service = makeService();
    await expect(service.isAllowed('https://reserve.com/')).resolves.toBe(true);
  });

  it('allows the bare registered domain', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);
  });

  it('allows a subdomain of a registered domain automatically', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://app.hotelacme.com')).resolves.toBe(true);
    await expect(service.isAllowed('https://portal.hotelacme.com')).resolves.toBe(true);
    await expect(service.isAllowed('https://a.b.hotelacme.com')).resolves.toBe(true);
  });

  it('rejects a sibling domain that only shares a suffix', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://outrohotelacme.com')).resolves.toBe(false);
    await expect(service.isAllowed('https://nothotelacme.com')).resolves.toBe(false);
  });

  it('rejects http origins for scoped domains', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('http://hotelacme.com')).resolves.toBe(false);
  });

  it('normalizes a domain value stored with a scheme prefix', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'https://portal.other.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://portal.other.com')).resolves.toBe(true);
  });

  it('blocks an unknown origin', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://evil.example')).resolves.toBe(false);
  });

  it('matches a stored regex pattern literally', async () => {
    findMany.mockResolvedValue([
      { type: 'regex', value: '^https://(preview-\\d+\\.)?staging\\.hotelacme\\.com$' },
    ]);
    const service = makeService();
    await expect(service.isAllowed('https://preview-42.staging.hotelacme.com')).resolves.toBe(true);
    await expect(service.isAllowed('https://staging.hotelacme.com')).resolves.toBe(true);
    await expect(service.isAllowed('https://random.com')).resolves.toBe(false);
  });

  it('skips a malformed stored regex without throwing', async () => {
    findMany.mockResolvedValue([
      { type: 'regex', value: '(unterminated' },
      { type: 'domain', value: 'hotelacme.com' },
    ]);
    const service = makeService();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);
  });

  it('ignores blank stored values', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: '' }, { type: 'domain', value: '   ' }]);
    const service = makeService();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(false);
  });

  it('only queries active domains of active tenants', async () => {
    const service = makeService();
    await service.isAllowed('https://hotelacme.com');
    expect(findMany).toHaveBeenCalledWith({
      where: { active: true, Tenant: { active: true } },
      select: { type: true, value: true },
    });
  });

  it('caches tenant domains between calls', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await service.isAllowed('https://hotelacme.com');
    await service.isAllowed('https://app.hotelacme.com');
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('invalidate() forces a re-query on the next check', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await service.isAllowed('https://hotelacme.com');
    service.invalidate();
    await service.isAllowed('https://hotelacme.com');
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('falls back to the stale cache when refresh fails', async () => {
    const service = makeService();
    findMany.mockResolvedValueOnce([{ type: 'domain', value: 'hotelacme.com' }]);
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);

    findMany.mockRejectedValueOnce(new Error('db down'));
    service.invalidate();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);
  });

  it('still allows env origins when the database is down', async () => {
    findMany.mockRejectedValue(new Error('db down'));
    const service = makeService();
    await expect(service.isAllowed('https://unknown.example')).resolves.toBe(false);
    await expect(service.isAllowed('https://admin.reserve.com')).resolves.toBe(true);
  });

  it('retries soon after a failed refresh instead of caching an empty set', async () => {
    findMany.mockRejectedValueOnce(new Error('db down'));
    const service = makeService();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(false);

    findMany.mockResolvedValueOnce([{ type: 'domain', value: 'hotelacme.com' }]);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);
    jest.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cors-origin.service.spec`
Expected: FAIL com "Cannot find module './cors-origin.service' from 'shared/cors/cors-origin.service.spec.ts'".

- [ ] **Step 3: Write minimal implementation**

`src/shared/cors/cors-origin.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const TENANT_CACHE_TTL_MS = 5 * 60 * 1000;
const TENANT_CACHE_RETRY_MS = 30 * 1000;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Builds a matcher for "https://" + value + optional subdomains, e.g. hotelacme.com -> https://hotelacme.com and https://app.hotelacme.com. */
function buildScopedDomainMatcher(value: string): RegExp {
  const escaped = escapeRegExp(value);
  return new RegExp(`^https://([a-z0-9-]+\\.)*${escaped}$`, 'i');
}

/**
 * CORS allowlist = static platform origins (CORS_ORIGINS env) + dynamic tenant
 * domains (TenantDomain, active rows of active tenants only), cached in process
 * memory. Writes to TenantDomain MUST call invalidate(); the TTL is only a
 * fallback for a missed invalidation.
 *
 * Two matcher kinds per TenantDomain.type:
 * - 'domain': auto-scoped to the value and all its subdomains, https only.
 * - 'regex': the stored value is compiled and matched against Origin verbatim.
 *   A malformed stored pattern is logged and skipped, never thrown.
 *
 * Requests with no Origin header are NOT this service's problem — the callback
 * in shared/cors/cors-origin.callback.ts short-circuits them before we get here.
 */
@Injectable()
export class CorsOriginService {
  private readonly logger = new Logger(CorsOriginService.name);
  private readonly envOrigins: Set<string>;
  private tenantDomainMatchers: RegExp[] = [];
  private tenantRegexMatchers: RegExp[] = [];
  private expiresAt = 0;
  private refreshing: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.envOrigins = new Set(
      (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean),
    );
  }

  /** Call after any write to TenantDomain (the list may have changed). */
  invalidate(): void {
    this.expiresAt = 0;
  }

  async isAllowed(origin: string): Promise<boolean> {
    const normalized = origin.replace(/\/$/, '');
    if (this.envOrigins.has(normalized)) return true;
    if (Date.now() >= this.expiresAt) await this.refresh();
    return (
      this.tenantDomainMatchers.some((matcher) => matcher.test(normalized)) ||
      this.tenantRegexMatchers.some((matcher) => matcher.test(normalized))
    );
  }

  private async refresh(): Promise<void> {
    if (!this.refreshing) {
      this.refreshing = this.loadTenantOrigins().finally(() => {
        this.refreshing = null;
      });
    }
    await this.refreshing;
  }

  private async loadTenantOrigins(): Promise<void> {
    try {
      const domains = await this.prisma.tenantDomain.findMany({
        where: { active: true, Tenant: { active: true } },
        select: { type: true, value: true },
      });

      const domainMatchers: RegExp[] = [];
      const regexMatchers: RegExp[] = [];

      for (const { type, value } of domains) {
        const trimmed = (value ?? '').trim();
        if (!trimmed) continue;

        if (type === 'regex') {
          try {
            regexMatchers.push(new RegExp(trimmed));
          } catch (error) {
            this.logger.error(
              `Skipping malformed tenant CORS regex "${trimmed}": ${(error as Error).message}`,
            );
          }
          continue;
        }

        const bareHost = trimmed.replace(/^https?:\/\//, '').replace(/\/$/, '');
        domainMatchers.push(buildScopedDomainMatcher(bareHost));
      }

      this.tenantDomainMatchers = domainMatchers;
      this.tenantRegexMatchers = regexMatchers;
      this.expiresAt = Date.now() + TENANT_CACHE_TTL_MS;
    } catch (error) {
      // Keep the stale cache + env allowlist working; retry soon instead of
      // caching an empty set for the full TTL.
      this.logger.error(
        `Failed to refresh tenant CORS origins: ${(error as Error).message}`,
      );
      this.expiresAt = Date.now() + TENANT_CACHE_RETRY_MS;
    }
  }
}
```

`src/shared/cors/cors.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CorsOriginService } from './cors-origin.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [CorsOriginService],
  exports: [CorsOriginService],
})
export class CorsModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cors-origin.service.spec`
Expected: PASS (18 testes)

- [ ] **Step 5: Commit**

```bash
git add src/shared/cors
git commit -m "feat(cors): add CorsOriginService with tenant-domain allowlist and TTL cache"
```

---

### Task 4: CORS dinâmico no bootstrap

**Files:**
- Create: `src/shared/cors/cors-origin.callback.ts`
- Modify: `src/main.ts:14-25` (registrar `CorsModule` via `app.module.ts` e trocar `enableCors`)
- Modify: `src/app.module.ts:8-9,33-36` (importar `CorsModule`)
- Test: `src/shared/cors/cors-origin.callback.spec.ts`

**Interfaces:**
- Consumes: `CorsOriginService.isAllowed(origin)` (Task 3).
- Produces: `createCorsOriginResolver(service: CorsOriginService): (origin: string | undefined, callback: CorsOriginCallback) => void`.

- [ ] **Step 1: Write the failing test**

`src/shared/cors/cors-origin.callback.spec.ts`:

```ts
import { createCorsOriginResolver } from './cors-origin.callback';

describe('createCorsOriginResolver', () => {
  const makeService = (impl: jest.Mock) => ({ isAllowed: impl }) as any;

  it('allows a request with no Origin header WITHOUT consulting the allowlist', () => {
    // curl, server-to-server and Stripe webhooks send no Origin. CORS does not
    // apply to them; blocking here breaks every /api/webhooks/* route.
    const isAllowed = jest.fn();
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve(undefined, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
    expect(isAllowed).not.toHaveBeenCalled();
  });

  it('treats an empty-string Origin as absent', () => {
    const isAllowed = jest.fn();
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve('', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
    expect(isAllowed).not.toHaveBeenCalled();
  });

  it('allows an origin the service accepts', async () => {
    const isAllowed = jest.fn().mockResolvedValue(true);
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve('https://app.hotelacme.com', callback);
    await new Promise(process.nextTick);

    expect(isAllowed).toHaveBeenCalledWith('https://app.hotelacme.com');
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('denies an origin the service rejects, without raising an error', async () => {
    const isAllowed = jest.fn().mockResolvedValue(false);
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve('https://evil.example', callback);
    await new Promise(process.nextTick);

    expect(callback).toHaveBeenCalledWith(null, false);
  });

  it('propagates a service failure as a callback error and denies', async () => {
    const failure = new Error('db down');
    const isAllowed = jest.fn().mockRejectedValue(failure);
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve('https://app.hotelacme.com', callback);
    await new Promise(process.nextTick);

    expect(callback).toHaveBeenCalledWith(failure, false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cors-origin.callback.spec`
Expected: FAIL com "Cannot find module './cors-origin.callback' from 'shared/cors/cors-origin.callback.spec.ts'".

- [ ] **Step 3: Write minimal implementation**

`src/shared/cors/cors-origin.callback.ts`:

```ts
import { CorsOriginService } from './cors-origin.service';

export type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

/**
 * Express/Nest `cors` origin resolver backed by CorsOriginService.
 *
 * Extracted from main.ts so the no-Origin rule is unit-testable: non-browser
 * clients (curl, server-to-server, Stripe/booking-engine webhooks) send no
 * Origin header and CORS does not apply to them — they pass before any DB read.
 */
export function createCorsOriginResolver(service: CorsOriginService) {
  return (origin: string | undefined, callback: CorsOriginCallback): void => {
    if (!origin) {
      callback(null, true);
      return;
    }

    service
      .isAllowed(origin)
      .then((allowed) => callback(null, allowed))
      .catch((error) => callback(error as Error, false));
  };
}
```

`src/app.module.ts` — adicionar o import e o módulo:

```ts
import { CorsModule } from './shared/cors/cors.module';
```

```ts
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CorsModule,
    AuthModule,
    ScheduleModule.forRoot(),
```

`src/main.ts` — trocar o bloco `app.enableCors({...})` (linhas 22-25) por:

```ts
  const corsOriginService = app.get(CorsOriginService);
  app.enableCors({
    origin: createCorsOriginResolver(corsOriginService),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'session-id', 'x-tenant-id'],
  });
```

e acrescentar os imports no topo de `src/main.ts`:

```ts
import { CorsOriginService } from './shared/cors/cors-origin.service';
import { createCorsOriginResolver } from './shared/cors/cors-origin.callback';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cors-origin.callback.spec && npm run build`
Expected: PASS e build sem erro

Verificação manual do caminho sem `Origin` (deve responder 200/400 da aplicação, nunca erro de CORS):

```bash
curl -i -X POST http://localhost:3002/api/webhooks/stripe -H 'Content-Type: application/json' -d '{}'
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/cors/cors-origin.callback.ts src/shared/cors/cors-origin.callback.spec.ts src/main.ts src/app.module.ts
git commit -m "feat(cors): replace static CORS_ORIGINS list with dynamic tenant-domain resolver"
```

---

### Task 5: Modelo `TenantSetting`, interface e repositório Prisma

**Files:**
- Create: `prisma/migrations/20260726000003_add_tenant_setting/migration.sql`
- Create: `src/modules/reserve-settings/domain/interfaces/tenant-setting.repository.interface.ts`
- Create: `src/modules/reserve-settings/infrastructure/repositories/prisma-tenant-setting.repository.ts`
- Modify: `prisma/schema.prisma` (model `Tenant`: relação `TenantSettings`; novo model `TenantSetting`)
- Modify: `src/shared/database/migrations.spec.ts` (acrescentar o `describe` da nova migração)
- Test: `src/modules/reserve-settings/infrastructure/repositories/prisma-tenant-setting.repository.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `TENANT_SETTING_REPOSITORY` (Symbol), `ITenantSettingRow { key: string; value: unknown }`, `ITenantSettingRepository { findByTenantAndModule; findOne; upsert }`, `PrismaTenantSettingRepository`.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-settings/infrastructure/repositories/prisma-tenant-setting.repository.spec.ts`:

```ts
import { PrismaTenantSettingRepository } from './prisma-tenant-setting.repository';

describe('PrismaTenantSettingRepository', () => {
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let upsert: jest.Mock;
  let repository: PrismaTenantSettingRepository;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);
    findUnique = jest.fn().mockResolvedValue(null);
    upsert = jest.fn().mockResolvedValue(undefined);
    repository = new PrismaTenantSettingRepository({
      tenantSetting: { findMany, findUnique, upsert },
    } as any);
  });

  it('reads a module with snake_case filters', async () => {
    findMany.mockResolvedValue([{ key: 'email_enabled', value: true }]);

    await expect(repository.findByTenantAndModule('t-1', 'notifications')).resolves.toEqual([
      { key: 'email_enabled', value: true },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { tenant_id: 't-1', module: 'notifications' },
      select: { key: true, value: true },
    });
  });

  it('reads one key through the composite unique tenant_id_module_key', async () => {
    findUnique.mockResolvedValue({ value: false });

    await expect(repository.findOne('t-1', 'platform', 'module.cms.enabled')).resolves.toEqual({
      value: false,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        tenant_id_module_key: { tenant_id: 't-1', module: 'platform', key: 'module.cms.enabled' },
      },
      select: { value: true },
    });
  });

  it('returns null when the key has no stored row', async () => {
    await expect(repository.findOne('t-1', 'platform', 'module.cms.enabled')).resolves.toBeNull();
  });

  it('upserts with updated_by and snake_case create payload', async () => {
    await repository.upsert('t-1', 'notifications', 'email_enabled', false, 'admin-9');

    expect(upsert).toHaveBeenCalledWith({
      where: {
        tenant_id_module_key: { tenant_id: 't-1', module: 'notifications', key: 'email_enabled' },
      },
      create: {
        tenant_id: 't-1',
        module: 'notifications',
        key: 'email_enabled',
        value: false,
        updated_by: 'admin-9',
      },
      update: { value: false, updated_by: 'admin-9' },
    });
  });

  it('stores a null updated_by when no author is given', async () => {
    await repository.upsert('t-1', 'notifications', 'email_enabled', true);

    expect(upsert.mock.calls[0][0].create.updated_by).toBeNull();
    expect(upsert.mock.calls[0][0].update.updated_by).toBeNull();
  });
});
```

E acrescentar em `src/shared/database/migrations.spec.ts`:

```ts
describe('20260726000003_add_tenant_setting', () => {
  const sql = readMigration('20260726000003_add_tenant_setting');

  it('creates TenantSetting with a JSONB value in snake_case', () => {
    expect(sql).toContain('CREATE TABLE "TenantSetting"');
    expect(sql).toContain('"tenant_id" VARCHAR(25) NOT NULL');
    expect(sql).toContain('"value" JSONB NOT NULL');
    expect(sql).toContain('"updated_by" VARCHAR(25)');
    expect(sql).not.toMatch(/"tenantId"|"updatedBy"/);
  });

  it('enforces one row per tenant/module/key', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "TenantSetting_tenant_id_module_key_key"');
    expect(sql).toContain('CREATE INDEX "TenantSetting_tenant_id_module_idx"');
  });

  it('cascades on tenant delete', () => {
    expect(sql).toMatch(/TenantSetting_tenant_id_fkey[\s\S]*ON DELETE CASCADE/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prisma-tenant-setting.repository.spec migrations.spec`
Expected: FAIL com "Cannot find module './prisma-tenant-setting.repository'" e "ENOENT ... 20260726000003_add_tenant_setting\\migration.sql".

- [ ] **Step 3: Write minimal implementation**

`prisma/schema.prisma` — no model `Tenant`, acrescentar a relação:

```prisma
  TenantSettings            TenantSetting[]
```

`prisma/schema.prisma` — novo model:

```prisma
model TenantSetting {
  id         String   @id @default(cuid()) @db.VarChar(25)
  tenant_id  String   @db.VarChar(25)
  module     String   @db.VarChar(50)
  key        String   @db.VarChar(100)
  value      Json
  updated_by String?  @db.VarChar(25)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  Tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@unique([tenant_id, module, key])
  @@index([tenant_id, module])
}
```

`prisma/migrations/20260726000003_add_tenant_setting/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "TenantSetting" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSetting_tenant_id_module_key_key" ON "TenantSetting"("tenant_id", "module", "key");

-- CreateIndex
CREATE INDEX "TenantSetting_tenant_id_module_idx" ON "TenantSetting"("tenant_id", "module");

-- AddForeignKey
ALTER TABLE "TenantSetting" ADD CONSTRAINT "TenantSetting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

`src/modules/reserve-settings/domain/interfaces/tenant-setting.repository.interface.ts`:

```ts
export const TENANT_SETTING_REPOSITORY = Symbol('TENANT_SETTING_REPOSITORY');

export interface ITenantSettingRow {
  key: string;
  value: unknown;
}

export interface ITenantSettingRepository {
  findByTenantAndModule(tenantId: string, module: string): Promise<ITenantSettingRow[]>;
  findOne(tenantId: string, module: string, key: string): Promise<{ value: unknown } | null>;
  upsert(
    tenantId: string,
    module: string,
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<void>;
}
```

`src/modules/reserve-settings/infrastructure/repositories/prisma-tenant-setting.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  ITenantSettingRepository,
  ITenantSettingRow,
} from '../../domain/interfaces/tenant-setting.repository.interface';

/**
 * Storage keys are snake_case on the wire to the database (see SettingsService,
 * which converts the camelCase contract key before calling in here).
 */
@Injectable()
export class PrismaTenantSettingRepository implements ITenantSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndModule(tenantId: string, module: string): Promise<ITenantSettingRow[]> {
    const rows = await this.prisma.tenantSetting.findMany({
      where: { tenant_id: tenantId, module },
      select: { key: true, value: true },
    });
    return rows.map((row) => ({ key: row.key, value: row.value as unknown }));
  }

  async findOne(
    tenantId: string,
    module: string,
    key: string,
  ): Promise<{ value: unknown } | null> {
    const row = await this.prisma.tenantSetting.findUnique({
      where: { tenant_id_module_key: { tenant_id: tenantId, module, key } },
      select: { value: true },
    });
    return row ? { value: row.value as unknown } : null;
  }

  async upsert(
    tenantId: string,
    module: string,
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<void> {
    await this.prisma.tenantSetting.upsert({
      where: { tenant_id_module_key: { tenant_id: tenantId, module, key } },
      create: {
        tenant_id: tenantId,
        module,
        key,
        value: value as any,
        updated_by: updatedBy ?? null,
      },
      update: { value: value as any, updated_by: updatedBy ?? null },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx prisma migrate dev && npm test -- prisma-tenant-setting.repository.spec migrations.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260726000003_add_tenant_setting src/modules/reserve-settings src/shared/database/migrations.spec.ts
git commit -m "feat(settings): add TenantSetting model with Prisma repository"
```

---

### Task 6: Catálogo `GATEABLE_MODULES`

Módulos **gateable** do Reserve (10), derivados de `src/modules/` e da navegação do painel:

| Módulo | Superfície admin que ele governa |
|---|---|
| `cms` | `reserve-cms` — artigos, blogs, autores, assets, coleções, relações |
| `leads` | `reserve-leads` — leads, coleções, agendamentos, bloqueios |
| `mailer` | `reserve-mailer` — campanhas de e-mail e leads de campanha |
| `notifications` | `reserve-notifications` — inbox do tenant |
| `stats` | `reserve-stats` — dashboard e integrações |
| `reports` | `reserve-reports` — relatórios analíticos |
| `coupons` | `reserve-coupons` — cupons administrativos |
| `payments` | `reserve-subscriptions` + `reserve-b2b-payments` — planos, assinaturas, billing config, fees B2B |
| `products` | `reserve-b2c-products` — catálogo B2C e fee config |
| `client-portal` | `reserve-client-portal` — portal do hotel (clientes, reservas, métricas, CRM de hóspedes, WhatsApp) |

**NÃO gateable, com a razão:**

| Não gateable | Razão |
|---|---|
| `auth` (`reserve-auth`) | login, sessão, seleção de tenant e gestão de admins/tenants. Desligar tranca o admin fora da plataforma. |
| `settings` (`reserve-settings`) | é o único caminho para religar um módulo. Desligar torna o estado irreversível. |
| `unified-webhooks` (`reserve-unified-webhooks`) e os controllers `webhooks/*` de b2b, b2c, subscriptions e booking-engine | são `@Public()`, não têm `tenant_id` na request (o `ModuleAccessGuard` nem consegue rodar) e parar a reconciliação do Stripe corrompe estado de cobrança. |
| rotas públicas de captura/checkout/redirect (`public/*`, `collect`, `appointments` público, `wa/:code`, `lookup`) | consumidas por landing pages e links rastreados de clientes finais, sem contexto de tenant admin. |
| superfície do app do consumidor (`products` com `UserJwtGuard`, `subscriptions` do usuário final) | pertence ao app B2C, não ao painel; o flag do painel não deve derrubar a compra de um cliente. |

Diferenças em relação ao `GATEABLE_MODULES` da Zarp: fora `courses`, `automations`, `metrics`, `brands`, `cnpjs`, `journals`, `pi-bot` (domínio exclusivo da Zarp ou legado); dentro `stats` (nome do Reserve para `metrics`), `products` e `client-portal` (não existem na Zarp). O Reserve **não tem** `LEGACY_MODULES`, então a resolução de política tem 3 fontes, não 4.

**Files:**
- Create: `src/shared/auth/constants/gateable-modules.ts`
- Test: `src/shared/auth/constants/gateable-modules.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `GATEABLE_MODULES` (tupla `as const` de 10 nomes), `type GateableModule`, `isGateableModule(value: string): value is GateableModule`, `moduleFlagKey(module: GateableModule): string`, `NON_GATEABLE_MODULES`.

- [ ] **Step 1: Write the failing test**

`src/shared/auth/constants/gateable-modules.spec.ts`:

```ts
import {
  GATEABLE_MODULES,
  NON_GATEABLE_MODULES,
  isGateableModule,
  moduleFlagKey,
} from './gateable-modules';

describe('GATEABLE_MODULES', () => {
  it('lists exactly the ten gateable Reserve bounded contexts', () => {
    expect([...GATEABLE_MODULES]).toEqual([
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
    ]);
  });

  it('has no duplicates', () => {
    expect(new Set(GATEABLE_MODULES).size).toBe(GATEABLE_MODULES.length);
  });

  it('never lists a module whose shutdown locks the admin out', () => {
    // auth: login/session/tenant selection. settings: the only way back on.
    // webhooks: @Public(), no tenant on the request, Stripe reconciliation.
    for (const forbidden of NON_GATEABLE_MODULES) {
      expect(GATEABLE_MODULES).not.toContain(forbidden as never);
    }
    expect([...NON_GATEABLE_MODULES]).toEqual([
      'auth',
      'settings',
      'unified-webhooks',
    ]);
  });

  it('narrows only catalogued names', () => {
    expect(isGateableModule('cms')).toBe(true);
    expect(isGateableModule('client-portal')).toBe(true);
    expect(isGateableModule('auth')).toBe(false);
    expect(isGateableModule('settings')).toBe(false);
    expect(isGateableModule('courses')).toBe(false);
  });

  it('builds a stable platform setting key per module', () => {
    expect(moduleFlagKey('cms')).toBe('module.cms.enabled');
    expect(moduleFlagKey('client-portal')).toBe('module.client-portal.enabled');
  });

  it('keeps every flag key inside the TenantSetting.key VARCHAR(100) budget', () => {
    for (const module of GATEABLE_MODULES) {
      expect(moduleFlagKey(module).length).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- gateable-modules.spec`
Expected: FAIL com "Cannot find module './gateable-modules' from 'shared/auth/constants/gateable-modules.spec.ts'".

- [ ] **Step 3: Write minimal implementation**

`src/shared/auth/constants/gateable-modules.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- gateable-modules.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/constants/gateable-modules.ts src/shared/auth/constants/gateable-modules.spec.ts
git commit -m "feat(auth): add GATEABLE_MODULES catalog with documented denylist"
```

---

### Task 7: Definição e validação de setting

**Files:**
- Create: `src/modules/reserve-settings/domain/entities/setting-definition.ts`
- Create: `src/modules/reserve-settings/domain/exceptions/settings.errors.ts`
- Create: `src/modules/reserve-settings/domain/services/setting-validator.ts`
- Test: `src/modules/reserve-settings/domain/services/setting-validator.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `SettingScope = 'tenant'|'superadmin'`, `SettingType = 'boolean'|'string'|'number'|'json'`, `SettingMergeStrategy = 'replace'|'shallow_object'`, `interface SettingDefinition`, `UnknownSettingError`, `InvalidSettingValueError`, `ForbiddenSettingError`, `validateSettingValue(def: SettingDefinition, value: unknown): void`.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-settings/domain/services/setting-validator.spec.ts`:

```ts
import { SettingDefinition } from '../entities/setting-definition';
import { InvalidSettingValueError } from '../exceptions/settings.errors';
import { validateSettingValue } from './setting-validator';

const def = (over: Partial<SettingDefinition>): SettingDefinition => ({
  module: 'notifications',
  key: 'email_enabled',
  type: 'boolean',
  default: true,
  scope: 'tenant',
  description: 'test',
  ...over,
});

describe('validateSettingValue', () => {
  it('accepts a boolean for a boolean setting', () => {
    expect(() => validateSettingValue(def({ type: 'boolean' }), false)).not.toThrow();
  });

  it('rejects a non-boolean for a boolean setting', () => {
    expect(() => validateSettingValue(def({ type: 'boolean' }), 'false')).toThrow(
      InvalidSettingValueError,
    );
    expect(() => validateSettingValue(def({ type: 'boolean' }), 'false')).toThrow(
      /expected boolean/,
    );
  });

  it('accepts a string for a string setting and rejects other types', () => {
    expect(() => validateSettingValue(def({ type: 'string' }), 'ops@acme.com')).not.toThrow();
    expect(() => validateSettingValue(def({ type: 'string' }), 42)).toThrow(/expected string/);
  });

  it('accepts a finite number and rejects NaN', () => {
    expect(() => validateSettingValue(def({ type: 'number' }), 7)).not.toThrow();
    expect(() => validateSettingValue(def({ type: 'number' }), Number.NaN)).toThrow(
      /expected number/,
    );
    expect(() => validateSettingValue(def({ type: 'number' }), '7')).toThrow(/expected number/);
  });

  it('accepts any defined JSON value, including null and arrays', () => {
    expect(() => validateSettingValue(def({ type: 'json' }), { a: 1 })).not.toThrow();
    expect(() => validateSettingValue(def({ type: 'json' }), [])).not.toThrow();
    expect(() => validateSettingValue(def({ type: 'json' }), null)).not.toThrow();
  });

  it('rejects undefined for a JSON setting', () => {
    expect(() => validateSettingValue(def({ type: 'json' }), undefined)).toThrow(
      /expected a JSON value/,
    );
  });

  it('runs the custom validator after the type check', () => {
    const custom = def({ type: 'string', validate: (v) => (v as string).includes('@') });
    expect(() => validateSettingValue(custom, 'ops@acme.com')).not.toThrow();
    expect(() => validateSettingValue(custom, 'ops')).toThrow(/failed custom validation/);
  });

  it('names the offending module and key in the error message', () => {
    expect(() =>
      validateSettingValue(def({ module: 'platform', key: 'module.cms.enabled' }), 'yes'),
    ).toThrow('Invalid value for platform.module.cms.enabled: expected boolean');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- setting-validator.spec`
Expected: FAIL com "Cannot find module '../entities/setting-definition'".

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-settings/domain/entities/setting-definition.ts`:

```ts
export type SettingScope = 'tenant' | 'superadmin';
export type SettingType = 'boolean' | 'string' | 'number' | 'json';
export type SettingMergeStrategy = 'replace' | 'shallow_object';

/**
 * A setting exists because it is declared here in code, not because a row
 * exists in the database. Absence of a row means "use `default`".
 *
 * `key` is the storage key and is snake_case; the HTTP contract exposes the
 * camelCase form (SettingsService converts both ways).
 */
export interface SettingDefinition {
  module: string;
  key: string;
  type: SettingType;
  default: unknown;
  scope: SettingScope;
  description: string;
  mergeStrategy?: SettingMergeStrategy;
  validate?: (value: unknown) => boolean;
}
```

`src/modules/reserve-settings/domain/exceptions/settings.errors.ts`:

```ts
export class UnknownSettingError extends Error {
  constructor(module: string, key: string) {
    super(`Unknown setting: ${module}.${key}`);
    this.name = 'UnknownSettingError';
  }
}

export class InvalidSettingValueError extends Error {
  constructor(module: string, key: string, why: string) {
    super(`Invalid value for ${module}.${key}: ${why}`);
    this.name = 'InvalidSettingValueError';
  }
}

export class ForbiddenSettingError extends Error {
  constructor(module: string, key: string) {
    super(`Setting ${module}.${key} is not writable at tenant scope`);
    this.name = 'ForbiddenSettingError';
  }
}
```

`src/modules/reserve-settings/domain/services/setting-validator.ts`:

```ts
import { SettingDefinition } from '../entities/setting-definition';
import { InvalidSettingValueError } from '../exceptions/settings.errors';

export function validateSettingValue(def: SettingDefinition, value: unknown): void {
  const fail = (why: string) => {
    throw new InvalidSettingValueError(def.module, def.key, why);
  };

  switch (def.type) {
    case 'boolean':
      if (typeof value !== 'boolean') fail('expected boolean');
      break;
    case 'string':
      if (typeof value !== 'string') fail('expected string');
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) fail('expected number');
      break;
    case 'json':
      if (value === undefined) fail('expected a JSON value');
      break;
  }

  if (def.validate && !def.validate(value)) {
    fail('failed custom validation');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- setting-validator.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-settings/domain
git commit -m "feat(settings): add setting definition contract, errors and value validator"
```

---

### Task 8: `SettingsRegistry` e registries por módulo

**Files:**
- Create: `src/modules/reserve-settings/infrastructure/registry/platform.settings.ts`
- Create: `src/modules/reserve-settings/infrastructure/registry/notifications.settings.ts`
- Create: `src/modules/reserve-settings/infrastructure/registry/email.settings.ts`
- Create: `src/modules/reserve-settings/infrastructure/registry/settings-registry.ts`
- Test: `src/modules/reserve-settings/infrastructure/registry/settings-registry.spec.ts`

**Interfaces:**
- Consumes: `SettingDefinition` e `UnknownSettingError` (Task 7); `GATEABLE_MODULES`/`moduleFlagKey` (Task 6); `ALL_EVENT_KEYS` de `src/modules/reserve-notifications/domain/constants/notification-events.ts`.
- Produces: `PLATFORM_SETTING_DEFINITIONS`, `NOTIFICATION_SETTING_DEFINITIONS`, `EMAIL_SETTING_DEFINITIONS`, `SettingsRegistry` com `get(module, key)`, `listByModule(module)`, `listModules()`.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-settings/infrastructure/registry/settings-registry.spec.ts`:

```ts
import { GATEABLE_MODULES, moduleFlagKey } from '../../../../shared/auth/constants/gateable-modules';
import { ALL_EVENT_KEYS } from '../../../reserve-notifications/domain/constants/notification-events';
import { UnknownSettingError } from '../../domain/exceptions/settings.errors';
import { SettingsRegistry } from './settings-registry';

describe('SettingsRegistry', () => {
  const registry = new SettingsRegistry();

  it('exposes the platform, notifications and email modules', () => {
    expect(registry.listModules().sort()).toEqual(['email', 'notifications', 'platform']);
  });

  it('registers one superadmin-scoped boolean flag per gateable module', () => {
    const platform = registry.listByModule('platform');
    expect(platform).toHaveLength(GATEABLE_MODULES.length);

    for (const module of GATEABLE_MODULES) {
      const def = registry.get('platform', moduleFlagKey(module));
      expect(def.type).toBe('boolean');
      expect(def.default).toBe(true);
      expect(def.scope).toBe('superadmin');
    }
  });

  it('throws UnknownSettingError for an unregistered key', () => {
    expect(() => registry.get('platform', 'module.courses.enabled')).toThrow(UnknownSettingError);
    expect(() => registry.get('nope', 'whatever')).toThrow(/Unknown setting: nope.whatever/);
  });

  it('registers the notification channel switches as tenant-writable', () => {
    expect(registry.get('notifications', 'email_enabled').scope).toBe('tenant');
    expect(registry.get('notifications', 'inapp_enabled').scope).toBe('tenant');
    expect(registry.get('notifications', 'contact_email').default).toBe('');
  });

  it('validates event_settings against the real Reserve event catalog', () => {
    const def = registry.get('notifications', 'event_settings');
    expect(def.validate!({ [ALL_EVENT_KEYS[0]]: true })).toBe(true);
    expect(def.validate!({ 'not.an.event': true })).toBe(false);
    expect(def.validate!({ [ALL_EVENT_KEYS[0]]: 'yes' })).toBe(false);
    expect(def.validate!([])).toBe(false);
    expect(def.validate!(null)).toBe(false);
  });

  it('validates contact_email_events as a list of known event keys', () => {
    const def = registry.get('notifications', 'contact_email_events');
    expect(def.validate!([ALL_EVENT_KEYS[0]])).toBe(true);
    expect(def.validate!([])).toBe(true);
    expect(def.validate!(['nope'])).toBe(false);
    expect(def.validate!('lead.created')).toBe(false);
  });

  it('registers the email module switches', () => {
    expect(registry.get('email', 'smtp_server_id').type).toBe('string');
    expect(registry.get('email', 'sending_enabled').default).toBe(true);
  });

  it('stores every key in snake_case so storage and contract never diverge', () => {
    for (const module of registry.listModules()) {
      for (const def of registry.listByModule(module)) {
        expect(def.key).not.toMatch(/[A-Z]/);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- settings-registry.spec`
Expected: FAIL com "Cannot find module './settings-registry'".

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-settings/infrastructure/registry/platform.settings.ts`:

```ts
import {
  GATEABLE_MODULES,
  moduleFlagKey,
} from '../../../../shared/auth/constants/gateable-modules';
import { SettingDefinition } from '../../domain/entities/setting-definition';

/**
 * Module flags are ordinary settings under the `platform` module, scoped to
 * superadmin so a tenant admin can never re-enable a module for itself.
 * Default true: absence of a row means enabled.
 */
export const PLATFORM_SETTING_DEFINITIONS: SettingDefinition[] = GATEABLE_MODULES.map(
  (module) => ({
    module: 'platform',
    key: moduleFlagKey(module),
    type: 'boolean',
    default: true,
    scope: 'superadmin',
    description: `Enables the ${module} module for this tenant`,
  }),
);
```

`src/modules/reserve-settings/infrastructure/registry/notifications.settings.ts`:

```ts
import { ALL_EVENT_KEYS } from '../../../reserve-notifications/domain/constants/notification-events';
import { SettingDefinition } from '../../domain/entities/setting-definition';

const isBooleanRecordWithKeys =
  (allowed: readonly string[]) =>
  (value: unknown): boolean =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value as Record<string, unknown>).every(
      ([key, entry]) => allowed.includes(key) && typeof entry === 'boolean',
    );

export const NOTIFICATION_SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    module: 'notifications',
    key: 'email_enabled',
    type: 'boolean',
    default: true,
    scope: 'tenant',
    description: 'Send notification emails to tenant admins',
  },
  {
    module: 'notifications',
    key: 'inapp_enabled',
    type: 'boolean',
    default: true,
    scope: 'tenant',
    description: 'Show in-app notifications in the dashboard',
  },
  {
    module: 'notifications',
    key: 'event_settings',
    type: 'json',
    default: {},
    scope: 'tenant',
    description: 'Per-event enable/disable toggles',
    validate: isBooleanRecordWithKeys(ALL_EVENT_KEYS),
  },
  {
    module: 'notifications',
    key: 'contact_email',
    type: 'string',
    default: '',
    scope: 'tenant',
    description: 'Extra contact email for notification copies',
  },
  {
    module: 'notifications',
    key: 'contact_email_events',
    type: 'json',
    default: [],
    scope: 'tenant',
    description: 'Event keys forwarded to the contact email',
    validate: (value) =>
      Array.isArray(value) &&
      value.every(
        (key) => typeof key === 'string' && (ALL_EVENT_KEYS as readonly string[]).includes(key),
      ),
  },
];
```

`src/modules/reserve-settings/infrastructure/registry/email.settings.ts`:

```ts
import { SettingDefinition } from '../../domain/entities/setting-definition';

export const EMAIL_SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    module: 'email',
    key: 'smtp_server_id',
    type: 'string',
    default: '',
    scope: 'tenant',
    description: 'SMTP server id used for tenant email sends',
  },
  {
    module: 'email',
    key: 'sending_enabled',
    type: 'boolean',
    default: true,
    scope: 'tenant',
    description:
      'Master switch for outbound email (campaigns and event notifications). When off, sends are deferred, not dropped.',
  },
];
```

`src/modules/reserve-settings/infrastructure/registry/settings-registry.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { SettingDefinition } from '../../domain/entities/setting-definition';
import { UnknownSettingError } from '../../domain/exceptions/settings.errors';
import { EMAIL_SETTING_DEFINITIONS } from './email.settings';
import { NOTIFICATION_SETTING_DEFINITIONS } from './notifications.settings';
import { PLATFORM_SETTING_DEFINITIONS } from './platform.settings';

const ALL_DEFINITIONS: SettingDefinition[] = [
  ...PLATFORM_SETTING_DEFINITIONS,
  ...NOTIFICATION_SETTING_DEFINITIONS,
  ...EMAIL_SETTING_DEFINITIONS,
];

/**
 * Single source of truth for what a setting is. A new module registers its own
 * `<module>.settings.ts` file and spreads it into ALL_DEFINITIONS above.
 */
@Injectable()
export class SettingsRegistry {
  private readonly byId = new Map<string, SettingDefinition>();

  constructor() {
    for (const def of ALL_DEFINITIONS) {
      this.byId.set(`${def.module}:${def.key}`, def);
    }
  }

  get(module: string, key: string): SettingDefinition {
    const def = this.byId.get(`${module}:${key}`);
    if (!def) throw new UnknownSettingError(module, key);
    return def;
  }

  listByModule(module: string): SettingDefinition[] {
    return [...this.byId.values()].filter((def) => def.module === module);
  }

  listModules(): string[] {
    return [...new Set([...this.byId.values()].map((def) => def.module))];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- settings-registry.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-settings/infrastructure/registry
git commit -m "feat(settings): add SettingsRegistry with platform, notifications and email definitions"
```

---

### Task 9: `SettingsService`

**Files:**
- Create: `src/modules/reserve-settings/application/services/settings.service.ts`
- Test: `src/modules/reserve-settings/application/services/settings.service.spec.ts`

**Interfaces:**
- Consumes: `TENANT_SETTING_REPOSITORY`/`ITenantSettingRepository` (Task 5), `SettingsRegistry` (Task 8), `validateSettingValue` + `ForbiddenSettingError`/`UnknownSettingError` (Task 7).
- Produces: `SettingsService` com `get<T>(tenantId, module, key)`, `getModule(tenantId, module)`, `set(tenantId, module, key, value, updatedBy?)`, `setAsSuperadmin(...)`, `describeAll(tenantId)`.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-settings/application/services/settings.service.spec.ts`:

```ts
import { ForbiddenSettingError, UnknownSettingError } from '../../domain/exceptions/settings.errors';
import { InvalidSettingValueError } from '../../domain/exceptions/settings.errors';
import { SettingsRegistry } from '../../infrastructure/registry/settings-registry';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let repository: {
    findByTenantAndModule: jest.Mock;
    findOne: jest.Mock;
    upsert: jest.Mock;
  };
  let service: SettingsService;

  beforeEach(() => {
    repository = {
      findByTenantAndModule: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    service = new SettingsService(repository as any, new SettingsRegistry());
  });

  it('returns the registry default when no row is stored', async () => {
    await expect(service.get<boolean>('t-1', 'notifications', 'emailEnabled')).resolves.toBe(true);
    expect(repository.findOne).toHaveBeenCalledWith('t-1', 'notifications', 'email_enabled');
  });

  it('returns the stored value when a row exists', async () => {
    repository.findOne.mockResolvedValue({ value: false });
    await expect(service.get<boolean>('t-1', 'notifications', 'emailEnabled')).resolves.toBe(false);
  });

  it('rejects an unknown key on read', async () => {
    await expect(service.get('t-1', 'notifications', 'nope')).rejects.toThrow(UnknownSettingError);
  });

  it('merges defaults with stored rows and exposes camelCase keys', async () => {
    repository.findByTenantAndModule.mockResolvedValue([{ key: 'inapp_enabled', value: false }]);

    await expect(service.getModule('t-1', 'notifications')).resolves.toEqual({
      emailEnabled: true,
      inappEnabled: false,
      eventSettings: {},
      contactEmail: '',
      contactEmailEvents: [],
    });
  });

  it('rejects an unknown module', async () => {
    await expect(service.getModule('t-1', 'nope')).rejects.toThrow(UnknownSettingError);
  });

  it('writes a tenant-scoped setting using the snake_case storage key', async () => {
    await service.set('t-1', 'notifications', 'emailEnabled', false, 'admin-9');

    expect(repository.upsert).toHaveBeenCalledWith(
      't-1',
      'notifications',
      'email_enabled',
      false,
      'admin-9',
    );
  });

  it('refuses to write a superadmin-scoped setting at tenant scope', async () => {
    await expect(
      service.set('t-1', 'platform', 'module.cms.enabled', false, 'admin-9'),
    ).rejects.toThrow(ForbiddenSettingError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('allows the superadmin path to write a superadmin-scoped setting', async () => {
    await service.setAsSuperadmin('t-1', 'platform', 'module.cms.enabled', false, 'admin-9');

    expect(repository.upsert).toHaveBeenCalledWith(
      't-1',
      'platform',
      'module.cms.enabled',
      false,
      'admin-9',
    );
  });

  it('validates the value against the definition before writing', async () => {
    await expect(
      service.set('t-1', 'notifications', 'emailEnabled', 'yes', 'admin-9'),
    ).rejects.toThrow(InvalidSettingValueError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('describes every module with value, default, type, scope and description', async () => {
    const described = await service.describeAll('t-1');

    expect(Object.keys(described).sort()).toEqual(['email', 'notifications', 'platform']);
    expect(described.notifications.emailEnabled).toEqual({
      value: true,
      default: true,
      type: 'boolean',
      scope: 'tenant',
      description: 'Send notification emails to tenant admins',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- settings.service.spec`
Expected: FAIL com "Cannot find module './settings.service'".

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-settings/application/services/settings.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { validateSettingValue } from '../../domain/services/setting-validator';
import {
  ForbiddenSettingError,
  UnknownSettingError,
} from '../../domain/exceptions/settings.errors';
import {
  ITenantSettingRepository,
  TENANT_SETTING_REPOSITORY,
} from '../../domain/interfaces/tenant-setting.repository.interface';
import { SettingsRegistry } from '../../infrastructure/registry/settings-registry';

/** Wire contract is camelCase; storage (and the registry) is snake_case. */
const toStorageKey = (key: string) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
const toContractKey = (key: string) =>
  key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

export interface SettingDescriptor {
  value: unknown;
  default: unknown;
  type: string;
  scope: string;
  description: string;
}

@Injectable()
export class SettingsService {
  constructor(
    @Inject(TENANT_SETTING_REPOSITORY)
    private readonly repository: ITenantSettingRepository,
    private readonly registry: SettingsRegistry,
  ) {}

  async get<T>(tenantId: string, module: string, key: string): Promise<T> {
    const storageKey = toStorageKey(key);
    const def = this.registry.get(module, storageKey); // throws UnknownSettingError
    const row = await this.repository.findOne(tenantId, module, storageKey);
    return (row ? row.value : def.default) as T;
  }

  async getModule(tenantId: string, module: string): Promise<Record<string, unknown>> {
    const defs = this.registry.listByModule(module);
    if (defs.length === 0) throw new UnknownSettingError(module, '*');

    const rows = await this.repository.findByTenantAndModule(tenantId, module);
    const stored = new Map(rows.map((row) => [row.key, row.value]));

    return Object.fromEntries(
      defs.map((def) => [
        toContractKey(def.key),
        stored.has(def.key) ? stored.get(def.key) : def.default,
      ]),
    );
  }

  async set(
    tenantId: string,
    module: string,
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<void> {
    const storageKey = toStorageKey(key);
    const def = this.registry.get(module, storageKey);
    if (def.scope === 'superadmin') throw new ForbiddenSettingError(module, key);
    validateSettingValue(def, value);
    await this.repository.upsert(tenantId, module, storageKey, value, updatedBy);
  }

  async setAsSuperadmin(
    tenantId: string,
    module: string,
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<void> {
    const storageKey = toStorageKey(key);
    const def = this.registry.get(module, storageKey);
    validateSettingValue(def, value);
    await this.repository.upsert(tenantId, module, storageKey, value, updatedBy);
  }

  async describeAll(tenantId: string): Promise<Record<string, Record<string, SettingDescriptor>>> {
    const result: Record<string, Record<string, SettingDescriptor>> = {};

    for (const module of this.registry.listModules()) {
      const merged = await this.getModule(tenantId, module);
      result[module] = Object.fromEntries(
        this.registry.listByModule(module).map((def) => {
          const contractKey = toContractKey(def.key);
          return [
            contractKey,
            {
              value: merged[contractKey],
              default: def.default,
              type: def.type,
              scope: def.scope,
              description: def.description,
            },
          ];
        }),
      );
    }

    return result;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- settings.service.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-settings/application/services/settings.service.ts src/modules/reserve-settings/application/services/settings.service.spec.ts
git commit -m "feat(settings): add SettingsService with registry-backed defaults and scope enforcement"
```

### Task 10: Modelo `TenantTypeModulePolicy`

**Files:**
- Create: `prisma/migrations/20260726000004_add_tenant_type_module_policy/migration.sql`
- Modify: `prisma/schema.prisma` (novo model, ao lado de `TenantSetting`)
- Modify: `src/shared/database/migrations.spec.ts` (acrescentar o `describe` da nova migração)

**Interfaces:**
- Consumes: enum `ETenantType` (Task 1).
- Produces: model `TenantTypeModulePolicy { id, tenant_type, module_key, enabled, version, created_at, updated_at }`, `@@unique([tenant_type, module_key])` (chave composta `tenant_type_module_key`), `@@index([tenant_type, enabled])`.

- [ ] **Step 1: Write the failing test**

Acrescentar em `src/shared/database/migrations.spec.ts`:

```ts
describe('20260726000004_add_tenant_type_module_policy', () => {
  const sql = readMigration('20260726000004_add_tenant_type_module_policy');

  it('creates TenantTypeModulePolicy in snake_case with the ETenantType enum column', () => {
    expect(sql).toContain('CREATE TABLE "TenantTypeModulePolicy"');
    expect(sql).toContain('"tenant_type" "ETenantType" NOT NULL');
    expect(sql).toContain('"module_key" VARCHAR(100) NOT NULL');
    expect(sql).toContain('"version" INTEGER NOT NULL DEFAULT 1');
    expect(sql).not.toMatch(/"tenantType"|"moduleKey"/);
  });

  it('enforces one policy row per tenant type and module', () => {
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "TenantTypeModulePolicy_tenant_type_module_key_key" ON "TenantTypeModulePolicy"("tenant_type", "module_key")',
    );
  });

  it('indexes tenant_type and enabled for the policy resolver read path', () => {
    expect(sql).toContain(
      'CREATE INDEX "TenantTypeModulePolicy_tenant_type_enabled_idx" ON "TenantTypeModulePolicy"("tenant_type", "enabled")',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- migrations.spec`
Expected: FAIL com "ENOENT ... 20260726000004_add_tenant_type_module_policy\\migration.sql".

- [ ] **Step 3: Write minimal implementation**

`prisma/schema.prisma` — novo model:

```prisma
model TenantTypeModulePolicy {
  id          String      @id @default(cuid()) @db.VarChar(25)
  tenant_type ETenantType
  module_key  String      @db.VarChar(100)
  enabled     Boolean
  version     Int         @default(1)
  created_at  DateTime    @default(now())
  updated_at  DateTime    @updatedAt

  @@unique([tenant_type, module_key])
  @@index([tenant_type, enabled])
}
```

`prisma/migrations/20260726000004_add_tenant_type_module_policy/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "TenantTypeModulePolicy" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_type" "ETenantType" NOT NULL,
    "module_key" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantTypeModulePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantTypeModulePolicy_tenant_type_module_key_key" ON "TenantTypeModulePolicy"("tenant_type", "module_key");

-- CreateIndex
CREATE INDEX "TenantTypeModulePolicy_tenant_type_enabled_idx" ON "TenantTypeModulePolicy"("tenant_type", "enabled");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx prisma migrate dev && npm test -- migrations.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260726000004_add_tenant_type_module_policy src/shared/database/migrations.spec.ts
git commit -m "feat(tenant): add TenantTypeModulePolicy model"
```

---

### Task 11: Resolver puro `resolveTenantModulePolicy`

**Files:**
- Create: `src/modules/reserve-auth/domain/services/tenant-type-policy.resolver.ts`
- Test: `src/modules/reserve-auth/domain/services/tenant-type-policy.resolver.spec.ts`

**Interfaces:**
- Consumes: `TenantType` (Task 1).
- Produces: `type TenantModulePolicySource = 'master'|'tenantOverride'|'tenantTypePolicy'`, `interface TenantModulePolicyResolution { enabled: boolean; source: TenantModulePolicySource }`, `resolveTenantModulePolicy(input: { tenantType: TenantType; tenantOverride?: boolean; typePolicy?: boolean }): TenantModulePolicyResolution`.

Nota: o Reserve não tem `LEGACY_MODULES` (ao contrário da Zarp), então este resolver tem só 3 fontes, não 4 — não recebe `module` como parâmetro porque não precisa checar uma lista de legado.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-auth/domain/services/tenant-type-policy.resolver.spec.ts`:

```ts
import { resolveTenantModulePolicy } from './tenant-type-policy.resolver';

describe('resolveTenantModulePolicy', () => {
  it('is always enabled for MASTER regardless of any override or type policy', () => {
    expect(
      resolveTenantModulePolicy({ tenantType: 'MASTER', tenantOverride: false, typePolicy: false }),
    ).toEqual({ enabled: true, source: 'master' });
  });

  it('honors an explicit tenant override over the type policy', () => {
    expect(
      resolveTenantModulePolicy({ tenantType: 'COMMON', tenantOverride: false, typePolicy: true }),
    ).toEqual({ enabled: false, source: 'tenantOverride' });

    expect(
      resolveTenantModulePolicy({ tenantType: 'COMMON', tenantOverride: true, typePolicy: false }),
    ).toEqual({ enabled: true, source: 'tenantOverride' });
  });

  it('falls back to the type policy when no override is stored', () => {
    expect(resolveTenantModulePolicy({ tenantType: 'EDUCATIONAL', typePolicy: false })).toEqual({
      enabled: false,
      source: 'tenantTypePolicy',
    });
  });

  it('defaults to enabled when neither an override nor a type policy exists', () => {
    expect(resolveTenantModulePolicy({ tenantType: 'COMMON' })).toEqual({
      enabled: true,
      source: 'tenantTypePolicy',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tenant-type-policy.resolver.spec`
Expected: FAIL com "Cannot find module './tenant-type-policy.resolver'".

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-auth/domain/services/tenant-type-policy.resolver.ts`:

```ts
import { TenantType } from '../../../../shared/auth/constants/tenant-type';

export type TenantModulePolicySource = 'master' | 'tenantOverride' | 'tenantTypePolicy';

export interface TenantModulePolicyResolution {
  enabled: boolean;
  source: TenantModulePolicySource;
}

/**
 * Pure resolution rule, no I/O. Order of precedence:
 * 1. MASTER tenant type: always enabled, ignores every override.
 * 2. Explicit tenant override (TenantSetting platform.module.<name>.enabled).
 * 3. TenantTypeModulePolicy row for this tenant type; absent row defaults true.
 *
 * The Reserve catalog has no legacy-module carve-out (unlike Zarp's
 * LEGACY_MODULES) — GATEABLE_MODULES only lists modules that are actually
 * gateable today, so there is nothing to force-disable ahead of MASTER.
 */
export function resolveTenantModulePolicy(input: {
  tenantType: TenantType;
  tenantOverride?: boolean;
  typePolicy?: boolean;
}): TenantModulePolicyResolution {
  if (input.tenantType === 'MASTER') {
    return { enabled: true, source: 'master' };
  }

  if (input.tenantOverride !== undefined) {
    return { enabled: input.tenantOverride, source: 'tenantOverride' };
  }

  return { enabled: input.typePolicy ?? true, source: 'tenantTypePolicy' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tenant-type-policy.resolver.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-auth/domain/services/tenant-type-policy.resolver.ts src/modules/reserve-auth/domain/services/tenant-type-policy.resolver.spec.ts
git commit -m "feat(auth): add pure tenant module policy resolver"
```

### Task 12: `module-access.util.ts`

**Files:**
- Create: `src/shared/auth/module-access.util.ts`
- Test: `src/shared/auth/module-access.util.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`; `GateableModule`/`moduleFlagKey` (Task 6); `TenantType` (Task 1); `resolveTenantModulePolicy`/`TenantModulePolicyResolution` (Task 11).
- Produces: `invalidateModuleAccessCache(tenantId?: string): void`, `isModuleEnabled(prisma, tenantId, module): Promise<boolean>`, `resolveModuleEnabled(prisma, tenantId, module): Promise<TenantModulePolicyResolution>`.

- [ ] **Step 1: Write the failing test**

`src/shared/auth/module-access.util.spec.ts`:

```ts
import { PrismaService } from '../database/prisma.service';
import {
  invalidateModuleAccessCache,
  isModuleEnabled,
  resolveModuleEnabled,
} from './module-access.util';

describe('module-access.util', () => {
  let prisma: any;

  beforeEach(() => {
    invalidateModuleAccessCache();
    prisma = {
      tenant: { findUnique: jest.fn() },
      tenantSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      tenantTypeModulePolicy: { findUnique: jest.fn().mockResolvedValue(null) },
    };
  });

  it('resolves MASTER tenants as always enabled, ignoring overrides', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'MASTER' });
    prisma.tenantSetting.findUnique.mockResolvedValue({ value: false });

    await expect(resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms')).resolves.toEqual({
      enabled: true,
      source: 'master',
    });
    expect(prisma.tenantSetting.findUnique).not.toHaveBeenCalled();
  });

  it('honors an explicit tenant override over the type policy', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'COMMON' });
    prisma.tenantSetting.findUnique.mockResolvedValue({ value: false });
    prisma.tenantTypeModulePolicy.findUnique.mockResolvedValue({ enabled: true });

    await expect(resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms')).resolves.toEqual({
      enabled: false,
      source: 'tenantOverride',
    });
  });

  it('falls back to the tenant-type policy when no override is stored', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'EDUCATIONAL' });
    prisma.tenantTypeModulePolicy.findUnique.mockResolvedValue({ enabled: false });

    await expect(resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms')).resolves.toEqual({
      enabled: false,
      source: 'tenantTypePolicy',
    });
  });

  it('defaults to enabled when neither an override nor a type policy exists', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'COMMON' });

    await expect(resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms')).resolves.toEqual({
      enabled: true,
      source: 'tenantTypePolicy',
    });
  });

  it('reads the platform setting keyed by moduleFlagKey', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'COMMON' });

    await resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms');

    expect(prisma.tenantSetting.findUnique).toHaveBeenCalledWith({
      where: {
        tenant_id_module_key: { tenant_id: 't-1', module: 'platform', key: 'module.cms.enabled' },
      },
      select: { value: true },
    });
  });

  it('reads the type policy keyed by the composite tenant_type_module_key', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'EDUCATIONAL' });

    await resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms');

    expect(prisma.tenantTypeModulePolicy.findUnique).toHaveBeenCalledWith({
      where: { tenant_type_module_key: { tenant_type: 'EDUCATIONAL', module_key: 'cms' } },
      select: { enabled: true },
    });
  });

  it('caches the resolution for the TTL and does not re-query', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'COMMON' });

    await resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms');
    await resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms');

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });

  it('invalidateModuleAccessCache(tenantId) only clears that tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'COMMON' });

    await resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms');
    await resolveModuleEnabled(prisma as PrismaService, 't-2', 'cms');
    invalidateModuleAccessCache('t-1');
    await resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms');
    await resolveModuleEnabled(prisma as PrismaService, 't-2', 'cms');

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(3);
  });

  it('invalidateModuleAccessCache() with no argument clears everything', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'COMMON' });

    await resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms');
    invalidateModuleAccessCache();
    await resolveModuleEnabled(prisma as PrismaService, 't-1', 'cms');

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(2);
  });

  it('isModuleEnabled unwraps the boolean from the resolution', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ tenant_type: 'MASTER' });

    await expect(isModuleEnabled(prisma as PrismaService, 't-1', 'cms')).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- module-access.util.spec`
Expected: FAIL com "Cannot find module './module-access.util'".

- [ ] **Step 3: Write minimal implementation**

`src/shared/auth/module-access.util.ts`:

```ts
import { PrismaService } from '../database/prisma.service';
import { GateableModule, moduleFlagKey } from './constants/gateable-modules';
import { TenantType } from './constants/tenant-type';
import {
  resolveTenantModulePolicy,
  TenantModulePolicyResolution,
} from '../../modules/reserve-auth/domain/services/tenant-type-policy.resolver';

const MODULE_FLAG_CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { resolution: TenantModulePolicyResolution; expiresAt: number }>();

/**
 * Call after any write to a module flag (ModuleFlagsService.setFlags). Without
 * a tenantId it clears everything. TTL covers a missed invalidation.
 */
export function invalidateModuleAccessCache(tenantId?: string): void {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${tenantId}:`)) cache.delete(key);
  }
}

/** Plain helper (no DI) so guards and background jobs share one read path. */
export async function isModuleEnabled(
  prisma: PrismaService,
  tenantId: string,
  module: GateableModule,
): Promise<boolean> {
  return (await resolveModuleEnabled(prisma, tenantId, module)).enabled;
}

export async function resolveModuleEnabled(
  prisma: PrismaService,
  tenantId: string,
  module: GateableModule,
): Promise<TenantModulePolicyResolution> {
  const key = `${tenantId}:${module}`;
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.resolution;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { tenant_type: true },
  });
  const tenantType = (tenant?.tenant_type ?? 'COMMON') as TenantType;

  if (tenantType === 'MASTER') {
    const resolution = resolveTenantModulePolicy({ tenantType: 'MASTER' });
    cache.set(key, { resolution, expiresAt: Date.now() + MODULE_FLAG_CACHE_TTL_MS });
    return resolution;
  }

  const [override, typePolicy] = await Promise.all([
    prisma.tenantSetting.findUnique({
      where: {
        tenant_id_module_key: { tenant_id: tenantId, module: 'platform', key: moduleFlagKey(module) },
      },
      select: { value: true },
    }),
    prisma.tenantTypeModulePolicy.findUnique({
      where: { tenant_type_module_key: { tenant_type: tenantType, module_key: module } },
      select: { enabled: true },
    }),
  ]);

  const resolution = resolveTenantModulePolicy({
    tenantType,
    tenantOverride: typeof override?.value === 'boolean' ? override.value : undefined,
    typePolicy: typePolicy?.enabled,
  });
  cache.set(key, { resolution, expiresAt: Date.now() + MODULE_FLAG_CACHE_TTL_MS });
  return resolution;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- module-access.util.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/module-access.util.ts src/shared/auth/module-access.util.spec.ts
git commit -m "feat(auth): add resolveModuleEnabled/isModuleEnabled with TTL cache"
```

---

### Task 13: `ModuleDisabledError` e `DomainExceptionFilter`

**Files:**
- Create: `src/shared/exceptions/module-disabled.error.ts`
- Modify: `src/shared/exceptions/domain-exception.filter.ts`
- Modify: `src/shared/exceptions/index.ts`
- Test: `src/shared/exceptions/domain-exception.filter.spec.ts`

**Interfaces:**
- Consumes: nada de novas tasks; usa a estrutura existente de `DomainExceptionFilter` (`src/shared/exceptions/domain-exception.filter.ts:1-44`).
- Produces: `ModuleDisabledError` (code `MODULE_DISABLED`, mapeado para HTTP 403).

- [ ] **Step 1: Write the failing test**

`src/shared/exceptions/domain-exception.filter.spec.ts`:

```ts
import { HttpStatus } from '@nestjs/common';
import { DomainExceptionFilter } from './domain-exception.filter';
import { ModuleDisabledError } from './module-disabled.error';
import { RepositoryException } from './repository.exception';

function makeHost(response: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as any;
}

describe('DomainExceptionFilter', () => {
  let response: { status: jest.Mock; json: jest.Mock };
  let filter: DomainExceptionFilter;

  beforeEach(() => {
    response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    filter = new DomainExceptionFilter();
  });

  it('maps ModuleDisabledError to 403 with the module name in the message', () => {
    filter.catch(new ModuleDisabledError('cms'), makeHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.FORBIDDEN,
      message: "Module 'cms' is disabled for this tenant",
    });
  });

  it('still masks RepositoryException details behind a generic message', () => {
    filter.catch(new RepositoryException('boom', 'DB_ERR', new Error('detail')), makeHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'A database error occurred',
    });
  });

  it('falls back to 500 for an uncatalogued error', () => {
    filter.catch(new Error('unexpected'), makeHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'unexpected',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- domain-exception.filter.spec`
Expected: FAIL com "Cannot find module './module-disabled.error'".

- [ ] **Step 3: Write minimal implementation**

`src/shared/exceptions/module-disabled.error.ts`:

```ts
export class ModuleDisabledError extends Error {
  public readonly code = 'MODULE_DISABLED';

  constructor(public readonly module: string) {
    super(`Module '${module}' is disabled for this tenant`);
    this.name = 'ModuleDisabledError';
  }
}
```

`src/shared/exceptions/domain-exception.filter.ts` — arquivo completo, substituindo o atual:

```ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ArticleNotFoundError } from '../../modules/reserve-cms/domain/errors/article-not-found.error';
import { ImageLimitExceededError } from '../../modules/reserve-cms/domain/errors/image-limit-exceeded.error';
import { RepositoryException } from './repository.exception';
import { ModuleDisabledError } from './module-disabled.error';

/**
 * Maps domain errors and repository exceptions to proper HTTP responses.
 * Without this filter, NestJS converts all non-HttpException errors to 500
 * with no useful message for the client.
 */
@Catch(ArticleNotFoundError, ImageLimitExceededError, RepositoryException, ModuleDisabledError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = exception.message;

    if (exception instanceof ArticleNotFoundError) {
      status = HttpStatus.NOT_FOUND;
    } else if (exception instanceof ImageLimitExceededError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    } else if (exception instanceof ModuleDisabledError) {
      status = HttpStatus.FORBIDDEN;
    } else if (exception instanceof RepositoryException) {
      this.logger.error(`Repository error [${exception.code}]: ${exception.message}`, exception.details);
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'A database error occurred';
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
```

`src/shared/exceptions/index.ts` — acrescentar a linha:

```ts
export * from './module-disabled.error';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- domain-exception.filter.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/exceptions/module-disabled.error.ts src/shared/exceptions/domain-exception.filter.ts src/shared/exceptions/domain-exception.filter.spec.ts src/shared/exceptions/index.ts
git commit -m "feat(exceptions): map ModuleDisabledError to HTTP 403"
```

### Task 14: `@RequiresModule` e `ModuleAccessGuard`

**Files:**
- Create: `src/shared/auth/decorators/requires-module.decorator.ts`
- Create: `src/shared/auth/guards/module-access.guard.ts`
- Test: `src/shared/auth/guards/module-access.guard.spec.ts`

**Interfaces:**
- Consumes: `GateableModule`/`isGateableModule` (Task 6); `isModuleEnabled` (Task 12); `ModuleDisabledError` (Task 13).
- Produces: `REQUIRES_MODULE_KEY`, `RequiresModule(module: GateableModule)`, `ModuleAccessGuard`.

- [ ] **Step 1: Write the failing test**

`src/shared/auth/guards/module-access.guard.spec.ts`:

```ts
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleAccessGuard } from './module-access.guard';
import { RequiresModule } from '../decorators/requires-module.decorator';
import { ModuleDisabledError } from '../../exceptions/module-disabled.error';
import { invalidateModuleAccessCache } from '../module-access.util';

const contextFor = (request: any, metadata: string | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  }) as any;

describe('ModuleAccessGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let prisma: any;
  let guard: ModuleAccessGuard;

  beforeEach(() => invalidateModuleAccessCache());

  const setup = (
    metadata: string | undefined,
    tenantRow: unknown = { tenant_type: 'COMMON' },
    settingRow: unknown = null,
  ) => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(metadata) } as any;
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue(tenantRow) },
      tenantSetting: { findUnique: jest.fn().mockResolvedValue(settingRow) },
      tenantTypeModulePolicy: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    guard = new ModuleAccessGuard(reflector, prisma);
  };

  it('passes when no @RequiresModule metadata is present', async () => {
    setup(undefined);
    await expect(guard.canActivate(contextFor({ tenant_id: 't-1' }, undefined))).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('super_admin bypasses without touching the flag', async () => {
    setup('cms');
    await expect(
      guard.canActivate(contextFor({ tenant_id: 't-1', admin_role: 'super_admin' }, 'cms')),
    ).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('throws misconfiguration when tenant_id is missing from the request', async () => {
    setup('cms');
    await expect(guard.canActivate(contextFor({}, 'cms'))).rejects.toThrow(/must run after/i);
  });

  it('passes when the flag row is absent (default enabled)', async () => {
    setup('cms', { tenant_type: 'COMMON' }, null);
    await expect(
      guard.canActivate(contextFor({ tenant_id: 't-1', admin_role: 'manager' }, 'cms')),
    ).resolves.toBe(true);
  });

  it('throws ModuleDisabledError on an explicit false', async () => {
    setup('cms', { tenant_type: 'COMMON' }, { value: false });
    await expect(
      guard.canActivate(contextFor({ tenant_id: 't-1', admin_role: 'manager' }, 'cms')),
    ).rejects.toThrow(ModuleDisabledError);
  });
});

describe('RequiresModule decorator', () => {
  it('rejects names outside the catalog at class-load time', () => {
    expect(() => RequiresModule('not-a-module' as any)).toThrow(/not a gateable module/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- module-access.guard.spec`
Expected: FAIL com "Cannot find module '../decorators/requires-module.decorator'".

- [ ] **Step 3: Write minimal implementation**

`src/shared/auth/decorators/requires-module.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';
import { GateableModule, isGateableModule } from '../constants/gateable-modules';

export const REQUIRES_MODULE_KEY = 'requires_module';

export function RequiresModule(module: GateableModule) {
  // Decorators run at class-load: a typo fails the boot, not a request.
  if (!isGateableModule(module)) {
    throw new Error(
      `@RequiresModule('${module}') is not a gateable module — see shared/auth/constants/gateable-modules.ts`,
    );
  }
  return SetMetadata(REQUIRES_MODULE_KEY, module);
}
```

`src/shared/auth/guards/module-access.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { ModuleDisabledError } from '../../exceptions/module-disabled.error';
import { GateableModule } from '../constants/gateable-modules';
import { REQUIRES_MODULE_KEY } from '../decorators/requires-module.decorator';
import { isModuleEnabled } from '../module-access.util';

/**
 * Enforces superadmin module gating. MUST be listed after AdminJwtGuard+TenantGuard
 * (or UserJwtGuard+UserTenantGuard) — it reads request.tenant_id set by those guards.
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const module = this.reflector.getAllAndOverride<GateableModule | undefined>(REQUIRES_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!module) return true;

    const request = context.switchToHttp().getRequest();
    if (request.admin_role === 'super_admin') return true;

    const tenantId: string | undefined = request.tenant_id;
    if (!tenantId) {
      throw new Error(
        'ModuleAccessGuard must run after TenantGuard/UserTenantGuard (request.tenant_id missing)',
      );
    }

    if (!(await isModuleEnabled(this.prisma, tenantId, module))) {
      throw new ModuleDisabledError(module);
    }
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- module-access.guard.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/decorators/requires-module.decorator.ts src/shared/auth/guards/module-access.guard.ts src/shared/auth/guards/module-access.guard.spec.ts
git commit -m "feat(auth): add @RequiresModule decorator and ModuleAccessGuard"
```

---

### Task 15: `ModuleFlagsService`

**Files:**
- Create: `src/modules/reserve-settings/application/services/module-flags.service.ts`
- Test: `src/modules/reserve-settings/application/services/module-flags.service.spec.ts`

**Interfaces:**
- Consumes: `SettingsService` (Task 9); `PrismaService`; `GATEABLE_MODULES`/`GateableModule`/`isGateableModule`/`moduleFlagKey` (Task 6); `invalidateModuleAccessCache`/`resolveModuleEnabled` (Task 12).
- Produces: `ModuleFlagsService` com `getFlags(tenantId): Promise<Record<GateableModule, boolean>>` e `setFlags(tenantId, flags, updatedBy): Promise<Record<GateableModule, boolean>>`.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-settings/application/services/module-flags.service.spec.ts`:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';
import * as moduleAccessUtil from '../../../../shared/auth/module-access.util';
import { ModuleFlagsService } from './module-flags.service';

describe('ModuleFlagsService', () => {
  let settings: { setAsSuperadmin: jest.Mock };
  let prisma: any;
  let service: ModuleFlagsService;

  beforeEach(() => {
    moduleAccessUtil.invalidateModuleAccessCache();
    settings = { setAsSuperadmin: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't-1', tenant_type: 'COMMON' }) },
      tenantSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      tenantTypeModulePolicy: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    service = new ModuleFlagsService(settings as any, prisma);
  });

  it('returns every gateable module defaulted to enabled with no stored rows', async () => {
    const flags = await service.getFlags('t-1');

    expect(Object.keys(flags).sort()).toEqual([...GATEABLE_MODULES].sort());
    expect(Object.values(flags).every((value) => value === true)).toBe(true);
  });

  it('reflects a stored false override in getFlags', async () => {
    prisma.tenantSetting.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where.tenant_id_module_key.key === 'module.cms.enabled' ? { value: false } : null),
    );

    const flags = await service.getFlags('t-1');

    expect(flags.cms).toBe(false);
  });

  it('rejects an unknown module name', async () => {
    await expect(service.setFlags('t-1', { notamodule: true } as any, 'admin-9')).rejects.toThrow(
      BadRequestException,
    );
    expect(settings.setAsSuperadmin).not.toHaveBeenCalled();
  });

  it('rejects a non-boolean flag value', async () => {
    await expect(service.setFlags('t-1', { cms: 'yes' } as any, 'admin-9')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when the tenant does not exist', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(service.setFlags('t-1', { cms: false }, 'admin-9')).rejects.toThrow(NotFoundException);
  });

  it('refuses to override modules for a MASTER tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 't-1', tenant_type: 'MASTER' });
    await expect(service.setFlags('t-1', { cms: false }, 'admin-9')).rejects.toThrow(BadRequestException);
    expect(settings.setAsSuperadmin).not.toHaveBeenCalled();
  });

  it('writes each provided flag through SettingsService.setAsSuperadmin under the platform module', async () => {
    await service.setFlags('t-1', { cms: false, leads: true }, 'admin-9');

    expect(settings.setAsSuperadmin).toHaveBeenCalledWith('t-1', 'platform', 'module.cms.enabled', false, 'admin-9');
    expect(settings.setAsSuperadmin).toHaveBeenCalledWith('t-1', 'platform', 'module.leads.enabled', true, 'admin-9');
  });

  it('invalidates the module access cache after writing', async () => {
    const invalidateSpy = jest.spyOn(moduleAccessUtil, 'invalidateModuleAccessCache');

    await service.setFlags('t-1', { cms: false }, 'admin-9');

    expect(invalidateSpy).toHaveBeenCalledWith('t-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- module-flags.service.spec`
Expected: FAIL com "Cannot find module './module-flags.service'".

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-settings/application/services/module-flags.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  GATEABLE_MODULES,
  GateableModule,
  isGateableModule,
  moduleFlagKey,
} from '../../../../shared/auth/constants/gateable-modules';
import {
  invalidateModuleAccessCache,
  resolveModuleEnabled,
} from '../../../../shared/auth/module-access.util';

@Injectable()
export class ModuleFlagsService {
  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async getFlags(tenantId: string): Promise<Record<GateableModule, boolean>> {
    const entries = await Promise.all(
      GATEABLE_MODULES.map(
        async (module) => [module, (await resolveModuleEnabled(this.prisma, tenantId, module)).enabled] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<GateableModule, boolean>;
  }

  async setFlags(
    tenantId: string,
    flags: Partial<Record<GateableModule, boolean>>,
    updatedBy: string,
  ): Promise<Record<GateableModule, boolean>> {
    for (const [name, enabled] of Object.entries(flags)) {
      if (!isGateableModule(name)) throw new BadRequestException(`Unknown module: ${name}`);
      if (typeof enabled !== 'boolean') throw new BadRequestException(`Flag for ${name} must be boolean`);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, tenant_type: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.tenant_type === 'MASTER') {
      throw new BadRequestException('Master tenant modules are always enabled and cannot be overridden');
    }

    for (const [name, enabled] of Object.entries(flags)) {
      await this.settings.setAsSuperadmin(
        tenantId,
        'platform',
        moduleFlagKey(name as GateableModule),
        enabled,
        updatedBy,
      );
    }
    invalidateModuleAccessCache(tenantId);
    return this.getFlags(tenantId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- module-flags.service.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-settings/application/services/module-flags.service.ts src/modules/reserve-settings/application/services/module-flags.service.spec.ts
git commit -m "feat(settings): add ModuleFlagsService with MASTER-tenant guard rail"
```

### Task 16: Permissões `settings.*` na matriz da Fase 2

Esta task assume que a Fase 2 já produziu `src/shared/auth/rbac/permission-matrix.ts` com a convenção documentada no repositório de referência da Zarp: um array `PERMISSIONS` (`as const`), arrays em cascata por papel (`VIEWER`, `EDITOR`, `MANAGER`, `OWNER`, cada um espalhando o anterior com `...`), `ROLE_GRANTS: Partial<Record<EAdminRole, readonly PermissionName[]>>` e `normalizeAdminRole`. Se a Fase 2 do Reserve usou outra convenção de arquivo, adapte **apenas os pontos de inserção** abaixo — os nomes de permissão e o papel mínimo de cada um são o contrato exigido por esta fase (Global Constraints).

`settings.modules.manage` e `settings.domains.manage` são deliberadamente **super_admin-only**: nenhum papel comum os recebe (o mesmo padrão que a Zarp usa para `settings.modules.manage` — a linha existe para o nome ser declarado e documentado, mas só o bypass de `super_admin` alcança a rota).

**Files:**
- Modify: `src/shared/auth/rbac/permission-matrix.ts`
- Test: `src/shared/auth/rbac/permission-matrix.settings.spec.ts`

**Interfaces:**
- Consumes: `PERMISSIONS`, `VIEWER`, `MANAGER`, `ROLE_GRANTS`, `EAdminRole` (assumidos da Fase 2).
- Produces: permissões `settings.read`, `settings.manage`, `settings.modules.read`, `settings.modules.manage`, `settings.domains.manage` catalogadas e concedidas por papel.

- [ ] **Step 1: Write the failing test**

`src/shared/auth/rbac/permission-matrix.settings.spec.ts`:

```ts
import { PERMISSIONS, ROLE_GRANTS } from './permission-matrix';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';

describe('permission-matrix: settings permissions', () => {
  it('catalogs every settings permission this phase introduces', () => {
    for (const permission of [
      'settings.read',
      'settings.manage',
      'settings.modules.read',
      'settings.modules.manage',
      'settings.domains.manage',
    ]) {
      expect(PERMISSIONS as readonly string[]).toContain(permission);
    }
  });

  it('grants read access to viewer and up', () => {
    expect(ROLE_GRANTS[EAdminRole.viewer]).toEqual(expect.arrayContaining(['settings.read', 'settings.modules.read']));
  });

  it('grants settings.manage to manager and up, but not to viewer/editor', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toEqual(expect.arrayContaining(['settings.manage']));
    expect(ROLE_GRANTS[EAdminRole.viewer]).not.toEqual(expect.arrayContaining(['settings.manage']));
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toEqual(expect.arrayContaining(['settings.manage']));
  });

  it('keeps settings.modules.manage and settings.domains.manage super_admin-only', () => {
    for (const role of [EAdminRole.viewer, EAdminRole.editor, EAdminRole.manager, EAdminRole.owner]) {
      const grants = ROLE_GRANTS[role] ?? [];
      expect(grants).not.toEqual(expect.arrayContaining(['settings.modules.manage']));
      expect(grants).not.toEqual(expect.arrayContaining(['settings.domains.manage']));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- permission-matrix.settings.spec`
Expected: FAIL com "expected [...] to contain 'settings.read'" (a permissão ainda não existe na matriz).

- [ ] **Step 3: Write minimal implementation**

Em `src/shared/auth/rbac/permission-matrix.ts`, acrescentar ao array `PERMISSIONS` (em qualquer ponto do array, mantendo uma seção nomeada para facilitar leitura):

```ts
  // settings (Fase 3, não-gateable)
  'settings.read',
  'settings.manage',
  'settings.modules.read',
  'settings.modules.manage',
  'settings.domains.manage',
```

No array `VIEWER`, acrescentar:

```ts
  'settings.read',
  'settings.modules.read',
```

No array `MANAGER` (que já espalha `EDITOR`, que já espalha `VIEWER`), acrescentar:

```ts
  'settings.manage',
```

`settings.modules.manage` e `settings.domains.manage` **não** entram em nenhum array de papel — permanecem acessíveis só via bypass de `super_admin` no `PermissionsGuard`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- permission-matrix.settings.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/rbac/permission-matrix.ts src/shared/auth/rbac/permission-matrix.settings.spec.ts
git commit -m "feat(rbac): add settings.* permissions for the Fase 3 settings hub"
```

---

### Task 17: `TenantDomainsController` (CRUD de domínios por tenant)

**Files:**
- Create: `src/modules/reserve-settings/application/dtos/tenant-domain.dto.ts`
- Create: `src/modules/reserve-settings/application/services/tenant-domains.service.ts`
- Create: `src/modules/reserve-settings/infrastructure/controllers/tenant-domains.controller.ts`
- Test: `src/modules/reserve-settings/application/services/tenant-domains.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`; `CorsOriginService.invalidate()` (Task 3); permissão `settings.domains.manage` (Task 16).
- Produces: `TenantDomainsService` com `list(tenantId)`, `create(tenantId, dto)`, `update(tenantId, domainId, dto)`, `remove(tenantId, domainId)`; DTOs `CreateTenantDomainDto`, `UpdateTenantDomainDto`, `TenantDomainResponseDto`; `TenantDomainsController` em `tenants/:tenantId/domains`.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-settings/application/services/tenant-domains.service.spec.ts`:

```ts
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TenantDomainsService } from './tenant-domains.service';

describe('TenantDomainsService', () => {
  let prisma: any;
  let cors: { invalidate: jest.Mock };
  let service: TenantDomainsService;

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't-1' }) },
      tenantDomain: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback: any) => callback(prisma)),
    };
    cors = { invalidate: jest.fn() };
    service = new TenantDomainsService(prisma, cors as any);
  });

  it('rejects listing domains for a missing tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(service.list('t-1')).rejects.toThrow(NotFoundException);
  });

  it('creates a domain-type row and invalidates the CORS cache', async () => {
    prisma.tenantDomain.create.mockResolvedValue({
      id: 'd-1',
      tenant_id: 't-1',
      type: 'domain',
      value: 'hotelacme.com',
    });

    const created = await service.create('t-1', { value: 'hotelacme.com' } as any);

    expect(prisma.tenantDomain.create).toHaveBeenCalledWith({
      data: { tenant_id: 't-1', type: 'domain', value: 'hotelacme.com', is_primary: false },
    });
    expect(cors.invalidate).toHaveBeenCalledTimes(1);
    expect(created.id).toBe('d-1');
  });

  it('demotes any existing primary row when creating a new primary', async () => {
    prisma.tenantDomain.create.mockResolvedValue({ id: 'd-2' });

    await service.create('t-1', { value: 'new.hotelacme.com', is_primary: true } as any);

    expect(prisma.tenantDomain.updateMany).toHaveBeenCalledWith({
      where: { tenant_id: 't-1' },
      data: { is_primary: false },
    });
  });

  it('rejects a regex value that does not compile', async () => {
    await expect(service.create('t-1', { type: 'regex', value: '(unterminated' } as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.tenantDomain.create).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint violation to 409', async () => {
    prisma.tenantDomain.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create('t-1', { value: 'taken.com' } as any)).rejects.toThrow(ConflictException);
  });

  it('rejects updating a domain that belongs to a different tenant', async () => {
    prisma.tenantDomain.findUnique.mockResolvedValue({ tenant_id: 't-2' });
    await expect(service.update('t-1', 'd-1', { active: false })).rejects.toThrow(NotFoundException);
  });

  it('updates a domain and invalidates the CORS cache', async () => {
    prisma.tenantDomain.findUnique.mockResolvedValue({ tenant_id: 't-1' });
    prisma.tenantDomain.update.mockResolvedValue({ id: 'd-1', active: false });

    await service.update('t-1', 'd-1', { active: false });

    expect(prisma.tenantDomain.update).toHaveBeenCalledWith({ where: { id: 'd-1' }, data: { active: false } });
    expect(cors.invalidate).toHaveBeenCalledTimes(1);
  });

  it('removes a domain and invalidates the CORS cache', async () => {
    prisma.tenantDomain.findUnique.mockResolvedValue({ tenant_id: 't-1' });

    await service.remove('t-1', 'd-1');

    expect(prisma.tenantDomain.delete).toHaveBeenCalledWith({ where: { id: 'd-1' } });
    expect(cors.invalidate).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tenant-domains.service.spec`
Expected: FAIL com "Cannot find module './tenant-domains.service'".

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-settings/application/dtos/tenant-domain.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const TENANT_DOMAIN_TYPES = ['domain', 'regex'] as const;
export type TenantDomainType = (typeof TENANT_DOMAIN_TYPES)[number];

export class CreateTenantDomainDto {
  @ApiPropertyOptional({
    enum: TENANT_DOMAIN_TYPES,
    default: 'domain',
    description:
      '"domain" auto-scopes to the host and its subdomains (https only). "regex" is matched against Origin verbatim.',
  })
  @IsOptional()
  @IsIn(TENANT_DOMAIN_TYPES)
  type?: TenantDomainType;

  @ApiProperty({
    example: 'hotelacme.com.br',
    description: 'Bare host for type=domain, or a regex source (must compile) for type=regex',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value: string;

  @ApiPropertyOptional({ default: false, description: 'Demotes any other primary row for the same tenant' })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class UpdateTenantDomainDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Setting true demotes any other primary row for the same tenant' })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class TenantDomainResponseDto {
  @ApiProperty({ example: 'cma1domain001uvwxyzab345' })
  id: string;

  @ApiProperty({ example: 'cma1tenant001uvwxyzab345' })
  tenant_id: string;

  @ApiProperty({ enum: TENANT_DOMAIN_TYPES, example: 'domain' })
  type: TenantDomainType;

  @ApiProperty({ example: 'hotelacme.com.br' })
  value: string;

  @ApiProperty({ example: true })
  is_primary: boolean;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  updated_at: Date;
}
```

`src/modules/reserve-settings/application/services/tenant-domains.service.ts`:

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { CorsOriginService } from '../../../../shared/cors/cors-origin.service';
import { CreateTenantDomainDto, UpdateTenantDomainDto } from '../dtos/tenant-domain.dto';

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

function assertCompilableRegex(value: string): void {
  try {
    new RegExp(value);
  } catch {
    throw new BadRequestException(`"${value}" is not a valid regular expression`);
  }
}

/**
 * Every write here changes the CORS allowlist that CorsOriginService caches —
 * invalidate() MUST run after create/update/remove (see shared/cors constraint).
 */
@Injectable()
export class TenantDomainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly corsOriginService: CorsOriginService,
  ) {}

  async list(tenantId: string) {
    await this.assertTenantExists(tenantId);
    return this.prisma.tenantDomain.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    });
  }

  async create(tenantId: string, dto: CreateTenantDomainDto) {
    await this.assertTenantExists(tenantId);
    const type = dto.type ?? 'domain';
    if (type === 'regex') assertCompilableRegex(dto.value);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        if (dto.is_primary) {
          await tx.tenantDomain.updateMany({ where: { tenant_id: tenantId }, data: { is_primary: false } });
        }
        return tx.tenantDomain.create({
          data: {
            tenant_id: tenantId,
            type,
            value: dto.value,
            is_primary: dto.is_primary ?? false,
          },
        });
      });
      this.corsOriginService.invalidate();
      return created;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Domain "${dto.value}" is already registered`);
      }
      throw error;
    }
  }

  async update(tenantId: string, domainId: string, dto: UpdateTenantDomainDto) {
    await this.assertDomainBelongsToTenant(tenantId, domainId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.is_primary) {
        await tx.tenantDomain.updateMany({ where: { tenant_id: tenantId }, data: { is_primary: false } });
      }
      return tx.tenantDomain.update({ where: { id: domainId }, data: dto });
    });
    this.corsOriginService.invalidate();
    return updated;
  }

  async remove(tenantId: string, domainId: string): Promise<void> {
    await this.assertDomainBelongsToTenant(tenantId, domainId);
    await this.prisma.tenantDomain.delete({ where: { id: domainId } });
    this.corsOriginService.invalidate();
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  private async assertDomainBelongsToTenant(tenantId: string, domainId: string): Promise<void> {
    const domain = await this.prisma.tenantDomain.findUnique({
      where: { id: domainId },
      select: { tenant_id: true },
    });
    if (!domain || domain.tenant_id !== tenantId) throw new NotFoundException('Tenant domain not found');
  }
}
```

`src/modules/reserve-settings/infrastructure/controllers/tenant-domains.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { TenantDomainsService } from '../../application/services/tenant-domains.service';
import {
  CreateTenantDomainDto,
  TenantDomainResponseDto,
  UpdateTenantDomainDto,
} from '../../application/dtos/tenant-domain.dto';

// Platform-level: superadmin addresses any tenant by route param — deliberately NO TenantGuard.
@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('settings.domains.manage')
@Controller('tenants/:tenantId/domains')
export class TenantDomainsController {
  constructor(private readonly domains: TenantDomainsService) {}

  @Get()
  @ApiOperation({ summary: 'List CORS domains registered for a tenant' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiOkResponse({ type: [TenantDomainResponseDto] })
  list(@Param('tenantId') tenantId: string) {
    return this.domains.list(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Register a CORS domain for a tenant' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiOkResponse({ type: TenantDomainResponseDto })
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateTenantDomainDto) {
    return this.domains.create(tenantId, dto);
  }

  @Patch(':domainId')
  @ApiOperation({ summary: 'Update (activate/deactivate, set primary) a tenant CORS domain' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiParam({ name: 'domainId', type: 'string' })
  @ApiOkResponse({ type: TenantDomainResponseDto })
  update(
    @Param('tenantId') tenantId: string,
    @Param('domainId', ParseCuidPipe) domainId: string,
    @Body() dto: UpdateTenantDomainDto,
  ) {
    return this.domains.update(tenantId, domainId, dto);
  }

  @Delete(':domainId')
  @ApiOperation({ summary: 'Remove a tenant CORS domain' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiParam({ name: 'domainId', type: 'string' })
  remove(@Param('tenantId') tenantId: string, @Param('domainId', ParseCuidPipe) domainId: string) {
    return this.domains.remove(tenantId, domainId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tenant-domains.service.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-settings/application/dtos/tenant-domain.dto.ts src/modules/reserve-settings/application/services/tenant-domains.service.ts src/modules/reserve-settings/application/services/tenant-domains.service.spec.ts src/modules/reserve-settings/infrastructure/controllers/tenant-domains.controller.ts
git commit -m "feat(settings): add TenantDomainsController with CORS cache invalidation"
```

### Task 18: Controllers de `reserve-settings` e wiring do módulo

**Files:**
- Create: `src/modules/reserve-settings/application/dtos/update-module-settings.dto.ts`
- Create: `src/modules/reserve-settings/application/dtos/update-tenant-modules.dto.ts`
- Create: `src/modules/reserve-settings/application/dtos/settings-response.dto.ts`
- Create: `src/modules/reserve-settings/infrastructure/controllers/tenant-modules.controller.ts`
- Create: `src/modules/reserve-settings/infrastructure/controllers/superadmin-modules.controller.ts`
- Create: `src/modules/reserve-settings/infrastructure/controllers/tenant-settings.controller.ts`
- Create: `src/modules/reserve-settings/infrastructure/controllers/superadmin-settings.controller.ts`
- Create: `src/modules/reserve-settings/reserve-settings.module.ts`
- Modify: `src/app.module.ts:8-24,30-53` (importar `ReserveSettingsModule`, registrar prefixo `settings`)
- Test: `src/modules/reserve-settings/reserve-settings.module.spec.ts`

**Interfaces:**
- Consumes: `SettingsService` (Task 9), `ModuleFlagsService` (Task 15), `TenantDomainsController` (Task 17), `PrismaTenantSettingRepository`/`TENANT_SETTING_REPOSITORY` (Task 5), `SettingsRegistry` (Task 8), `ReserveAuthModule` (existente, exporta `AdminJwtGuard`/`TenantGuard`/`PermissionsGuard`).
- Produces: `ReserveSettingsModule`; rotas `GET/PATCH /api/settings`, `/api/settings/:module`, `/api/settings/modules`, `/api/settings/tenants/:tenantId/modules`, `/api/settings/tenants/:tenantId/domains`, `/api/settings/tenants/:tenantId/:module`.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-settings/reserve-settings.module.spec.ts`:

```ts
import 'reflect-metadata';
import { ReserveSettingsModule } from './reserve-settings.module';
import { TenantModulesController } from './infrastructure/controllers/tenant-modules.controller';
import { SuperadminModulesController } from './infrastructure/controllers/superadmin-modules.controller';
import { TenantDomainsController } from './infrastructure/controllers/tenant-domains.controller';
import { SuperadminSettingsController } from './infrastructure/controllers/superadmin-settings.controller';
import { TenantSettingsController } from './infrastructure/controllers/tenant-settings.controller';

describe('ReserveSettingsModule route order', () => {
  it('registers every specific-path controller before the /:module catch-all', () => {
    const controllers: unknown[] = Reflect.getMetadata('controllers', ReserveSettingsModule);

    expect(controllers).toEqual([
      TenantModulesController,
      SuperadminModulesController,
      TenantDomainsController,
      SuperadminSettingsController,
      TenantSettingsController,
    ]);
    // TenantSettingsController owns GET/PATCH ':module' — a param route that
    // would swallow /modules and /tenants/:tenantId/... (module='tenants') if
    // registered before them. It MUST be last.
    expect(controllers[controllers.length - 1]).toBe(TenantSettingsController);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reserve-settings.module.spec`
Expected: FAIL com "Cannot find module './reserve-settings.module'".

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-settings/application/dtos/update-module-settings.dto.ts`:

```ts
import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateModuleSettingsDto {
  // { [key]: value } — per-key validation happens against the registry in SettingsService.set
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Partial map of setting key (camelCase) to new value. Only provided keys are written. ' +
      'Unknown keys → 400, superadmin-scoped keys → 403 (tenant route only).',
    example: { emailEnabled: false, contactEmail: 'ops@example.com' },
  })
  @IsObject()
  values: Record<string, unknown>;
}
```

`src/modules/reserve-settings/application/dtos/update-tenant-modules.dto.ts`:

```ts
import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantModulesDto {
  // { [gateableModule]: boolean } — names validated against the catalog in ModuleFlagsService
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'boolean' },
    description: 'Partial map of gateable module name to enabled flag. Unknown module names → 400.',
    example: { mailer: true, cms: false },
  })
  @IsObject()
  modules: Record<string, boolean>;
}
```

`src/modules/reserve-settings/application/dtos/settings-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger response models for the settings API. These classes exist purely so
 * the OpenAPI document exposes typed responses instead of `unknown`; the
 * runtime shapes are produced by `ModuleFlagsService` and `SettingsService`.
 * Keep them in lockstep with `GATEABLE_MODULES` and the `SettingsRegistry`
 * definitions.
 *
 * `getFlags`/`getModule`/`describeAll` all return bare dynamic maps (not
 * wrapped in an envelope object) — each module registers its own set of keys
 * (see `settings-registry.ts`), so the per-key value/shape cannot be fixed at
 * the type level. They are documented via inline `schema` on `@ApiOkResponse`
 * with `additionalProperties`, matching the wire shape exactly.
 */
export class SettingDescriptorResponseDto {
  @ApiProperty({
    description: 'Current merged value (tenant override if set, otherwise the default)',
    type: 'object',
    additionalProperties: true,
    example: true,
  })
  value!: unknown;

  @ApiProperty({
    description: 'Default value used when no tenant override exists',
    type: 'object',
    additionalProperties: true,
    example: true,
  })
  default!: unknown;

  @ApiProperty({ enum: ['boolean', 'string', 'number', 'json'], example: 'boolean' })
  type!: 'boolean' | 'string' | 'number' | 'json';

  @ApiProperty({ enum: ['tenant', 'superadmin'], example: 'tenant' })
  scope!: 'tenant' | 'superadmin';

  @ApiProperty({ example: 'Send notification emails to tenant admins' })
  description!: string;
}
```

`src/modules/reserve-settings/infrastructure/controllers/tenant-modules.controller.ts`:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ModuleFlagsService } from '../../application/services/module-flags.service';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';

const MODULE_FLAGS_SCHEMA = {
  type: 'object' as const,
  additionalProperties: { type: 'boolean' as const },
  description:
    'Enabled/disabled flag for every gateable module, keyed by module name ' +
    `(${GATEABLE_MODULES.join(', ')})`,
  example: Object.fromEntries(GATEABLE_MODULES.map((module, i) => [module, i % 2 === 0])),
};

@ApiTags('Settings')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
@Controller('modules')
export class TenantModulesController {
  constructor(private readonly moduleFlags: ModuleFlagsService) {}

  @Get()
  @RequirePermissions('settings.modules.read')
  @ApiOperation({
    summary: 'Enabled modules for the current tenant',
    description: 'Dashboard reads this once at load to hide disabled modules',
  })
  @ApiOkResponse({ description: 'Module flags for the current tenant, keyed by module name', schema: MODULE_FLAGS_SCHEMA })
  async get(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.moduleFlags.getFlags(admin.tenant_id!);
  }
}
```

`src/modules/reserve-settings/infrastructure/controllers/superadmin-modules.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiOkResponse, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ModuleFlagsService } from '../../application/services/module-flags.service';
import { UpdateTenantModulesDto } from '../../application/dtos/update-tenant-modules.dto';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';

const MODULE_FLAGS_SCHEMA = {
  type: 'object' as const,
  additionalProperties: { type: 'boolean' as const },
  description:
    'Enabled/disabled flag for every gateable module, keyed by module name ' +
    `(${GATEABLE_MODULES.join(', ')})`,
  example: Object.fromEntries(GATEABLE_MODULES.map((module, i) => [module, i % 2 === 0])),
};

// Platform-level: superadmin addresses any tenant by route param — deliberately NO TenantGuard.
@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('settings.modules.manage')
@Controller('tenants/:tenantId/modules')
export class SuperadminModulesController {
  constructor(private readonly moduleFlags: ModuleFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Module flags for a tenant (superadmin)' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiOkResponse({ description: 'Module flags for the tenant, keyed by module name', schema: MODULE_FLAGS_SCHEMA })
  async get(@Param('tenantId') tenantId: string) {
    return this.moduleFlags.getFlags(tenantId);
  }

  @Patch()
  @ApiOperation({ summary: 'Enable/disable modules for a tenant (superadmin)' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiOkResponse({ description: 'Updated module flags for the tenant, keyed by module name', schema: MODULE_FLAGS_SCHEMA })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiBadRequestResponse({ description: 'Unknown module name, non-boolean flag, or master tenant modules cannot be overridden' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantModulesDto,
  ) {
    return this.moduleFlags.setFlags(tenantId, dto.modules as any, admin.admin_id);
  }
}
```

`src/modules/reserve-settings/infrastructure/controllers/tenant-settings.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { SettingsService } from '../../application/services/settings.service';
import { UpdateModuleSettingsDto } from '../../application/dtos/update-module-settings.dto';
import { SettingDescriptorResponseDto } from '../../application/dtos/settings-response.dto';

const MODULE_SETTINGS_SCHEMA = {
  type: 'object' as const,
  additionalProperties: true,
  description:
    'Merged settings for one module, keyed by setting key (camelCase). Value type varies per key ' +
    '(boolean, string, number, or arbitrary JSON) — see the module registry for the concrete shape.',
  example: { emailEnabled: true, inappEnabled: true, contactEmail: '' },
};

@ApiTags('Settings')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant ID' })
@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
@ApiExtraModels(SettingDescriptorResponseDto)
@Controller()
export class TenantSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'All settings', description: 'Every registered module and key with merged value, default, type, scope, description' })
  @ApiOkResponse({
    description:
      'Every registered module and key, with merged value, default, type, scope and description. ' +
      'Top level is keyed by module name; each module maps setting key (camelCase) to its descriptor.',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: { $ref: getSchemaPath(SettingDescriptorResponseDto) },
      },
      example: {
        notifications: {
          emailEnabled: {
            value: true,
            default: true,
            type: 'boolean',
            scope: 'tenant',
            description: 'Send notification emails to tenant admins',
          },
        },
      },
    },
  })
  async all(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.settingsService.describeAll(admin.tenant_id!);
  }

  @Get(':module')
  @RequirePermissions('settings.read')
  @ApiParam({ name: 'module', type: 'string', example: 'notifications' })
  @ApiOperation({ summary: 'One module settings (merged values only)' })
  @ApiOkResponse({ description: 'Merged settings for the module', schema: MODULE_SETTINGS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Unknown module' })
  async module(@CurrentAdmin() admin: CurrentAdminPayload, @Param('module') module: string) {
    return this.settingsService.getModule(admin.tenant_id!, module);
  }

  @Patch(':module')
  @RequirePermissions('settings.manage')
  @ApiParam({ name: 'module', type: 'string', example: 'notifications' })
  @ApiOperation({ summary: 'Update module settings', description: 'Partial: only provided keys are written. Unknown keys → 400, superadmin-scoped keys → 403.' })
  @ApiOkResponse({ description: 'Merged settings for the module after the update', schema: MODULE_SETTINGS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Unknown module, unknown setting key, or invalid value for a setting' })
  @ApiForbiddenResponse({ description: 'Setting is superadmin-scoped and not writable at tenant scope' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('module') module: string,
    @Body() dto: UpdateModuleSettingsDto,
  ) {
    for (const [key, value] of Object.entries(dto.values)) {
      await this.settingsService.set(admin.tenant_id!, module, key, value, admin.admin_id);
    }
    return this.settingsService.getModule(admin.tenant_id!, module);
  }
}
```

`src/modules/reserve-settings/infrastructure/controllers/superadmin-settings.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { SettingsService } from '../../application/services/settings.service';
import { UpdateModuleSettingsDto } from '../../application/dtos/update-module-settings.dto';

const MODULE_SETTINGS_SCHEMA = {
  type: 'object' as const,
  additionalProperties: true,
  description:
    'Merged settings for one module, keyed by setting key (camelCase). Value type varies per key ' +
    '(boolean, string, number, or arbitrary JSON) — see the module registry for the concrete shape.',
  example: { emailEnabled: true, inappEnabled: true, contactEmail: '' },
};

// Platform-level: superadmin addresses any tenant by route param — deliberately NO TenantGuard.
@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard, PermissionsGuard)
@RequirePermissions('settings.modules.manage')
@Controller('tenants/:tenantId')
export class SuperadminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':module')
  @ApiOperation({ summary: 'One module settings for any tenant (superadmin, merged values only)' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiParam({ name: 'module', type: 'string', example: 'notifications' })
  @ApiOkResponse({ description: 'Merged settings for the module', schema: MODULE_SETTINGS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Unknown module' })
  async module(@Param('tenantId') tenantId: string, @Param('module') module: string) {
    return this.settingsService.getModule(tenantId, module);
  }

  @Patch(':module')
  @ApiOperation({ summary: 'Update module settings for any tenant (superadmin)', description: 'Partial: only provided keys are written. Unknown keys → 400.' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiParam({ name: 'module', type: 'string', example: 'notifications' })
  @ApiOkResponse({ description: 'Merged settings for the module after the update', schema: MODULE_SETTINGS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Unknown module, unknown setting key, or invalid value for a setting' })
  async update(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Param('tenantId') tenantId: string,
    @Param('module') module: string,
    @Body() dto: UpdateModuleSettingsDto,
  ) {
    for (const [key, value] of Object.entries(dto.values)) {
      await this.settingsService.setAsSuperadmin(tenantId, module, key, value, admin.admin_id);
    }
    return this.settingsService.getModule(tenantId, module);
  }
}
```

`src/modules/reserve-settings/reserve-settings.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ReserveAuthModule } from '../reserve-auth/reserve-auth.module';
import { SettingsService } from './application/services/settings.service';
import { ModuleFlagsService } from './application/services/module-flags.service';
import { TenantDomainsService } from './application/services/tenant-domains.service';
import { SettingsRegistry } from './infrastructure/registry/settings-registry';
import { TenantModulesController } from './infrastructure/controllers/tenant-modules.controller';
import { SuperadminModulesController } from './infrastructure/controllers/superadmin-modules.controller';
import { TenantDomainsController } from './infrastructure/controllers/tenant-domains.controller';
import { SuperadminSettingsController } from './infrastructure/controllers/superadmin-settings.controller';
import { TenantSettingsController } from './infrastructure/controllers/tenant-settings.controller';
import { PrismaTenantSettingRepository } from './infrastructure/repositories/prisma-tenant-setting.repository';
import { TENANT_SETTING_REPOSITORY } from './domain/interfaces/tenant-setting.repository.interface';

@Module({
  imports: [ReserveAuthModule],
  // Route order matters: /modules, /tenants/:tenantId/modules and
  // /tenants/:tenantId/domains must match before the /:module and
  // /tenants/:tenantId/:module catch-alls.
  controllers: [
    TenantModulesController,
    SuperadminModulesController,
    TenantDomainsController,
    SuperadminSettingsController,
    TenantSettingsController,
  ],
  providers: [
    SettingsService,
    ModuleFlagsService,
    TenantDomainsService,
    SettingsRegistry,
    { provide: TENANT_SETTING_REPOSITORY, useClass: PrismaTenantSettingRepository },
  ],
  exports: [SettingsService, SettingsRegistry],
})
export class ReserveSettingsModule {}
```

`src/app.module.ts` — acrescentar o import junto aos outros bounded contexts:

```ts
import { ReserveSettingsModule } from './modules/reserve-settings/reserve-settings.module';
```

e no array `imports`, junto às outras bounded contexts:

```ts
    ReserveClientPortalModule,
    ReserveSettingsModule,
```

e em `RouterModule.register([...])`, junto aos outros prefixos:

```ts
      {
        path: 'settings',
        module: ReserveSettingsModule,
      },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reserve-settings.module.spec && npm run build`
Expected: PASS e build sem erro

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-settings src/app.module.ts
git commit -m "feat(settings): wire reserve-settings controllers under /api/settings"
```

### Task 19: `MasterTenantGuard`

**Files:**
- Create: `src/shared/auth/guards/master-tenant.guard.ts`
- Test: `src/shared/auth/guards/master-tenant.guard.spec.ts`

**Interfaces:**
- Consumes: `ITenantRepository`/`TENANT_REPOSITORY` de `src/modules/reserve-auth/domain/interfaces` (existente); `Tenant.tenant_type` (Task 1).
- Produces: `MasterTenantGuard` — restringe uma rota a admins operando dentro de um tenant `MASTER`.

- [ ] **Step 1: Write the failing test**

`src/shared/auth/guards/master-tenant.guard.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import { MasterTenantGuard } from './master-tenant.guard';

const contextFor = (request: any) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

describe('MasterTenantGuard', () => {
  let tenantRepository: { selectById: jest.Mock };
  let guard: MasterTenantGuard;

  beforeEach(() => {
    tenantRepository = { selectById: jest.fn() };
    guard = new MasterTenantGuard(tenantRepository as any);
  });

  it('allows an OPTIONS preflight through without resolving a tenant', async () => {
    await expect(guard.canActivate(contextFor({ method: 'OPTIONS' }))).resolves.toBe(true);
    expect(tenantRepository.selectById).not.toHaveBeenCalled();
  });

  it('rejects when no tenant_id was resolved by TenantGuard', async () => {
    await expect(guard.canActivate(contextFor({ method: 'GET' }))).rejects.toThrow(/requires a resolved tenant/i);
  });

  it('rejects a valid but non-MASTER tenant', async () => {
    tenantRepository.selectById.mockResolvedValue({ id: 't-1', tenant_type: 'COMMON' });
    await expect(guard.canActivate(contextFor({ method: 'GET', tenant_id: 't-1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a tenant_id that resolves to nothing', async () => {
    tenantRepository.selectById.mockResolvedValue(null);
    await expect(guard.canActivate(contextFor({ method: 'GET', tenant_id: 't-1' }))).rejects.toThrow(
      /requires a MASTER tenant/i,
    );
  });

  it('allows a MASTER tenant and stamps request.tenant_type', async () => {
    tenantRepository.selectById.mockResolvedValue({ id: 't-1', tenant_type: 'MASTER' });
    const request = { method: 'GET', tenant_id: 't-1' };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toHaveProperty('tenant_type', 'MASTER');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- master-tenant.guard.spec`
Expected: FAIL com "Cannot find module './master-tenant.guard'".

- [ ] **Step 3: Write minimal implementation**

`src/shared/auth/guards/master-tenant.guard.ts`:

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ITenantRepository, TENANT_REPOSITORY } from '../../../modules/reserve-auth/domain/interfaces';

/**
 * Restricts a route to admins operating within a MASTER-type tenant.
 *
 * Runs AFTER TenantGuard (which resolves and authorizes request.tenant_id).
 * Master authority is a property of the *selected* tenant, never of an
 * arbitrary x-tenant-id: a non-MASTER tenant — even a valid, authorized one —
 * is rejected.
 */
@Injectable()
export class MasterTenantGuard implements CanActivate {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: ITenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.method === 'OPTIONS') {
      return true;
    }

    const tenantId: string | undefined = request.tenant_id;
    if (!tenantId) {
      throw new ForbiddenException('Master access requires a resolved tenant');
    }

    const tenant = await this.tenantRepository.selectById(tenantId);
    if (!tenant || tenant.tenant_type !== 'MASTER') {
      throw new ForbiddenException('Master access requires a MASTER tenant');
    }

    request.tenant_type = 'MASTER';
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- master-tenant.guard.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/guards/master-tenant.guard.ts src/shared/auth/guards/master-tenant.guard.spec.ts
git commit -m "feat(auth): add MasterTenantGuard for MASTER-tenant-only routes"
```

---

### Task 20: Estender `GET /api/tenant-capabilities` com `tenantType`, `isMasterTenant` e `modules`

Esta task assume que a Fase 2 já produziu `GetTenantCapabilitiesUseCase` (`src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.ts`) e `TenantCapabilitiesController` (`src/modules/reserve-auth/infrastructure/controllers/tenant-capabilities.controller.ts`) devolvendo `{ tenantId, role, permissions }`. Abaixo está o **conteúdo final completo** dos dois arquivos pós-Fase-3 — substitua o arquivo inteiro por este (se a Fase 2 usou nomes de campo diferentes nos repositórios injetados, ajuste só os imports, mantendo a assinatura pública `execute(adminId, tenantId): Promise<TenantCapabilities>`).

**Files:**
- Create: `src/modules/reserve-auth/application/dtos/tenant-capabilities-response.dto.ts`
- Modify: `src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.ts`
- Modify: `src/modules/reserve-auth/infrastructure/controllers/tenant-capabilities.controller.ts`
- Test: `src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.spec.ts`

**Interfaces:**
- Consumes: `GATEABLE_MODULES`/`GateableModule` (Task 6), `resolveModuleEnabled` (Task 12), `TenantModulePolicyResolution` (Task 11), `TenantType`/`TENANT_TYPES` (Task 1), `normalizeAdminRole`/`TenantPermissionPolicyService.resolve` (Fase 2, ver Global Constraints).
- Produces: `TenantCapabilities { tenantId, tenantType, isMasterTenant, role, modules, permissions }`; `TenantCapabilitiesResponseDto` tipado no Swagger.

- [ ] **Step 1: Write the failing test**

`src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.spec.ts` — arquivo completo:

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';
import { invalidateModuleAccessCache } from '../../../../shared/auth/module-access.util';
import { GetTenantCapabilitiesUseCase } from './get-tenant-capabilities.use-case';

describe('GetTenantCapabilitiesUseCase', () => {
  const prisma = {
    tenant: { findUnique: jest.fn() },
    tenantSetting: { findUnique: jest.fn() },
    tenantTypeModulePolicy: { findUnique: jest.fn() },
  } as any;
  const adminRepository = { selectById: jest.fn() } as any;
  const adminTenantRepository = { findRoleInTenant: jest.fn() } as any;
  const permissionPolicy = { resolve: jest.fn() } as any;

  const useCase = new GetTenantCapabilitiesUseCase(prisma, adminRepository, adminTenantRepository, permissionPolicy);

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateModuleAccessCache();
    adminRepository.selectById.mockResolvedValue({ id: 'admin-1', active: true, role: EAdminRole.manager });
    adminTenantRepository.findRoleInTenant.mockResolvedValue(EAdminRole.viewer);
    permissionPolicy.resolve.mockResolvedValue(new Set(['stats.dashboard.read']));
    prisma.tenantSetting.findUnique.mockResolvedValue(null);
    prisma.tenantTypeModulePolicy.findUnique.mockResolvedValue({ enabled: false });
  });

  it('returns unrestricted modules for MASTER while preserving caller permissions', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'cma1master0001ghijklmno23p',
      active: true,
      tenant_type: 'MASTER',
    });

    const result = await useCase.execute('admin-1', 'cma1master0001ghijklmno23p');

    expect(result.tenantType).toBe('MASTER');
    expect(result.isMasterTenant).toBe(true);
    expect(Object.keys(result.modules)).toEqual([...GATEABLE_MODULES]);
    expect(Object.values(result.modules)).toEqual(expect.arrayContaining([{ enabled: true, source: 'master' }]));
    expect(result.permissions).toEqual(['stats.dashboard.read']);
    expect(permissionPolicy.resolve).toHaveBeenCalledWith('admin-1', 'cma1master0001ghijklmno23p', EAdminRole.viewer);
  });

  it('returns type-policy modules for an EDUCATIONAL tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'cma1edu00001ghijklmno23p',
      active: true,
      tenant_type: 'EDUCATIONAL',
    });
    prisma.tenantTypeModulePolicy.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve({ enabled: where.tenant_type_module_key.module_key === 'client-portal' }),
    );

    const result = await useCase.execute('admin-1', 'cma1edu00001ghijklmno23p');

    expect(result.modules['client-portal']).toEqual({ enabled: true, source: 'tenantTypePolicy' });
    expect(result.modules.cms).toEqual({ enabled: false, source: 'tenantTypePolicy' });
  });

  it('rejects missing tenant membership for a regular admin', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', active: true, tenant_type: 'COMMON' });
    adminTenantRepository.findRoleInTenant.mockResolvedValue(null);

    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects missing tenants', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    await expect(useCase.execute('admin-1', 'missing')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- get-tenant-capabilities.use-case.spec`
Expected: FAIL — `result.tenantType`/`result.isMasterTenant`/`result.modules` são `undefined` na versão da Fase 2 (que só devolvia `{ tenantId, role, permissions }`).

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.ts` — arquivo completo:

```ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { GATEABLE_MODULES, GateableModule } from '../../../../shared/auth/constants/gateable-modules';
import { resolveModuleEnabled } from '../../../../shared/auth/module-access.util';
import { TenantModulePolicyResolution } from '../../domain/services/tenant-type-policy.resolver';
import { TenantType } from '../../../../shared/auth/constants/tenant-type';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY, IAdminRepository } from '../../domain/interfaces/admin.repository.interface';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../domain/interfaces/admin-tenant.repository.interface';
import { normalizeAdminRole } from '../../../../shared/auth/rbac/permission-matrix';
import { TenantPermissionPolicyService } from '../../../../shared/auth/rbac/tenant-permission-policy.service';

export interface TenantCapabilities {
  tenantId: string;
  tenantType: TenantType;
  isMasterTenant: boolean;
  role: EAdminRole;
  modules: Record<GateableModule, TenantModulePolicyResolution>;
  permissions: string[];
}

@Injectable()
export class GetTenantCapabilitiesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_TENANT_REPOSITORY)
    private readonly adminTenantRepository: IAdminTenantRepository,
    private readonly permissionPolicy: TenantPermissionPolicyService,
  ) {}

  async execute(adminId: string, tenantId: string): Promise<TenantCapabilities> {
    const [tenant, admin] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, active: true, tenant_type: true },
      }),
      this.adminRepository.selectById(adminId),
    ]);

    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.active === false) throw new ForbiddenException('Tenant is inactive');
    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    let role: EAdminRole;
    let permissions: string[];

    if (admin.role === EAdminRole.super_admin) {
      role = EAdminRole.super_admin;
      permissions = ['*'];
    } else {
      const tenantRole = await this.adminTenantRepository.findRoleInTenant(adminId, tenantId);
      if (!tenantRole) throw new ForbiddenException('You do not have a role in this tenant');
      role = normalizeAdminRole(tenantRole);
      permissions = [...(await this.permissionPolicy.resolve(adminId, tenantId, role))].sort();
    }

    const resolvedModules = await Promise.all(
      GATEABLE_MODULES.map(
        async (module) => [module, await resolveModuleEnabled(this.prisma, tenantId, module)] as const,
      ),
    );

    return {
      tenantId,
      tenantType: tenant.tenant_type as TenantType,
      isMasterTenant: tenant.tenant_type === 'MASTER',
      role,
      modules: Object.fromEntries(resolvedModules) as Record<GateableModule, TenantModulePolicyResolution>,
      permissions,
    };
  }
}
```

`src/modules/reserve-auth/application/dtos/tenant-capabilities-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { GATEABLE_MODULES } from '../../../../shared/auth/constants/gateable-modules';
import { TENANT_TYPES } from '../../../../shared/auth/constants/tenant-type';

export class ModuleResolutionResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ enum: ['master', 'tenantOverride', 'tenantTypePolicy'], example: 'tenantTypePolicy' })
  source!: 'master' | 'tenantOverride' | 'tenantTypePolicy';
}

export class TenantCapabilitiesResponseDto {
  @ApiProperty({ example: 'cma1tenant001uvwxyzab345' })
  tenantId!: string;

  @ApiProperty({ enum: TENANT_TYPES, example: 'COMMON' })
  tenantType!: (typeof TENANT_TYPES)[number];

  @ApiProperty({ example: false })
  isMasterTenant!: boolean;

  @ApiProperty({ example: 'manager' })
  role!: string;

  @ApiProperty({
    description: 'Resolved enabled/source per gateable module',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/ModuleResolutionResponseDto' },
    example: Object.fromEntries(GATEABLE_MODULES.map((module) => [module, { enabled: true, source: 'tenantTypePolicy' }])),
  })
  modules!: Record<string, ModuleResolutionResponseDto>;

  @ApiProperty({ type: [String], example: ['stats.dashboard.read', 'leads.read'] })
  permissions!: string[];
}
```

`src/modules/reserve-auth/infrastructure/controllers/tenant-capabilities.controller.ts` — arquivo completo:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { TenantGuard } from '../../../../shared/auth/guards/tenant.guard';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { GetTenantCapabilitiesUseCase } from '../../application/use-cases/get-tenant-capabilities.use-case';
import {
  ModuleResolutionResponseDto,
  TenantCapabilitiesResponseDto,
} from '../../application/dtos/tenant-capabilities-response.dto';

@ApiTags('Tenant Management')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active tenant ID' })
@ApiExtraModels(ModuleResolutionResponseDto)
@UseGuards(AdminJwtGuard, TenantGuard)
@Controller('tenant-capabilities')
export class TenantCapabilitiesController {
  constructor(private readonly getTenantCapabilities: GetTenantCapabilitiesUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Get effective capabilities for the active tenant and admin',
    description:
      'Returns tenant type, resolved module availability with inheritance source, and the caller effective permissions.',
  })
  @ApiOkResponse({
    description: 'Effective tenant capabilities for the caller',
    type: TenantCapabilitiesResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiForbiddenResponse({
    description: 'Tenant is inactive, admin account is inactive/not found, or admin has no role in this tenant',
  })
  get(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.getTenantCapabilities.execute(admin.admin_id, admin.tenant_id!);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- get-tenant-capabilities.use-case.spec && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.ts src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.spec.ts src/modules/reserve-auth/application/dtos/tenant-capabilities-response.dto.ts src/modules/reserve-auth/infrastructure/controllers/tenant-capabilities.controller.ts
git commit -m "feat(tenant-capabilities): add tenantType, isMasterTenant and resolved modules"
```

### Task 21: Tipagem completa de resposta no Swagger — `reserve-notifications`

**Contexto do escopo.** Uma auditoria de todos os 63 controllers do Reserve mostra que só 1 usa `type:`/schema completo em toda resposta; a grande maioria devolve `any` implícito no documento OpenAPI. Cobrir os 63 de uma vez não é uma task, é um projeto — e não é o que a Fase 4 (codegen do painel) precisa primeiro: ela precisa que os módulos **novos desta fase** (`tenant-capabilities` estendido — Task 20 — e `reserve-settings` — Task 18, já com `schema` inline) estejam tipados, e que o padrão fique documentado e travado por um mecanismo que não regride.

Esta task faz duas coisas: (1) tipa por completo o módulo `reserve-notifications` (3 controllers, 0% tipado hoje — grep `@ApiResponse\|@ApiOkResponse` retorna 0 ocorrências com `type:`), que o painel já consome em `src/app/dashboard/notifications` e `src/app/dashboard/global/notifications`; (2) trava esse ganho com um teste de regressão que falha se um novo endpoint success-response for adicionado sem schema, usando uma allowlist explícita dos controllers ainda não migrados — a lista só pode **encolher**, nunca crescer. Os 59 controllers restantes ficam na allowlist como dívida explícita, não como "TODO": cada linha da allowlist é um caminho de arquivo real, auditável.

**Files:**
- Create: `src/modules/reserve-notifications/application/dtos/notification-response.dto.ts`
- Modify: `src/modules/reserve-notifications/infrastructure/controllers/notification.controller.ts`
- Modify: `src/modules/reserve-notifications/infrastructure/controllers/notification-tenant.controller.ts`
- Modify: `src/modules/reserve-notifications/infrastructure/controllers/notification-settings.controller.ts`
- Create: `src/shared/swagger/untyped-response-allowlist.ts`
- Test: `src/shared/swagger/untyped-response-allowlist.spec.ts`

**Interfaces:**
- Consumes: `ENotificationType`/`ENotificationScope` (`src/modules/reserve-notifications/domain/enums`, existente).
- Produces: `NotificationResponseDto`, `PaginatedNotificationsResponseDto`, `TenantNotificationReceiptResponseDto`, `PaginatedTenantNotificationsResponseDto`, `UnreadCountResponseDto`, `OkResponseDto`, `NotificationSettingsResponseDto`; `UNTYPED_RESPONSE_CONTROLLERS` (allowlist).

- [ ] **Step 1: Write the failing test**

`src/shared/swagger/untyped-response-allowlist.spec.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { UNTYPED_RESPONSE_CONTROLLERS } from './untyped-response-allowlist';

const SRC_DIR = path.join(process.cwd(), 'src');

function hasTypedResponse(fileContent: string): boolean {
  // A controller counts as "typed" once at least one handler declares a
  // concrete response shape: @ApiOkResponse/@ApiCreatedResponse with `type:`
  // or `schema:`, or an @ApiResponse({ ..., type: ... }).
  return /@Api(Ok|Created)Response\(\{[^}]*(type|schema):/s.test(fileContent) ||
    /@ApiResponse\(\{[^}]*type:/s.test(fileContent);
}

describe('untyped-response-allowlist', () => {
  it('lists only files that actually exist', () => {
    for (const relativePath of UNTYPED_RESPONSE_CONTROLLERS) {
      const absolute = path.join(SRC_DIR, relativePath);
      expect(fs.existsSync(absolute)).toBe(true);
    }
  });

  it('does not include reserve-notifications controllers anymore', () => {
    for (const relativePath of UNTYPED_RESPONSE_CONTROLLERS) {
      expect(relativePath).not.toMatch(/reserve-notifications/);
    }
  });

  it('every allowlisted controller is genuinely untyped (regression tripwire)', () => {
    for (const relativePath of UNTYPED_RESPONSE_CONTROLLERS) {
      const content = fs.readFileSync(path.join(SRC_DIR, relativePath), 'utf8');
      expect(hasTypedResponse(content)).toBe(false);
    }
  });

  it('every *.controller.ts under src/modules is either typed or explicitly allowlisted', () => {
    const allControllers = walk(path.join(SRC_DIR, 'modules')).filter((file) => file.endsWith('.controller.ts'));
    const allowSet = new Set(UNTYPED_RESPONSE_CONTROLLERS.map((p) => path.join(SRC_DIR, p)));

    const untypedAndNotAllowed = allControllers.filter((file) => {
      const content = fs.readFileSync(file, 'utf8');
      return !hasTypedResponse(content) && !allowSet.has(file);
    });

    expect(untypedAndNotAllowed).toEqual([]);
  });
});

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- untyped-response-allowlist.spec`
Expected: FAIL com "Cannot find module './untyped-response-allowlist'".

- [ ] **Step 3: Write minimal implementation**

`src/modules/reserve-notifications/application/dtos/notification-response.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ENotificationScope, ENotificationType } from '../../domain/enums';

export class NotificationResponseDto {
  @ApiProperty({ example: 'cma1notif0001ghijklmno23p' })
  id!: string;

  @ApiProperty({ example: 'Nova versão disponível' })
  title!: string;

  @ApiProperty({ example: 'Confira as novidades desta versão do painel.' })
  body!: string;

  @ApiProperty({ enum: ENotificationType, example: ENotificationType.manual })
  type!: ENotificationType;

  @ApiProperty({ enum: ENotificationScope, example: ENotificationScope.broadcast })
  scope!: ENotificationScope;

  @ApiProperty({ type: [String], example: [] })
  tenant_ids!: string[];

  @ApiPropertyOptional({ example: 'lead.created', nullable: true })
  event_key?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ example: false })
  send_email!: boolean;

  @ApiPropertyOptional({ example: '2026-08-01T12:00:00.000Z', nullable: true })
  scheduled_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-07-26T12:00:00.000Z', nullable: true })
  published_at?: Date | null;

  @ApiPropertyOptional({ example: 'cma1admin0001ghijklmno23p', nullable: true })
  created_by?: string | null;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  updated_at!: Date;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}

export class TenantNotificationReceiptResponseDto {
  @ApiProperty({ example: 'cma1recpt0001ghijklmno23p' })
  id!: string;

  @ApiProperty({ example: 'cma1notif0001ghijklmno23p' })
  notification_id!: string;

  @ApiProperty({ example: 'cma1tenant001uvwxyzab345' })
  tenant_id!: string;

  @ApiPropertyOptional({ example: 'cma1admin0001ghijklmno23p', nullable: true })
  admin_id?: string | null;

  @ApiPropertyOptional({ example: '2026-07-26T12:05:00.000Z', nullable: true })
  first_viewed_at?: Date | null;

  @ApiPropertyOptional({ example: '2026-07-26T12:05:00.000Z', nullable: true })
  last_viewed_at?: Date | null;

  @ApiProperty({ example: false })
  viewed!: boolean;

  @ApiProperty({ type: NotificationResponseDto })
  Notification!: NotificationResponseDto;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  updated_at!: Date;
}

export class PaginatedTenantNotificationsResponseDto {
  @ApiProperty({ type: [TenantNotificationReceiptResponseDto] })
  data!: TenantNotificationReceiptResponseDto[];

  @ApiProperty({ example: 17 })
  total!: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count!: number;
}

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

export class NotificationSettingsResponseDto {
  @ApiProperty({ example: 'cma1nsett0001ghijklmno23p' })
  id!: string;

  @ApiProperty({ example: 'cma1tenant001uvwxyzab345' })
  tenant_id!: string;

  @ApiProperty({ example: true })
  email_enabled!: boolean;

  @ApiProperty({ example: true })
  inapp_enabled!: boolean;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' }, example: { 'lead.created': true } })
  event_settings!: Record<string, boolean>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' }, example: { 'subscription.expiry_check': true } })
  cron_settings!: Record<string, boolean>;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-07-26T12:00:00.000Z' })
  updated_at!: Date;
}
```

`src/modules/reserve-notifications/infrastructure/controllers/notification.controller.ts` — arquivo completo:

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationService } from '../../application/services/notification.service';
import { CreateNotificationDTO, UpdateNotificationDTO, ListNotificationsQueryDTO } from '../../application/dtos';
import { NotificationResponseDto, PaginatedNotificationsResponseDto } from '../../application/dtos/notification-response.dto';

@ApiTags('Notifications (super_admin)')
@ApiBearerAuth()
@Roles(EAdminRole.super_admin)
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create notification draft (super_admin)' })
  @ApiCreatedResponse({ type: NotificationResponseDto })
  async create(@Body() dto: CreateNotificationDTO, @CurrentAdmin() admin: CurrentAdminPayload, @Res() res: Response) {
    const result = await this.service.create(dto, admin.admin_id);
    return res.status(201).json(result);
  }

  @Post('/:id/publish')
  @ApiOperation({ summary: 'Publish notification draft (super_admin)' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async publish(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.service.publish(id);
    return res.status(200).json(result);
  }

  @Get()
  @ApiOperation({ summary: 'List all notifications (super_admin)' })
  @ApiOkResponse({ type: PaginatedNotificationsResponseDto })
  async list(@Query() query: ListNotificationsQueryDTO, @Res() res: Response) {
    const result = await this.service.list(query);
    return res.status(200).json(result);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get notification by ID (super_admin)' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async findById(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.service.findById(id);
    return res.status(200).json(result);
  }

  @Patch('/:id')
  @ApiOperation({ summary: 'Update notification draft (super_admin)' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateNotificationDTO, @Res() res: Response) {
    const result = await this.service.update(id, dto);
    return res.status(200).json(result);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete notification draft (super_admin)' })
  @ApiNoContentResponse({ description: 'Notification deleted' })
  async delete(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    await this.service.delete(id);
    return res.status(204).send();
  }
}
```

`src/modules/reserve-notifications/infrastructure/controllers/notification-tenant.controller.ts` — arquivo completo:

```ts
import { Controller, Get, Param, Post, Query, Res, UseGuards, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { CurrentAdmin, CurrentAdminPayload } from '../../../../shared/auth/decorators/current-admin.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationTenantService } from '../../application/services/notification-tenant.service';
import {
  OkResponseDto,
  PaginatedTenantNotificationsResponseDto,
  UnreadCountResponseDto,
} from '../../application/dtos/notification-response.dto';

@ApiTags('Notifications (tenant admin)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('notifications/tenant')
export class NotificationTenantController {
  constructor(private readonly service: NotificationTenantService) {}

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current admin' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  async unreadCount(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Headers('x-tenant-id') tenantId: string,
    @Res() res: Response,
  ) {
    const count = await this.service.getUnreadCount(tenantId, admin.admin_id);
    return res.status(200).json({ count });
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for tenant admin inbox' })
  @ApiOkResponse({ type: PaginatedTenantNotificationsResponseDto })
  async list(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Res() res: Response,
  ) {
    const result = await this.service.listForTenant(tenantId, admin.admin_id, Number(page), Number(limit));
    return res.status(200).json(result);
  }

  @Post('/:id/view')
  @ApiOperation({ summary: 'Mark notification as viewed' })
  @ApiOkResponse({ type: OkResponseDto })
  async markViewed(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Headers('x-tenant-id') tenantId: string,
    @Res() res: Response,
  ) {
    await this.service.markAsViewed(id, tenantId, admin.admin_id);
    return res.status(200).json({ ok: true });
  }
}
```

`src/modules/reserve-notifications/infrastructure/controllers/notification-settings.controller.ts` — arquivo completo:

```ts
import { Body, Controller, Get, Param, Patch, Res, UseGuards, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { NotificationSettingsService } from '../../application/services/notification-settings.service';
import { UpdateNotificationSettingsDTO } from '../../application/dtos';
import { NotificationSettingsResponseDto } from '../../application/dtos/notification-response.dto';

@ApiTags('Notification Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('notifications/settings')
export class NotificationSettingsController {
  constructor(private readonly service: NotificationSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get own tenant notification settings' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  async getOwn(@Headers('x-tenant-id') tenantId: string, @Res() res: Response) {
    const result = await this.service.getSettings(tenantId);
    return res.status(200).json(result);
  }

  @Patch()
  @ApiOperation({ summary: 'Update own tenant notification settings' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  async updateOwn(@Headers('x-tenant-id') tenantId: string, @Body() dto: UpdateNotificationSettingsDTO, @Res() res: Response) {
    const result = await this.service.updateSettings(tenantId, dto);
    return res.status(200).json(result);
  }

  @Get('/:tenantId')
  @Roles(EAdminRole.super_admin)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get any tenant notification settings (super_admin)' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  async getForTenant(@Param('tenantId', ParseCuidPipe) tenantId: string, @Res() res: Response) {
    const result = await this.service.getSettings(tenantId);
    return res.status(200).json(result);
  }

  @Patch('/:tenantId')
  @Roles(EAdminRole.super_admin)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update any tenant notification settings (super_admin)' })
  @ApiOkResponse({ type: NotificationSettingsResponseDto })
  async updateForTenant(@Param('tenantId', ParseCuidPipe) tenantId: string, @Body() dto: UpdateNotificationSettingsDTO, @Res() res: Response) {
    const result = await this.service.updateSettings(tenantId, dto);
    return res.status(200).json(result);
  }
}
```

`src/shared/swagger/untyped-response-allowlist.ts`:

```ts
/**
 * Controllers whose success responses are not yet typed in the OpenAPI
 * document. Every entry here is dividend, not a TODO: the codegen (Fase 4)
 * gets `any` for these until they are typed and removed from this list.
 *
 * RULE: this list only shrinks. Adding a new controller with an untyped
 * response is not allowed — type it before merging. Removing an entry means
 * that controller now has at least one @Api(Ok|Created)Response with a
 * concrete `type`/`schema` on every handler that returns JSON.
 *
 * reserve-notifications is deliberately ABSENT — it was the first module
 * fully typed by this phase (Task 21) and acts as the worked example.
 */
export const UNTYPED_RESPONSE_CONTROLLERS = [
  'app.controller.ts',
  'modules/reserve-auth/infrastructure/controllers/admin-email.controller.ts',
  'modules/reserve-auth/infrastructure/controllers/admin-post.controller.ts',
  'modules/reserve-b2b-payments/infrastructure/controllers/b2b-payments.controller.ts',
  'modules/reserve-b2b-payments/infrastructure/controllers/b2b-webhook.controller.ts',
  'modules/reserve-b2c-products/infrastructure/controllers/admin-fee-config.controller.ts',
  'modules/reserve-b2c-subscriptions/infrastructure/controllers/b2c-stripe-webhook.controller.ts',
  'modules/reserve-b2c-subscriptions/infrastructure/controllers/b2c-subscriptions.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/admin-hotel-client.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/admin-hotel-metrics.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/admin-reservations.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/booking-webhook.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/client-portal.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/guest-crm.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/report.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/whatsapp.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/whatsapp-redirect.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/whatsapp-tracking.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/article.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/article-image.controller.ts',
  'modules/reserve-coupons/infrastructure/controllers/public-coupons.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/admin-appointment.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/admin-appointment-schedule-config.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/lead.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/lead-capture.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/lead-collection.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/public-appointment.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/config.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/email-campaign.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/email-campaign-batch.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/event-notification.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/lead.controller.ts',
  'modules/reserve-reports/infrastructure/controllers/analytics-report.controller.ts',
  'modules/reserve-reports/infrastructure/controllers/public-analytics-report.controller.ts',
  'modules/reserve-subscriptions/infrastructure/controllers/stripe-webhook.controller.ts',
  'modules/reserve-subscriptions/infrastructure/controllers/subscriptions.controller.ts',
  'modules/reserve-unified-webhooks/infrastructure/controllers/unified-stripe-webhook.controller.ts',
] as const;
```

> Nota: a lista acima é o levantamento feito nesta fase (jul/2026); rode a suíte após o `git mv`/rename de qualquer controller para manter os caminhos exatos. Controllers webhook (`*-webhook.controller.ts`, `unified-stripe-webhook.controller.ts`) tendem a ficar na lista por mais tempo — devolvem o payload do provedor (Stripe), não um DTO próprio, e tipar 1:1 o schema de terceiro é trabalho de outra frente, não bloqueia o codegen do painel (o painel não consome resposta de webhook).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- untyped-response-allowlist.spec notification.controller notification-tenant.controller notification-settings.controller`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/reserve-notifications src/shared/swagger
git commit -m "feat(swagger): fully type reserve-notifications responses; add shrink-only allowlist gate"
```

---

## Encerramento da fase

- [ ] **Suíte completa:** `npm test` — 100% verde, incluindo as specs das 21 tasks acima.
- [ ] **Build:** `npm run build` — `prisma generate` + `nest build` sem erro.
- [ ] **Migrações aplicadas em sequência:** `20260726000001_add_tenant_type`, `20260726000002_add_tenant_domain`, `20260726000003_add_tenant_setting`, `20260726000004_add_tenant_type_module_policy` — todas via `prisma migrate dev`, nenhuma via `db push`.
- [ ] **Auditoria manual de domínios perdidos** (Task 2, query SQL) — 0 linhas.
- [ ] **Verificação manual de CORS sem `Origin`** (Task 4, `curl` contra `/api/webhooks/stripe`) — sem erro de CORS.
- [ ] **Cadeia de guards confirmada** em pelo menos um controller gateável real (ex.: `reserve-cms`): `AdminJwtGuard → TenantGuard → ModuleAccessGuard → PermissionsGuard`, com `@RequiresModule('cms')` na classe ou no handler.
- [ ] **`GET /api/tenant-capabilities`** devolve `tenantType`, `isMasterTenant` e `modules` (verificar manualmente contra um tenant `MASTER` e um `COMMON`).
- [ ] **`docs/RBAC-MATRIX.md`** (se já existe da Fase 2) regenerado para incluir as 5 permissões `settings.*` — rodar o script de geração da Fase 2, se houver; caso contrário, registrar como pendência textual no próprio documento.
- [ ] **Nenhum módulo não-gateable listado em `GATEABLE_MODULES`** — reconfirmar contra a tabela da Task 6 (`auth`, `settings`, `unified-webhooks` e as rotas públicas/webhook de qualquer módulo continuam fora).
- [ ] **Commit final da fase** (se não for feito task-a-task): `git log --oneline` mostra um commit por task, sem squash.

**Pré-requisito confirmado para a Fase 4:** o payload de `GET /api/tenant-capabilities` e as rotas de `reserve-settings` têm schema completo no documento OpenAPI servido em `/api/docs-json` — o `nextjs-openapi-codegen` da Fase 4 gera tipos concretos para esses dois consumidores críticos do painel, não `any`.







