# Fase 2 — Backend: RBAC por Permissão e Deny-by-Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a autorização por nome de papel (`@Roles`/`RolesGuard`) do `backend_reserve` por autorização por permissão (`recurso.ação`), com um `PermissionsGuard` como decisão final e um `SecurityPostureGuard` global que nega por padrão qualquer rota sem classificação explícita.

**Architecture:** Um catálogo único (`permission-matrix.ts`) declara toda permissão e a concessão cumulativa por papel (viewer ⊆ editor ⊆ manager ⊆ owner; `super_admin` sempre faz bypass). Três tabelas Prisma novas (`Permission`, `RolePermission`, `AdminPermissionOverride`) persistem esse catálogo e as exceções por admin/tenant. `PermissionsService` resolve permissões de um papel com cache `Map` (TTL 5 min); `PermissionOverridesService` lê overrides sempre fresco (sem cache — decisão de autorização não pode servir stale). `PermissionsGuard` combina os dois e substitui `RolesGuard` rota por rota, módulo por módulo, preservando o acesso efetivo 1:1. Em paralelo, `SecurityPostureGuard`, registrado como `APP_GUARD`, inverte a postura atual: hoje "rota sem guard = aberta"; depois de registrado, qualquer rota sem `@Public()` e sem nenhum `@UseGuards` vira 403 — com kill-switch `SECURITY_POSTURE_ENFORCE=false` para rodar em modo log-only primeiro.

**Tech Stack:** NestJS 11, Prisma 7 (`prisma migrate`, adaptador `@prisma/adapter-pg`), Jest com `*.spec.ts` colocado ao lado do arquivo (`rootDir: src`), `class-validator`/`class-transformer`, `@nestjs/swagger`.

## Global Constraints

- **Prisma do Reserve é snake_case** (`admin_id`, `tenant_id`, `permission_id`, `created_at`, `created_by`). Nunca camelCase. Todo código copiado da Zarp neste plano já vem adaptado — não copie literalmente arquivos da Zarp sem revisar nomes de campo.
- **Request populado em snake_case pelos guards existentes**: `AdminJwtGuard` grava `request.admin_id`; `TenantGuard` grava `request.tenant_id` e `request.admin_role`; `RolesGuard` também lê/grava `request.tenant_role`. O `PermissionsGuard` novo lê `request.admin_id` e `request.tenant_id` — **não** `request.adminId`/`request.tenantId` (que é como a Zarp nomeia, já normalizada para camelCase). `CurrentAdminPayload` (`src/shared/auth/decorators/current-admin.decorator.ts`) expõe os mesmos nomes: `admin_id`, `tenant_id`, `admin_role`, `tenant_role`.
- **Migrações, não `db push`.** Existe `prisma/migrations/` com 6 migrações e `migration_lock.toml` (provider `postgresql`). Toda mudança de schema é uma pasta nova com nome prefixado por timestamp (`npx prisma migrate dev --name <nome>`), nunca edição de migração já aplicada.
- **Prisma client**: importado como `PrismaService extends PrismaClient` em `src/shared/database/prisma.service.ts`, injetado via `DatabaseModule` (`@Global()`). Os serviços novos (`PermissionsService`, `PermissionOverridesService`) recebem `PrismaService` pelo construtor, como qualquer repositório existente.
- **Gerenciador de pacotes**: o repositório tem `package-lock.json` **e** `pnpm-lock.yaml`. A Fase 1 Task 1 já resolveu essa ambiguidade e fixou um único gerenciador com `packageManager` no `package.json` — confirme com `cat package.json | grep packageManager` antes da Task 1 deste plano; use o gerenciador ali fixado em todos os comandos (`npm`/`pnpm`). Os comandos abaixo assumem `npm`; troque por `pnpm` se for o caso.
- **Testes**: Jest, spec colocado ao lado do arquivo, `rootDir: src`, `testRegex: ".*\\.spec\\.ts$"`. Rodar com `npm test -- <padrão>`. Após cada task: `npm run build` (exit 0) e depois `npm test` (suíte inteira, 100% verde) antes do commit.
- **`EAdminRole` do Reserve** (`src/modules/reserve-auth/domain/enums/admin-role.enum.ts`) usa `super_admin`, `owner`, `manager`, `editor`, `viewer`, `company_admin` (snake_case nos *valores* do enum — diferente da Zarp, que usa `superAdmin`/`companyAdmin` em camelCase). Todo código deste plano usa `EAdminRole.super_admin` e `EAdminRole.company_admin`, nunca a grafia da Zarp.
- **`normalizeAdminRole`** já existe duas vezes no Reserve como função solta (`roles.guard.ts` e `admin.service.ts`), sempre mapeando `company_admin → manager`. O `permission-matrix.ts` novo exporta sua própria `normalizeAdminRole` (mesma lógica) — é a fonte única de verdade para o RBAC novo; as duas funções soltas existentes continuam servindo `RolesGuard`/`AdminService` até cada controller migrar (não são removidas neste plano).
- **A migração `@Roles` → `@RequirePermissions` preserva o acesso efetivo 1:1.** Onde uma rota tiver um papel inconsistente com as vizinhas (ex.: uma rota exigindo `super_admin` sozinho dentro de um controller cujas outras rotas aceitam `super_admin`+`manager`), o comportamento é preservado exatamente como está e a inconsistência é documentada abaixo — nunca "consertada" na mesma task. Duas anomalias reais foram encontradas e são tratadas nas Tasks 9 e 18:
  - `admin.controller.ts` (`reserve-auth`) — `GET /admin/:id/deletion-status` exige `super_admin` sozinho, enquanto as rotas irmãs de leitura (`GET /admin/list`, `GET /admin/:id`) aceitam `super_admin`+`manager`. Preservado com uma permissão dedicada de concessão zero (`admins.deletion-status.read`), em vez de reusar `admins.read` (que é concedida a `manager`).
  - `admin-hotel-client.controller.ts` e `report.controller.ts` (`reserve-client-portal`) — cada um tem uma rota (`DELETE :id` / `PATCH :id/publish`) restrita a um subconjunto menor de papéis do que o resto do controller. Preservado com um par de permissões por controller (`hotel-portal.clients.manage` + `hotel-portal.clients.deactivate`; `hotel-portal.reports.manage` + `hotel-portal.reports.publish`), o segundo membro do par com concessão mais estreita.
  - **Confirmado que NÃO é anomalia** (documentado para o registro): `stats-dashboard.controller.ts` tem `GET /dashboard/global` restrito a `super_admin` sem `TenantGuard`, enquanto as demais rotas do mesmo controller exigem `viewer`+`TenantGuard`. Isso é uma separação deliberada leitura-por-tenant vs. leitura-cross-tenant, idêntica ao padrão já usado pela Zarp (`metrics.dashboard.read` vs. `metrics.dashboard.global.read`) — mapeada 1:1, sem preservar nada de "estranho".
  - `notification-settings.controller.ts` (`reserve-notifications`) — `GET`/`PATCH` do próprio tenant não têm nenhuma checagem de papel hoje (só `AdminJwtGuard` na classe); `GET`/`PATCH /:tenantId` (cross-tenant) exigem `super_admin`. A Task 13 preserva isso: as rotas do próprio tenant **não** ganham `@RequirePermissions` (continuam abertas a qualquer admin autenticado, de qualquer papel, para o próprio tenant) — não é escopo deste plano apertar esse acesso.
- **Catálogo de permissões é enxuto, não uma cópia integral da Zarp.** A Zarp tem ~150 permissões cobrindo módulos que o Reserve não tem (`courses.*`, `automations.*`, `settings.*`, `marketing.*`, `billing.manage`/`stripe-plans.manage` genéricos). O `permission-matrix.ts` do Reserve declara **apenas** as permissões referenciadas por uma rota real hoje auditada neste plano — reaproveitando o nome exato da Zarp onde o recurso é o mesmo (`cms.*`, `leads.*`, `appointments.*`, `mailer.*`, `metrics.*`, `admins.*`, `tenants.*`, `users.*`, `billing-config.*`, `notifications.platform.manage`, `post.image-generation.manage`) e cunhando nomes novos só para os domínios exclusivos do Reserve (`hotel-portal.*`, `b2c-products.*`, `b2c-fees.*`, `analytics-reports.manage`, `admins.deletion-status.read`).
- **`ModuleAccessGuard` e `TenantPermissionPolicyService` são Fase 3, não existem aqui.** A cadeia de guards deste plano é `AdminJwtGuard → TenantGuard → PermissionsGuard` (substituindo `RolesGuard` no lugar exato onde ele estava) — nunca inclua `ModuleAccessGuard` nas tasks abaixo. `PermissionsGuard` resolve permissões efetivas via `PermissionsService` (papel) + `PermissionOverridesService`/`applyOverrides` (overrides por admin/tenant) diretamente, sem a camada intermediária `TenantPermissionPolicyService` que a Zarp adicionou depois — essa camada fica fora de escopo.
- **`AdminPermissionOverride` ganha o serviço de leitura nesta fase, não o endpoint de gestão.** O item 9 do escopo é `permission-overrides.service.ts` + `apply-overrides.ts` e sua integração no `PermissionsGuard`. Um endpoint `PUT /tenants/:tenantId/admins/:adminId/permission-overrides` para um super_admin gerenciar overrides (equivalente ao `SuperadminPermissionOverridesController` da Zarp) fica fora do escopo desta fase — sem essa rota, a tabela existe e o guard já sabe ler overrides, mas populá-la hoje só é possível via seed/SQL direto. Isso é uma decisão de escopo, registrada aqui, não uma pendência esquecida.
- **`GET /api/tenant-capabilities` desta fase é mais enxuto que o da Zarp.** A Zarp devolve `tenantType`, `isMasterTenant` e `modules` (resolução de `GATEABLE_MODULES`) além de `role`/`permissions` — tudo isso depende de `Tenant.tenantType` e `TenantSetting`, que só chegam na Fase 3. A Task 19 deste plano devolve **apenas** `{ tenantId, role, permissions }`. A Fase 3 estende o mesmo endpoint (não cria um novo).
- **`EPermissionEffect` existe no schema mas a coluna `effect` continua `String @db.VarChar(5)`.** Replicando fielmente o próprio schema da Zarp (que declara o enum mas nunca o usa como tipo de coluna): o enum é declarado por completude de catálogo e para uma futura UI de gestão, mas `AdminPermissionOverride.effect` guarda a string literal `'grant'` ou `'deny'` — é isso que `PermissionOverridesService`/`applyOverrides` de fato comparam.
- **Timestamp de migração**: a próxima migração deste plano usa `20260727000001_add_rbac_tables` (a última migração existente é `20260604000001_add_region_to_whatsapp_clicks`).
- Textos de erro voltados ao usuário em português quando o `ForbiddenException`/`NotFoundException` for user-facing; mensagens técnicas de guard/log podem ficar em inglês (é o padrão que a Zarp já usa e o Reserve segue no `RolesGuard`/`TenantGuard` atuais).
- Trabalhar no branch `fase2-rbac` criado a partir do branch atual. A Task 1 cria.
- Após cada task: `npm run build` passa, `npm test` 100% verde, commit.

---

### Task 1: Baseline — branch e os dois controllers ⚠️ sem guard

**Files:**
- Modify: `src/modules/reserve-auth/infrastructure/controllers/admin-email.controller.ts`
- Modify: `src/modules/reserve-mailer/infrastructure/controllers/email-campaign-batch.controller.ts`
- Test: nenhum spec novo — os dois controllers não têm rotas (ver decisão abaixo); a verificação é `npm run build` + inspeção manual do decorator.

**Interfaces:**
- Produces: branch `fase2-rbac`; os dois controllers marcados ⚠️ na análise (`docs/superpowers/specs/2026-07-26-porte-zarp-para-reserve-analise.md` §1.3) ganham `@UseGuards` de defesa em profundidade, usando o `RolesGuard`/`@Roles` **já existentes** (o `PermissionsGuard` novo só existe a partir da Task 5 — não espere por ele para fechar este achado).

**Decisão — `admin-email.controller.ts` (`reserve-auth`):**

O arquivo hoje é:

```ts
import { Controller } from '@nestjs/common';

@Controller('email')
export class EmailController {
    
}
```

Zero rotas — mas está registrado em `reserve-auth.module.ts` (`controllers: [..., EmailController, ...]`), então qualquer rota adicionada aqui no futuro nasceria sem guard por padrão (postura atual "sem guard = aberto"). É um controller administrativo (mora ao lado de `AdminPostController`, que é `@Roles(EAdminRole.super_admin)`). Decisão: aplicar o mesmo guard de defesa em profundidade agora, antes de qualquer rota existir, para que o `SecurityPostureGuard` da Task 6 já encontre a classe classificada e nenhuma rota futura precise lembrar de adicionar o guard.

**Decisão — `email-campaign-batch.controller.ts` (`reserve-mailer`):**

O arquivo hoje é:

```ts
import { Controller, Get } from "@nestjs/common";
import { EmailCampaignBatchService } from "../../application/services/email-campaign-batch.service";

@Controller()
export class EmailCampaignBatchController {
    public constructor(
        private readonly emailCampaignBatchService: EmailCampaignBatchService
    ) { }

  
}
```

Também zero rotas, e — diferente do `EmailController` — **não está registrado** em nenhum array `controllers: [...]` de módulo (`reserve-mailer.module.ts` só registra `EmailCampaignController, ConfigController, EventNotificationController`; `EmailCampaignBatchService` está nos `providers`, mas o controller nunca é montado). Ou seja: hoje ele não pode servir nenhuma requisição, classificado ou não — o Nest nunca o instancia como rota. Mesma decisão de defesa em profundidade: aplicar o guard agora, para que se alguém mais tarde adicionar o controller ao módulo (ação funcional separada, fora de escopo aqui) o guard já esteja presente e nenhuma rota nasça aberta.

- [ ] **Step 1: Criar o branch**

```bash
git checkout -b fase2-rbac
```

- [ ] **Step 2: Confirmar o estado inicial do build e da suíte**

Run: `npm run build && npm test`
Expected: build exit 0; suíte 100% verde. Se falhar, pare — corrigir build/testes quebrados não é escopo deste plano.

- [ ] **Step 3: Guardar `admin-email.controller.ts`**

```ts
import { Controller, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

// Achado de segurança 2026-07-26: controller administrativo sem nenhum guard.
// Hoje não tem rotas — o guard é aplicado por defesa em profundidade, para que
// qualquer rota futura nasça classificada em vez de aberta por omissão.
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin)
@Controller('email')
export class EmailController {

}
```

- [ ] **Step 4: Guardar `email-campaign-batch.controller.ts`**

```ts
import { Controller, UseGuards } from "@nestjs/common";
import { EmailCampaignBatchService } from "../../application/services/email-campaign-batch.service";
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { EAdminRole } from '../../../reserve-auth/domain/enums/admin-role.enum';

// Achado de segurança 2026-07-26: controller de disparo de lote sem nenhum guard.
// Hoje sem rotas E não registrado em nenhum módulo (reserve-mailer.module.ts não
// o lista em `controllers`) — não serve requisições. O guard é aplicado por
// defesa em profundidade: se o controller for registrado no futuro (mudança
// funcional separada, fora de escopo aqui), a rota já nasce classificada.
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(EAdminRole.super_admin)
@Controller()
export class EmailCampaignBatchController {
    public constructor(
        private readonly emailCampaignBatchService: EmailCampaignBatchService
    ) { }


}
```

- [ ] **Step 5: Build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0; suíte verde (nenhum teste referenciava esses dois controllers, então a contagem de testes não muda).

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-auth/infrastructure/controllers/admin-email.controller.ts src/modules/reserve-mailer/infrastructure/controllers/email-campaign-batch.controller.ts
git commit -m "fix: guardar admin-email.controller.ts e email-campaign-batch.controller.ts (achado de seguranca sem guard)"
```

---

### Task 2: Modelos Prisma — `Permission`, `RolePermission`, `AdminPermissionOverride`, `EPermissionEffect`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260727000001_add_rbac_tables/migration.sql`

**Interfaces:**
- Produces: modelos Prisma `Permission { id, name, created_at }`, `RolePermission { id, role: EAdminRole, permission_id, created_at }`, `AdminPermissionOverride { id, admin_id, tenant_id, permission_id, effect, created_by, created_at }`, enum `EPermissionEffect { allow deny }`. Client gerado expõe `prisma.permission`, `prisma.rolePermission`, `prisma.adminPermissionOverride` — usados pela Task 4 (`PermissionsService`), Task 8 (`PermissionOverridesService`) e Task 20 (seed).

- [ ] **Step 1: Adicionar os modelos ao `schema.prisma`**

Adicione logo após o modelo `AdminTenant` (linha 306, antes do comentário `// Blog`):

```prisma
enum EPermissionEffect {
  allow
  deny
}

// RBAC Fase 2 (2026-07-26): catálogo de permissões `recurso.ação`, fonte
// única de verdade em src/shared/auth/rbac/permission-matrix.ts.
model Permission {
  id                      String                    @id @default(cuid()) @db.VarChar(25)
  name                    String                    @unique @db.VarChar(100)
  created_at              DateTime                  @default(now())
  RolePermission          RolePermission[]
  AdminPermissionOverride AdminPermissionOverride[]

  @@map("permissions")
}

// Concessão papel → permissão. `role` é o EAdminRole global (não é
// per-tenant); PermissionsService faz cache desta tabela por 5 min.
model RolePermission {
  id            String     @id @default(cuid()) @db.VarChar(25)
  role          EAdminRole
  permission_id String     @db.VarChar(25)
  created_at    DateTime   @default(now())
  Permission    Permission @relation(fields: [permission_id], references: [id], onDelete: Cascade)

  @@unique([role, permission_id])
  @@index([role])
  @@map("role_permissions")
}

// Exceção allow/deny por admin dentro de um tenant, por cima do que o papel
// concede. effect guarda a string literal 'grant' ou 'deny' (não o enum
// EPermissionEffect — ver Global Constraints). deny sempre vence no read.
model AdminPermissionOverride {
  id            String     @id @default(cuid()) @db.VarChar(25)
  admin_id      String     @db.VarChar(25)
  tenant_id     String     @db.VarChar(25)
  permission_id String     @db.VarChar(25)
  effect        String     @db.VarChar(5)
  created_by    String     @db.VarChar(25)
  created_at    DateTime   @default(now())
  Admin         Admin      @relation(fields: [admin_id], references: [id], onDelete: Cascade)
  Tenant        Tenant     @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  Permission    Permission @relation(fields: [permission_id], references: [id], onDelete: Cascade)

  @@unique([admin_id, tenant_id, permission_id])
  @@index([admin_id, tenant_id])
  @@map("admin_permission_overrides")
}
```

- [ ] **Step 2: Adicionar as relações reversas em `Admin` e `Tenant`**

Em `model Admin` (linha 168), adicione ao final da lista de campos, antes do `}` (linha 189):

```prisma
  AdminPermissionOverride   AdminPermissionOverride[]
```

Em `model Tenant` (linha 191), adicione ao final da lista de campos, antes do `}` (linha ~230, onde estão as outras relações `AdminTenant[]` etc. — ao lado de `AdminTenant`):

```prisma
  AdminPermissionOverride   AdminPermissionOverride[]
```

- [ ] **Step 3: Gerar a migração**

```bash
npx prisma migrate dev --name add_rbac_tables
```

Isso cria `prisma/migrations/20260727000001_add_rbac_tables/migration.sql` (o timestamp real gerado pelo Prisma pode diferir do documentado acima — use o que o comando efetivamente criar) com o SQL equivalente a:

```sql
-- CreateEnum
CREATE TYPE "EPermissionEffect" AS ENUM ('allow', 'deny');

-- CreateTable
CREATE TABLE "permissions" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" VARCHAR(25) NOT NULL,
    "role" "EAdminRole" NOT NULL,
    "permission_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_permissions_role_idx" ON "role_permissions"("role");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role", "permission_id");

-- CreateTable
CREATE TABLE "admin_permission_overrides" (
    "id" VARCHAR(25) NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "permission_id" VARCHAR(25) NOT NULL,
    "effect" VARCHAR(5) NOT NULL,
    "created_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_permission_overrides_admin_id_tenant_id_idx" ON "admin_permission_overrides"("admin_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permission_overrides_admin_id_tenant_id_permission_i_key" ON "admin_permission_overrides"("admin_id", "tenant_id", "permission_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permission_overrides" ADD CONSTRAINT "admin_permission_overrides_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permission_overrides" ADD CONSTRAINT "admin_permission_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permission_overrides" ADD CONSTRAINT "admin_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Expected: comando termina sem erro, migração aplicada no banco de desenvolvimento, `src/generated/prisma/client` regenerado (via `postinstall`/`prisma generate` que o `migrate dev` dispara).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exit 0. `prisma.permission`, `prisma.rolePermission`, `prisma.adminPermissionOverride` agora existem no client gerado.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: modelos Prisma Permission, RolePermission, AdminPermissionOverride e enum EPermissionEffect"
```

---

### Task 3: `permission-matrix.ts` + spec — catálogo e concessão por papel

**Files:**
- Create: `src/shared/auth/rbac/permission-matrix.ts`
- Test: `src/shared/auth/rbac/permission-matrix.spec.ts`

**Interfaces:**
- Consumes: `EAdminRole` de `src/modules/reserve-auth/domain/enums/admin-role.enum.ts`.
- Produces: `PERMISSIONS` (`readonly string[]` com `as const`), `type PermissionName`, `ROLE_GRANTS: Partial<Record<EAdminRole, readonly PermissionName[]>>`, `normalizeAdminRole(role: EAdminRole): EAdminRole`. Consumido por: Task 4 (`PermissionsService`), Task 5 (`RequirePermissions`/`PermissionsGuard`), todas as Tasks 9–18 (migração por módulo), Task 20 (seed).

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/auth/rbac/permission-matrix.spec.ts
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { PERMISSIONS, ROLE_GRANTS, normalizeAdminRole } from './permission-matrix';

describe('permission-matrix', () => {
  it('every permission name follows the recurso.ação convention', () => {
    for (const name of PERMISSIONS) {
      expect(name).toMatch(/^[a-z][a-z-]*(\.[a-z][a-z-]*)+$/);
    }
  });

  it('has no duplicate permission names', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it('every grant references a declared permission', () => {
    for (const grants of Object.values(ROLE_GRANTS)) {
      for (const grant of grants!) {
        expect(PERMISSIONS).toContain(grant);
      }
    }
  });

  it('grants are cumulative up the hierarchy (viewer ⊆ editor ⊆ manager ⊆ owner)', () => {
    const chain = [EAdminRole.viewer, EAdminRole.editor, EAdminRole.manager, EAdminRole.owner];
    for (let i = 1; i < chain.length; i++) {
      const lower = new Set(ROLE_GRANTS[chain[i - 1]]);
      const higher = new Set(ROLE_GRANTS[chain[i]]);
      for (const grant of lower) {
        expect(higher.has(grant)).toBe(true);
      }
    }
  });

  it('does not define grants for super_admin (guard bypass) or company_admin (normalized)', () => {
    expect(ROLE_GRANTS[EAdminRole.super_admin]).toBeUndefined();
    expect(ROLE_GRANTS[EAdminRole.company_admin]).toBeUndefined();
  });

  it('normalizeAdminRole maps company_admin to manager and keeps others', () => {
    expect(normalizeAdminRole(EAdminRole.company_admin)).toBe(EAdminRole.manager);
    expect(normalizeAdminRole(EAdminRole.viewer)).toBe(EAdminRole.viewer);
    expect(normalizeAdminRole(EAdminRole.super_admin)).toBe(EAdminRole.super_admin);
  });

  it('zero-grant permissions (super_admin bypass only) have no role entries anywhere', () => {
    const zeroGrant = [
      'admins.deactivate', 'admins.activate', 'admins.delete', 'admins.deletion-status.read',
      'users.update', 'users.deactivate', 'users.delete',
      'tenants.create', 'tenants.read', 'tenants.update', 'tenants.admin.assign',
      'tenants.admin.remove', 'tenants.admin.read', 'tenants.deactivate', 'tenants.activate',
      'tenants.delete', 'tenants.admin.role.update',
      'post.image-generation.manage',
      'mailer.smtp-config.manage', 'mailer.smtp-config.read',
      'notifications.platform.manage',
      'analytics-reports.manage',
      'metrics.dashboard.global.read',
      'hotel-portal.clients.deactivate',
    ];
    for (const permission of zeroGrant) {
      expect(PERMISSIONS).toContain(permission as any);
      for (const role of [EAdminRole.viewer, EAdminRole.editor, EAdminRole.manager, EAdminRole.owner]) {
        expect(ROLE_GRANTS[role]).not.toContain(permission as any);
      }
    }
  });

  it('grants admins.create/read/role.update/update at manager, but deactivate/activate/delete stay zero-grant', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.create');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.role.update');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.update');
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toContain('admins.create');
  });

  it('preserves the deletion-status anomaly: narrower than the sibling admins.read grant', () => {
    expect(PERMISSIONS).toContain('admins.deletion-status.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('admins.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).not.toContain('admins.deletion-status.read');
  });

  it('preserves the hotel-portal.clients anomaly: manage is broader than deactivate', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('hotel-portal.clients.manage');
    expect(ROLE_GRANTS[EAdminRole.manager]).not.toContain('hotel-portal.clients.deactivate');
    expect(ROLE_GRANTS[EAdminRole.owner]).not.toContain('hotel-portal.clients.deactivate');
  });

  it('preserves the hotel-portal.reports anomaly: publish requires owner, manage requires only manager', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('hotel-portal.reports.manage');
    expect(ROLE_GRANTS[EAdminRole.manager]).not.toContain('hotel-portal.reports.publish');
    expect(ROLE_GRANTS[EAdminRole.owner]).toContain('hotel-portal.reports.publish');
  });

  it('grants cms.article.create at editor, cms.blog.create at manager, cms.blog.manage-key at owner', () => {
    expect(ROLE_GRANTS[EAdminRole.editor]).toContain('cms.article.create');
    expect(ROLE_GRANTS[EAdminRole.viewer]).not.toContain('cms.article.create');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('cms.blog.create');
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toContain('cms.blog.create');
    expect(ROLE_GRANTS[EAdminRole.owner]).toContain('cms.blog.manage-key');
    expect(ROLE_GRANTS[EAdminRole.manager]).not.toContain('cms.blog.manage-key');
  });

  it('grants leads.delete at manager, leads.update at editor', () => {
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('leads.delete');
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toContain('leads.delete');
    expect(ROLE_GRANTS[EAdminRole.editor]).toContain('leads.update');
    expect(ROLE_GRANTS[EAdminRole.viewer]).not.toContain('leads.update');
  });

  it('billing-config and b2c-fees follow the viewer-read/manager-manage split', () => {
    expect(ROLE_GRANTS[EAdminRole.viewer]).toContain('billing-config.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('billing-config.manage');
    expect(ROLE_GRANTS[EAdminRole.editor]).not.toContain('billing-config.manage');
    expect(ROLE_GRANTS[EAdminRole.viewer]).toContain('b2c-fees.read');
    expect(ROLE_GRANTS[EAdminRole.manager]).toContain('b2c-fees.manage');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- permission-matrix`
Expected: FAIL com `Cannot find module './permission-matrix'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/auth/rbac/permission-matrix.ts
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
];

const OWNER: readonly PermissionName[] = [
  ...MANAGER,
  'cms.blog.manage-key',
  'hotel-portal.reports.publish',
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- permission-matrix`
Expected: PASS (todos os `it` verdes).

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/rbac/permission-matrix.ts src/shared/auth/rbac/permission-matrix.spec.ts
git commit -m "feat: permission-matrix.ts — catalogo RBAC e concessao cumulativa por papel"
```

---

### Task 4: `permissions.service.ts` + spec — cache de permissões por papel

**Files:**
- Create: `src/shared/auth/rbac/permissions.service.ts`
- Test: `src/shared/auth/rbac/permissions.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (`src/shared/database/prisma.service.ts`), `normalizeAdminRole` da Task 3, `prisma.rolePermission.findMany` (Task 2).
- Produces: `class PermissionsService { getPermissionsForRole(role: EAdminRole): Promise<ReadonlySet<string>>; invalidate(): void }`. Consumido por: Task 5 (`PermissionsGuard`), Task 19 (`GetTenantCapabilitiesUseCase`).

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/auth/rbac/permissions.service.spec.ts
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let findMany: jest.Mock;
  let service: PermissionsService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([
      { Permission: { name: 'leads.read' } },
      { Permission: { name: 'cms.article.read' } },
    ]);
    service = new PermissionsService({ rolePermission: { findMany } } as any);
  });

  it('returns the permission names for a role', async () => {
    const permissions = await service.getPermissionsForRole(EAdminRole.viewer);
    expect(permissions.has('leads.read')).toBe(true);
    expect(permissions.has('cms.article.read')).toBe(true);
    expect(permissions.has('leads.delete')).toBe(false);
  });

  it('queries by the requested role', async () => {
    await service.getPermissionsForRole(EAdminRole.manager);
    expect(findMany).toHaveBeenCalledWith({
      where: { role: EAdminRole.manager },
      select: { Permission: { select: { name: true } } },
    });
  });

  it('caches the set between calls for the same role', async () => {
    await service.getPermissionsForRole(EAdminRole.viewer);
    await service.getPermissionsForRole(EAdminRole.viewer);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('caches per role, not globally', async () => {
    await service.getPermissionsForRole(EAdminRole.viewer);
    await service.getPermissionsForRole(EAdminRole.manager);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('normalizes company_admin to manager before querying', async () => {
    await service.getPermissionsForRole(EAdminRole.company_admin);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: EAdminRole.manager } }),
    );
  });

  it('invalidate() forces a re-query on the next call', async () => {
    await service.getPermissionsForRole(EAdminRole.viewer);
    service.invalidate();
    await service.getPermissionsForRole(EAdminRole.viewer);
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- permissions.service`
Expected: FAIL com `Cannot find module './permissions.service'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/auth/rbac/permissions.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { normalizeAdminRole } from './permission-matrix';

const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Resolve o conjunto de permissões de um papel com cache em processo (Map no
 * singleton do Nest, sem Redis — TTL de 5 min). Todo escritor de
 * RolePermission (seed, futura UI de gestão) deve chamar invalidate(); o TTL
 * só cobre uma invalidação esquecida.
 */
@Injectable()
export class PermissionsService {
  private cache = new Map<EAdminRole, { permissions: ReadonlySet<string>; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async getPermissionsForRole(role: EAdminRole): Promise<ReadonlySet<string>> {
    const normalized = normalizeAdminRole(role);
    const hit = this.cache.get(normalized);
    if (hit && Date.now() < hit.expiresAt) return hit.permissions;

    const rows = await this.prisma.rolePermission.findMany({
      where: { role: normalized },
      select: { Permission: { select: { name: true } } },
    });
    const permissions: ReadonlySet<string> = new Set(rows.map((row) => row.Permission.name));
    this.cache.set(normalized, { permissions, expiresAt: Date.now() + PERMISSIONS_CACHE_TTL_MS });
    return permissions;
  }

  /** Chamar depois de qualquer escrita em Permission/RolePermission. */
  invalidate(): void {
    this.cache.clear();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- permissions.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/rbac/permissions.service.ts src/shared/auth/rbac/permissions.service.spec.ts
git commit -m "feat: PermissionsService com cache Map TTL 5min por papel"
```

---

### Task 5: `permission-overrides.service.ts` + `apply-overrides.ts` — overrides por admin/tenant

**Files:**
- Create: `src/shared/auth/rbac/apply-overrides.ts`
- Create: `src/shared/auth/rbac/permission-overrides.service.ts`
- Test: `src/shared/auth/rbac/apply-overrides.spec.ts`
- Test: `src/shared/auth/rbac/permission-overrides.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (`src/shared/database/prisma.service.ts`), `prisma.adminPermissionOverride.findMany` (Task 2).
- Produces: `interface AdminOverrides { grants: ReadonlySet<string>; denies: ReadonlySet<string> }`; `function applyOverrides(held: ReadonlySet<string>, overrides: AdminOverrides): Set<string>`; `class PermissionOverridesService { getForAdmin(adminId: string, tenantId: string): Promise<AdminOverrides> }`. Consumido pela Task 6 (`PermissionsGuard`).
- **Decisão de escopo (ver Global Constraints):** só o serviço de leitura é entregue nesta fase. Não há endpoint para popular `AdminPermissionOverride` — a tabela existe e o guard já sabe ler, mas hoje só é alimentável via seed/SQL direto. Sem overrides gravados, `getForAdmin` sempre devolve `{ grants: new Set(), denies: new Set() }`, o que é um no-op seguro (equivalente a não ter overrides).

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/auth/rbac/apply-overrides.spec.ts
import { applyOverrides } from './apply-overrides';

describe('applyOverrides', () => {
  it('adds grants, removes denies, deny wins', () => {
    const held = new Set(['leads.read', 'leads.update']);
    const result = applyOverrides(held, {
      grants: new Set(['billing-config.manage', 'leads.update']),
      denies: new Set(['leads.update']),
    });
    expect(result).toEqual(new Set(['leads.read', 'billing-config.manage']));
  });

  it('no overrides → same set', () => {
    expect(applyOverrides(new Set(['x']), { grants: new Set(), denies: new Set() })).toEqual(new Set(['x']));
  });
});
```

```ts
// src/shared/auth/rbac/permission-overrides.service.spec.ts
import { PermissionOverridesService } from './permission-overrides.service';

describe('PermissionOverridesService', () => {
  const rows = [
    { effect: 'grant', Permission: { name: 'billing-config.manage' } },
    { effect: 'deny', Permission: { name: 'leads.delete' } },
  ];
  let findMany: jest.Mock;
  let service: PermissionOverridesService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue(rows);
    service = new PermissionOverridesService({ adminPermissionOverride: { findMany } } as any);
  });

  it('splits rows into grants and denies', async () => {
    const result = await service.getForAdmin('adm1', 'ten1');
    expect([...result.grants]).toEqual(['billing-config.manage']);
    expect([...result.denies]).toEqual(['leads.delete']);
  });

  it('queries by admin_id and tenant_id (snake_case)', async () => {
    await service.getForAdmin('adm1', 'ten1');
    expect(findMany).toHaveBeenCalledWith({
      where: { admin_id: 'adm1', tenant_id: 'ten1' },
      select: { effect: true, Permission: { select: { name: true } } },
    });
  });

  it('reads the database on every call — no caching', async () => {
    await service.getForAdmin('adm1', 'ten1');
    await service.getForAdmin('adm1', 'ten1');
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apply-overrides permission-overrides.service`
Expected: FAIL com `Cannot find module './apply-overrides'` e `Cannot find module './permission-overrides.service'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/auth/rbac/apply-overrides.ts
export interface AdminOverrides {
  grants: ReadonlySet<string>;
  denies: ReadonlySet<string>;
}

/** (held ∪ grants) ∖ denies — deny sempre vence no read. */
export function applyOverrides(held: ReadonlySet<string>, overrides: AdminOverrides): Set<string> {
  const effective = new Set([...held, ...overrides.grants]);
  for (const denied of overrides.denies) effective.delete(denied);
  return effective;
}
```

```ts
// src/shared/auth/rbac/permission-overrides.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdminOverrides } from './apply-overrides';

/**
 * Lê AdminPermissionOverride sempre fresco (2026-07-26: um cache com TTL por
 * instância deixaria uma escrita em uma instância servir grants/denies
 * obsoletos em outra — inaceitável para uma decisão de autorização).
 * `effect` é a string literal 'grant' ou 'deny' (ver Global Constraints
 * sobre EPermissionEffect não ser o tipo real da coluna).
 */
@Injectable()
export class PermissionOverridesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForAdmin(adminId: string, tenantId: string): Promise<AdminOverrides> {
    const rows = await this.prisma.adminPermissionOverride.findMany({
      where: { admin_id: adminId, tenant_id: tenantId },
      select: { effect: true, Permission: { select: { name: true } } },
    });
    const grants = new Set<string>();
    const denies = new Set<string>();
    for (const row of rows) (row.effect === 'deny' ? denies : grants).add(row.Permission.name);
    return { grants, denies };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apply-overrides permission-overrides.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/rbac/apply-overrides.ts src/shared/auth/rbac/apply-overrides.spec.ts src/shared/auth/rbac/permission-overrides.service.ts src/shared/auth/rbac/permission-overrides.service.spec.ts
git commit -m "feat: PermissionOverridesService + applyOverrides (allow/deny por admin/tenant)"
```

---

### Task 6: `@RequirePermissions` + `PermissionsGuard` — decisão de autorização

**Files:**
- Create: `src/shared/auth/decorators/require-permissions.decorator.ts`
- Create: `src/shared/auth/guards/permissions.guard.ts`
- Modify: `src/shared/auth/decorators/index.ts`
- Modify: `src/shared/auth/guards/index.ts`
- Test: `src/shared/auth/guards/permissions.guard.spec.ts`

**Interfaces:**
- Consumes: `PERMISSIONS`, `PermissionName`, `normalizeAdminRole` (Task 3); `PermissionsService` (Task 4); `PermissionOverridesService`, `applyOverrides` (Task 5); `ADMIN_REPOSITORY`/`IAdminRepository` e `ADMIN_TENANT_REPOSITORY`/`IAdminTenantRepository` (`src/modules/reserve-auth/domain/interfaces`); `request.admin_id`/`request.tenant_id` populados por `AdminJwtGuard`/`TenantGuard`.
- Produces: `REQUIRE_PERMISSIONS_KEY`, `function RequirePermissions(...permissions: PermissionName[])`; `class PermissionsGuard implements CanActivate`. Usado por todas as Tasks 9–18 no lugar de `Roles`/`RolesGuard`, e pela Task 19 (`tenant-capabilities`).

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/auth/guards/permissions.guard.spec.ts
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { PermissionsGuard } from './permissions.guard';

function makeContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('PermissionsGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let adminRepository: { selectById: jest.Mock };
  let adminTenantRepository: { findRoleInTenant: jest.Mock };
  let permissionsService: { getPermissionsForRole: jest.Mock };
  let permissionOverridesService: { getForAdmin: jest.Mock };
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(['leads.delete']) };
    adminRepository = {
      selectById: jest.fn().mockResolvedValue({ id: 'admin-1', role: EAdminRole.manager, active: true }),
    };
    adminTenantRepository = { findRoleInTenant: jest.fn().mockResolvedValue(EAdminRole.manager) };
    permissionsService = {
      getPermissionsForRole: jest.fn().mockResolvedValue(new Set(['leads.delete'])),
    };
    permissionOverridesService = {
      getForAdmin: jest.fn().mockResolvedValue({ grants: new Set(), denies: new Set() }),
    };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      adminRepository as any,
      adminTenantRepository as any,
      permissionsService as any,
      permissionOverridesService as any,
    );
  });

  it('passes when no permissions are required on the route', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).resolves.toBe(true);
  });

  it('passes OPTIONS preflight without checks', async () => {
    await expect(guard.canActivate(makeContext({ method: 'OPTIONS' }))).resolves.toBe(true);
  });

  it('denies when admin identity is missing (AdminJwtGuard did not run)', async () => {
    await expect(guard.canActivate(makeContext({}))).rejects.toThrow(ForbiddenException);
  });

  it('denies an inactive admin', async () => {
    adminRepository.selectById.mockResolvedValue({ id: 'admin-1', role: EAdminRole.manager, active: false });
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).rejects.toThrow(ForbiddenException);
  });

  it('super_admin bypasses the permission check', async () => {
    adminRepository.selectById.mockResolvedValue({ id: 'admin-1', role: EAdminRole.super_admin, active: true });
    permissionsService.getPermissionsForRole.mockResolvedValue(new Set());
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).resolves.toBe(true);
    expect(permissionsService.getPermissionsForRole).not.toHaveBeenCalled();
  });

  it('uses the per-tenant role when request.tenant_id is present', async () => {
    adminTenantRepository.findRoleInTenant.mockResolvedValue(EAdminRole.viewer);
    permissionsService.getPermissionsForRole.mockResolvedValue(new Set(['leads.read']));
    await expect(
      guard.canActivate(makeContext({ admin_id: 'admin-1', tenant_id: 'tenant-1' })),
    ).rejects.toThrow(ForbiddenException);
    expect(permissionsService.getPermissionsForRole).toHaveBeenCalledWith(EAdminRole.viewer);
  });

  it('denies when the admin has no role in the tenant', async () => {
    adminTenantRepository.findRoleInTenant.mockResolvedValue(null);
    await expect(
      guard.canActivate(makeContext({ admin_id: 'admin-1', tenant_id: 'tenant-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('falls back to the global role without tenant_id', async () => {
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).resolves.toBe(true);
    expect(permissionsService.getPermissionsForRole).toHaveBeenCalledWith(EAdminRole.manager);
    expect(adminTenantRepository.findRoleInTenant).not.toHaveBeenCalled();
  });

  it('requires ALL listed permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(['leads.delete', 'leads.update']);
    permissionsService.getPermissionsForRole.mockResolvedValue(new Set(['leads.delete']));
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).rejects.toThrow(ForbiddenException);
  });

  it('grant override allows a permission the role lacks', async () => {
    reflector.getAllAndOverride.mockReturnValue(['billing-config.manage']);
    permissionsService.getPermissionsForRole.mockResolvedValue(new Set());
    permissionOverridesService.getForAdmin.mockResolvedValue({
      grants: new Set(['billing-config.manage']),
      denies: new Set(),
    });
    await expect(
      guard.canActivate(makeContext({ admin_id: 'admin-1', tenant_id: 'tenant-1' })),
    ).resolves.toBe(true);
  });

  it('deny override blocks a permission the role holds', async () => {
    reflector.getAllAndOverride.mockReturnValue(['leads.delete']);
    permissionOverridesService.getForAdmin.mockResolvedValue({
      grants: new Set(),
      denies: new Set(['leads.delete']),
    });
    await expect(
      guard.canActivate(makeContext({ admin_id: 'admin-1', tenant_id: 'tenant-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('overrides are skipped when no tenant is resolved', async () => {
    await expect(guard.canActivate(makeContext({ admin_id: 'admin-1' }))).resolves.toBe(true);
    expect(permissionOverridesService.getForAdmin).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- permissions.guard`
Expected: FAIL com `Cannot find module './permissions.guard'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/auth/decorators/require-permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS, PermissionName } from '../rbac/permission-matrix';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

/**
 * Restringe uma rota a admins cujo papel efetivo detenha TODAS as
 * permissões listadas. Usar com PermissionsGuard como o ÚLTIMO guard da
 * cadeia (depois de AdminJwtGuard e TenantGuard, se houver):
 * @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 */
export function RequirePermissions(...permissions: PermissionName[]) {
  // Decorators rodam no carregamento da classe: um typo derruba o boot, não uma requisição.
  if (permissions.length === 0) {
    throw new Error('@RequirePermissions precisa de ao menos uma permissão');
  }
  for (const permission of permissions) {
    if (!(PERMISSIONS as readonly string[]).includes(permission)) {
      throw new Error(
        `@RequirePermissions('${permission}') não está declarada — ver shared/auth/rbac/permission-matrix.ts`,
      );
    }
  }
  return SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
}
```

```ts
// src/shared/auth/guards/permissions.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { EAdminRole } from '../../../modules/reserve-auth/domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY, IAdminRepository } from '../../../modules/reserve-auth/domain/interfaces';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../../modules/reserve-auth/domain/interfaces/admin-tenant.repository.interface';
import { PermissionsService } from '../rbac/permissions.service';
import { PermissionOverridesService } from '../rbac/permission-overrides.service';
import { applyOverrides } from '../rbac/apply-overrides';
import { normalizeAdminRole } from '../rbac/permission-matrix';

/**
 * Camada de decisão por permissão. O código nunca pergunta "qual é o papel?"
 * — pergunta "esse admin pode fazer essa ação?". Papéis só agrupam permissões.
 *
 * Deve rodar POR ÚLTIMO na cadeia, para que request.admin_id (AdminJwtGuard)
 * e request.tenant_id (TenantGuard) já estejam populados:
 * @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 * @RequirePermissions('leads.delete')
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_TENANT_REPOSITORY)
    private readonly adminTenantRepository: IAdminTenantRepository,
    private readonly permissionsService: PermissionsService,
    @Optional()
    private readonly permissionOverridesService?: PermissionOverridesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.method === 'OPTIONS') {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const adminId: string = request.admin_id;
    if (!adminId) {
      throw new ForbiddenException('Admin identity not found in request');
    }

    const admin = await this.adminRepository.selectById(adminId);
    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    if (admin.role === EAdminRole.super_admin) {
      return true;
    }

    let effectiveRole = normalizeAdminRole(admin.role as EAdminRole);
    const tenantId: string | undefined = request.tenant_id;
    if (tenantId) {
      const tenantRole = await this.adminTenantRepository.findRoleInTenant(adminId, tenantId);
      if (!tenantRole) {
        throw new ForbiddenException('You do not have a role in this tenant');
      }
      effectiveRole = normalizeAdminRole(tenantRole);
    }

    const held = await this.permissionsService.getPermissionsForRole(effectiveRole);
    let effective: ReadonlySet<string> = held;

    if (tenantId && this.permissionOverridesService) {
      const overrides = await this.permissionOverridesService.getForAdmin(adminId, tenantId);
      effective = applyOverrides(held, overrides);
    }

    const missing = required.find((permission) => !effective.has(permission));
    if (missing) {
      throw new ForbiddenException(`Missing required permission: ${missing}`);
    }

    return true;
  }
}
```

- [ ] **Step 4: Atualizar os barrels**

Em `src/shared/auth/decorators/index.ts`, adicione:

```ts
export * from './require-permissions.decorator';
```

Em `src/shared/auth/guards/index.ts`, adicione:

```ts
export * from './permissions.guard';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- permissions.guard`
Expected: PASS.

- [ ] **Step 6: Registrar `PermissionsGuard` e as três dependências RBAC no DI**

`PermissionsGuard` precisa que `PermissionsService`, `PermissionOverridesService` e os tokens `ADMIN_REPOSITORY`/`ADMIN_TENANT_REPOSITORY` estejam disponíveis no mesmo escopo de injeção de todo módulo que o usa. Crie o módulo global agregador:

```ts
// src/shared/auth/rbac/rbac.module.ts
import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PermissionsService } from './permissions.service';
import { PermissionOverridesService } from './permission-overrides.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [PermissionsService, PermissionOverridesService],
  exports: [PermissionsService, PermissionOverridesService],
})
export class RbacModule {}
```

Registre em `src/app.module.ts`, junto aos módulos compartilhados globais:

```ts
import { RbacModule } from './shared/auth/rbac/rbac.module';
```

E no array `imports`, logo depois de `AuthModule,`:

```ts
    RbacModule,
```

Como `ADMIN_REPOSITORY`/`ADMIN_TENANT_REPOSITORY` já são exportados por `ReserveAuthModule` (confirmado em `src/modules/reserve-auth/reserve-auth.module.ts`), e todo módulo que hoje usa `RolesGuard` já importa `ReserveAuthModule`, `PermissionsGuard` resolve as duas dependências sem nenhuma mudança adicional nesses módulos.

Exporte também `PermissionsGuard` do barrel de guards existentes de `ReserveAuthModule`, para que as Tasks 9–18 possam importá-lo do mesmo lugar de onde importavam `RolesGuard`. Em `src/modules/reserve-auth/reserve-auth.module.ts`, adicione `PermissionsGuard` ao array `providers` e ao array `exports` (junto a `RolesGuard`, `TenantGuard` etc.):

```ts
import { PermissionsGuard } from '../../shared/auth/guards/permissions.guard';
```

```ts
    // ... dentro de providers, junto às outras DIP Guards
    PermissionsGuard,
```

```ts
    // ... dentro de exports, junto às outras guards
    PermissionsGuard,
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/shared/auth/decorators/require-permissions.decorator.ts src/shared/auth/guards/permissions.guard.ts src/shared/auth/guards/permissions.guard.spec.ts src/shared/auth/decorators/index.ts src/shared/auth/guards/index.ts src/shared/auth/rbac/rbac.module.ts src/app.module.ts src/modules/reserve-auth/reserve-auth.module.ts
git commit -m "feat: RequirePermissions + PermissionsGuard registrados via RbacModule global"
```

---

### Task 7: `@Public()` + `SecurityPostureGuard` — deny-by-default (log-only)

**Files:**
- Create: `src/shared/auth/decorators/public.decorator.ts`
- Create: `src/shared/auth/guards/security-posture.guard.ts`
- Modify: `src/shared/auth/decorators/index.ts`
- Modify: `src/shared/auth/guards/index.ts`
- Modify: `src/app.module.ts`
- Test: `src/shared/auth/guards/security-posture.guard.spec.ts`

**Interfaces:**
- Consumes: `@nestjs/core` `GUARDS_METADATA` (metadado interno que o `@UseGuards()` do Nest grava), `Reflector`.
- Produces: `IS_PUBLIC_KEY`, `function Public()`; `class SecurityPostureGuard implements CanActivate`, registrado como `APP_GUARD` em `app.module.ts`. Kill-switch via variável de ambiente `SECURITY_POSTURE_ENFORCE` — `'false'` roda em modo log-only (nunca 403, só loga); qualquer outro valor (inclusive ausente) enforce.
- **Ordem de entrega:** esta task registra o guard em modo **log-only por padrão** (`SECURITY_POSTURE_ENFORCE` não setado em nenhum `.env` ainda = enforce ligado por default no código, mas a Task 8 depende de rodar a auditoria ANTES de qualquer deploy com enforce ligado — ver nota na Task 8). Para não quebrar produção no meio deste plano, exporte `SECURITY_POSTURE_ENFORCE=false` no `.env` de cada ambiente já na Task 7 Step 5, e só remova essa variável (voltando ao enforce) na Task 21, depois que a Task 8 tiver classificado todas as rotas.

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/auth/guards/security-posture.guard.spec.ts
import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SecurityPostureGuard } from './security-posture.guard';
import { Public } from '../decorators/public.decorator';

class AlwaysAllowGuard {
  canActivate() {
    return true;
  }
}

@Controller('posture')
class PostureController {
  @Get('bare')
  bare() {
    return { ok: true };
  }

  @Get('public')
  @Public()
  publicRoute() {
    return { ok: true };
  }

  @Get('guarded')
  @UseGuards(AlwaysAllowGuard)
  guarded() {
    return { ok: true };
  }
}

@Public()
@Controller('posture-public-class')
class PublicClassController {
  @Get()
  ok() {
    return { ok: true };
  }
}

@UseGuards(AlwaysAllowGuard)
@Controller('posture-guarded-class')
class GuardedClassController {
  @Get()
  ok() {
    return { ok: true };
  }
}

describe('SecurityPostureGuard (deny-by-default)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PostureController, PublicClassController, GuardedClassController],
      providers: [{ provide: APP_GUARD, useClass: SecurityPostureGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('403s a route with neither guards nor @Public', async () => {
    await request(app.getHttpServer()).get('/posture/bare').expect(403);
  });

  it('allows an @Public handler', async () => {
    await request(app.getHttpServer()).get('/posture/public').expect(200);
  });

  it('allows a handler with its own @UseGuards', async () => {
    await request(app.getHttpServer()).get('/posture/guarded').expect(200);
  });

  it('allows @Public at class level', async () => {
    await request(app.getHttpServer()).get('/posture-public-class').expect(200);
  });

  it('allows @UseGuards at class level', async () => {
    await request(app.getHttpServer()).get('/posture-guarded-class').expect(200);
  });

  it('allows an unclassified route through (log-only) when SECURITY_POSTURE_ENFORCE=false', async () => {
    const original = process.env.SECURITY_POSTURE_ENFORCE;
    process.env.SECURITY_POSTURE_ENFORCE = 'false';

    try {
      await request(app.getHttpServer()).get('/posture/bare').expect(200);
    } finally {
      if (original === undefined) delete process.env.SECURITY_POSTURE_ENFORCE;
      else process.env.SECURITY_POSTURE_ENFORCE = original;
    }
  });

  it('still 403s an unclassified route when SECURITY_POSTURE_ENFORCE is unset (default enforced)', async () => {
    delete process.env.SECURITY_POSTURE_ENFORCE;
    await request(app.getHttpServer()).get('/posture/bare').expect(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- security-posture.guard`
Expected: FAIL com `Cannot find module './security-posture.guard'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/**
 * Marca uma rota/controller como intencionalmente pública (postura
 * deny-by-default, Task 7 deste plano). Usar SÓ para rotas que precisam ser
 * alcançáveis sem nenhuma autenticação: webhooks (assinatura verificada),
 * catálogos públicos, pontos de entrada de auth (login/registro).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```ts
// src/shared/auth/guards/security-posture.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Postura deny-by-default: inverte "rota sem guard = aberta". Registrado
 * como APP_GUARD; deixa passar qualquer rota que já foi classificada
 * explicitamente — @Public() ou qualquer @UseGuards no handler/classe — e
 * 403 o resto. NÃO autentica nada sozinho: a checagem real continua na
 * cadeia de guards da própria rota.
 *
 * Kill-switch: SECURITY_POSTURE_ENFORCE=false roda em modo log-only (nunca
 * 403, só loga um warn) — usar durante a Task 8 (auditoria), até toda rota
 * estar classificada. Qualquer outro valor (inclusive variável ausente)
 * enforce normalmente.
 */
@Injectable()
export class SecurityPostureGuard implements CanActivate {
  private readonly logger = new Logger(SecurityPostureGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.method === 'OPTIONS') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const classGuards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, context.getClass()) ?? [];
    const handlerGuards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, context.getHandler()) ?? [];
    if (classGuards.length + handlerGuards.length > 0) {
      return true;
    }

    const enforced = process.env.SECURITY_POSTURE_ENFORCE !== 'false';

    this.logger.warn(
      `Unclassified route ${enforced ? 'denied' : 'detected (log-only, SECURITY_POSTURE_ENFORCE=false)'}: ${request.method} ${request.url} — add an auth guard or @Public()`,
    );

    if (!enforced) {
      return true;
    }

    throw new ForbiddenException('Route is not security-classified');
  }
}
```

- [ ] **Step 4: Atualizar os barrels**

Em `src/shared/auth/decorators/index.ts`, adicione:

```ts
export * from './public.decorator';
```

Em `src/shared/auth/guards/index.ts`, adicione:

```ts
export * from './security-posture.guard';
```

- [ ] **Step 5: Registrar como `APP_GUARD` em modo log-only**

Em `src/app.module.ts`, adicione ao topo:

```ts
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { SecurityPostureGuard } from './shared/auth/guards/security-posture.guard';
```

(a linha `import { RouterModule } from '@nestjs/core';` já existe — substitua-a pela versão acima)

No array `providers`, junto aos pipes existentes:

```ts
  providers: [
    ToLowercaseQueryParamsPipe,
    ToLowercaseBodyRequestPipe,
    { provide: APP_GUARD, useClass: SecurityPostureGuard },
  ],
```

No `.env` (e em todo ambiente de deploy, se houver), adicione **imediatamente**, antes de qualquer merge deste commit para produção:

```
SECURITY_POSTURE_ENFORCE=false
```

Isso mantém o guard ativo (logando toda rota não classificada) sem derrubar nenhum webhook em produção enquanto a Task 8 não classificar as 10 rotas restantes.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- security-posture.guard`
Expected: PASS.

- [ ] **Step 7: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0. A suíte completa pode expor falhas em testes e2e que fazem requisições HTTP reais contra controllers hoje sem guard (ver lista na Task 8) — se algum teste e2e existente quebrar aqui, é porque ele exercia uma rota que a Task 8 ainda vai classificar; confirme que `SECURITY_POSTURE_ENFORCE=false` está de fato setado no ambiente de teste (`.env.test` ou equivalente) antes de investigar further.

- [ ] **Step 8: Commit**

```bash
git add src/shared/auth/decorators/public.decorator.ts src/shared/auth/guards/security-posture.guard.ts src/shared/auth/guards/security-posture.guard.spec.ts src/shared/auth/decorators/index.ts src/shared/auth/guards/index.ts src/app.module.ts .env
git commit -m "feat: SecurityPostureGuard deny-by-default (log-only via SECURITY_POSTURE_ENFORCE=false)"
```

---

### Task 8: Auditoria deny-by-default — classificar as rotas sem guard

**Files:**
- Modify: `src/app.controller.ts`
- Modify: `src/modules/reserve-auth/infrastructure/controllers/admin.controller.ts`
- Modify: `src/modules/reserve-auth/infrastructure/controllers/user.controller.ts`
- Modify: `src/modules/reserve-b2b-payments/infrastructure/controllers/b2b-webhook.controller.ts`
- Modify: `src/modules/reserve-b2c-products/infrastructure/controllers/public-b2c-products.controller.ts`
- Modify: `src/modules/reserve-b2c-subscriptions/infrastructure/controllers/b2c-stripe-webhook.controller.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/booking-webhook.controller.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/whatsapp-redirect.controller.ts`
- Modify: `src/modules/reserve-coupons/infrastructure/controllers/public-coupons.controller.ts`
- Modify: `src/modules/reserve-leads/infrastructure/controllers/lead.controller.ts`
- Modify: `src/modules/reserve-reports/infrastructure/controllers/public-analytics-report.controller.ts`
- Modify: `src/modules/reserve-subscriptions/infrastructure/controllers/stripe-webhook.controller.ts`
- Modify: `src/modules/reserve-unified-webhooks/infrastructure/controllers/unified-stripe-webhook.controller.ts`

**Interfaces:**
- Consumes: `Public` (Task 7).
- Produces: nenhuma rota sem classificação — toda rota audita como `@Public()` (aberta de propósito) ou já tem `@UseGuards` (das 12 controllers originais da análise, 2 já foram fechados na Task 1; os 10 restantes ganham `@Public()` aqui).

> Esta auditoria foi rodada com um script que percorre todo `*.controller.ts` e lista toda rota (`@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`) sem `@UseGuards` no handler nem na classe. Resultado, controller por controller:

| Controller | Rota(s) | Classificação | Por quê |
|---|---|---|---|
| `src/app.controller.ts` | `GET /` | `@Public()` | health-check simples, sem dado sensível |
| `admin.controller.ts` (reserve-auth) | `POST /admin/authenticate` | `@Public()` | login — não pode exigir estar logado para logar |
| `user.controller.ts` (reserve-auth) | `POST /user/`, `POST /user/pre/create`, `POST /user/authenticate` | `@Public()` | cadastro e login de `User` (cliente final) — pontos de entrada |
| `b2b-webhook.controller.ts` | `POST /webhooks/b2b/stripe` | `@Public()` | webhook Stripe — **valida assinatura dentro do handler** (`stripe.webhooks.constructEvent`), não depende de guard |
| `public-b2c-products.controller.ts` | `GET /`, `GET /:slug`, `POST /:id/calculate-cost` | `@Public()` | catálogo de produtos B2C para visitantes, sem login |
| `b2c-stripe-webhook.controller.ts` | `POST /webhooks/b2c/stripe` | `@Public()` | webhook Stripe — mesma verificação de assinatura interna |
| `booking-webhook.controller.ts` | `POST /webhooks/booking-engine/:tenantId` | `@Public()` — **ressalva** | valida `x-webhook-secret` por header dentro do `reservationService.processWebhook(...)`, não por guard. Funciona, mas não é constant-time nem documentado como guard — fica registrado como dívida (não deste plano) trocar por comparação constante num guard dedicado |
| `whatsapp-redirect.controller.ts` | `GET /wa/:code` | `@Public()` | redirect de link rastreado — precisa funcionar sem sessão para qualquer visitante do WhatsApp |
| `public-coupons.controller.ts` | `GET /public/coupons/resolve`, `POST /public/coupons/validate` | `@Public()` | consulta pública de cupom, já com `@Throttle` próprio |
| `lead.controller.ts` (reserve-leads) | `POST /` | `@Public()` | captura de lead pelo formulário público do site — único endpoint público nesse controller, o resto já é `@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)` por rota |
| `public-analytics-report.controller.ts` | `GET /lookup` | `@Public()` | busca relatório por telefone — já é público por design (`@ApiTags('Analytics Reports - Public')`) |
| `stripe-webhook.controller.ts` | `POST /webhooks/stripe/:tenantId` | `@Public()` | webhook Stripe — verificação de assinatura interna |
| `unified-stripe-webhook.controller.ts` | `POST /webhooks/stripe` | `@Public()` | webhook Stripe unificado — verificação de assinatura interna |

- [ ] **Step 1: Aplicar `@Public()` nos 13 controllers acima**

Para cada arquivo da tabela, adicione o import e o decorator na rota (ou na classe, quando 100% das rotas do controller são públicas). Exemplo para `src/app.controller.ts`:

```ts
import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from './shared/auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('')
export class AppController {
    @Get('/')
    @Public()
    @ApiOperation({ summary: 'Health check da aplicação' })
    @ApiResponse({ status: 200, description: 'Aplicação funcionando corretamente' })
    async app(
        @Res() res: Response
    ) {
        return res.status(200).json({ ok: true });
    }
}
```

Repita o padrão (import de `Public` no caminho relativo correto para cada arquivo, decorator na classe se toda rota é pública, ou em cada handler se só parte é) para os outros 12 controllers da tabela, usando exatamente o caminho relativo de `src/shared/auth/decorators/public.decorator.ts` a partir de cada arquivo (ex.: de `src/modules/reserve-leads/infrastructure/controllers/lead.controller.ts` o import é `'../../../../shared/auth/decorators/public.decorator'`).

Para `lead.controller.ts`, que mistura uma rota pública com oito administrativas, o decorator vai só no handler `createLead`, não na classe:

```ts
  @Post('/')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create lead with optional attachments',
    description: 'Creates a new lead entry with optional file attachments. Public endpoint for lead capture.',
  })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createLead(@Body() dto: CreateLeadWithAttachmentsDto) {
    return this.createLeadWithAttachmentsUseCase.execute(dto);
  }
```

- [ ] **Step 2: Ligar o enforce localmente e verificar**

Com todas as 13 rotas classificadas, defina `SECURITY_POSTURE_ENFORCE=true` (ou remova a variável) só no seu `.env` local, suba a aplicação e confirme que cada uma delas responde sem 403:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:$PORT/api/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:$PORT/api/lookup?phone=5511999999999
```

Expected: nenhuma delas retorna 403. Reverta o `.env` local para `SECURITY_POSTURE_ENFORCE=false` em seguida — o enforce definitivo em produção só acontece na Task 21, depois que as Tasks 9–18 também tiverem rodado (elas não removem guard nenhum, mas rodar a troca de postura só depois de todo o resto migrado reduz a superfície de coisa nova acontecendo ao mesmo tempo).

- [ ] **Step 3: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 4: Commit**

```bash
git add src/app.controller.ts src/modules/reserve-auth/infrastructure/controllers/admin.controller.ts src/modules/reserve-auth/infrastructure/controllers/user.controller.ts src/modules/reserve-b2b-payments/infrastructure/controllers/b2b-webhook.controller.ts src/modules/reserve-b2c-products/infrastructure/controllers/public-b2c-products.controller.ts src/modules/reserve-b2c-subscriptions/infrastructure/controllers/b2c-stripe-webhook.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/booking-webhook.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/whatsapp-redirect.controller.ts src/modules/reserve-coupons/infrastructure/controllers/public-coupons.controller.ts src/modules/reserve-leads/infrastructure/controllers/lead.controller.ts src/modules/reserve-reports/infrastructure/controllers/public-analytics-report.controller.ts src/modules/reserve-subscriptions/infrastructure/controllers/stripe-webhook.controller.ts src/modules/reserve-unified-webhooks/infrastructure/controllers/unified-stripe-webhook.controller.ts
git commit -m "fix: classificar com @Public() as 13 rotas que a auditoria deny-by-default encontrou sem guard"
```

---

### Task 9: Migrar `reserve-auth` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-auth/infrastructure/controllers/admin.controller.ts`
- Modify: `src/modules/reserve-auth/infrastructure/controllers/admin-user.controller.ts`
- Modify: `src/modules/reserve-auth/infrastructure/controllers/tenant.controller.ts`
- Modify: `src/modules/reserve-auth/infrastructure/controllers/admin-post.controller.ts`
- Test: `src/modules/reserve-auth/infrastructure/controllers/admin-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: nenhum controller de `reserve-auth` usa `@Roles`/`RolesGuard` depois desta task (exceto `GET /admin/me`, `GET /tenants/my-tenants` e `POST /admin/authenticate`/rotas de `user.controller.ts`, que hoje não têm checagem de papel e continuam sem — ver anomalia documentada abaixo).

> **Anomalia preservada (ver Global Constraints):** `GET /admin/:id/deletion-status` em `admin.controller.ts` é `@Roles(EAdminRole.super_admin)` sozinho, enquanto `GET /admin/list` e `GET /admin/:id` (mesma classe) aceitam `super_admin`+`manager`. Reusar `admins.read` (concedida a `manager`) alargaria o acesso desta rota especificamente — por isso ela recebe a permissão dedicada `admins.deletion-status.read`, de concessão zero, preservando a restrição a `super_admin` exatamente como está.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-auth/infrastructure/controllers/admin-rbac-migration.spec.ts
import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminUserController } from './admin-user.controller';
import { TenantController } from './tenant.controller';
import { PostController } from './admin-post.controller';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';

const reflector = new Reflector();

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

function guardsOf(target: any, method?: string): unknown[] {
  const metaTarget = method ? target.prototype[method] : target;
  return Reflect.getMetadata(GUARDS_METADATA, metaTarget) ?? [];
}

describe('reserve-auth RBAC migration', () => {
  it('AdminController.register requires admins.create via PermissionsGuard', () => {
    expect(permissionsOf(AdminController, 'register')).toEqual(['admins.create']);
    expect(guardsOf(AdminController, 'register')).toContain(PermissionsGuard);
  });

  it('AdminController.listAll requires admins.read', () => {
    expect(permissionsOf(AdminController, 'listAll')).toEqual(['admins.read']);
  });

  it('AdminController.updateRole requires admins.role.update', () => {
    expect(permissionsOf(AdminController, 'updateRole')).toEqual(['admins.role.update']);
  });

  it('AdminController.deactivate requires admins.deactivate (zero-grant)', () => {
    expect(permissionsOf(AdminController, 'deactivate')).toEqual(['admins.deactivate']);
  });

  it('AdminController.activate requires admins.activate (zero-grant)', () => {
    expect(permissionsOf(AdminController, 'activate')).toEqual(['admins.activate']);
  });

  it('AdminController.getById requires admins.read', () => {
    expect(permissionsOf(AdminController, 'getById')).toEqual(['admins.read']);
  });

  it('AdminController.update requires admins.update', () => {
    expect(permissionsOf(AdminController, 'update')).toEqual(['admins.update']);
  });

  it('AdminController.remove requires admins.delete (zero-grant)', () => {
    expect(permissionsOf(AdminController, 'remove')).toEqual(['admins.delete']);
  });

  it('AdminController.restoreDeletion requires admins.delete (reused, consistent: also super_admin-only today)', () => {
    expect(permissionsOf(AdminController, 'restoreDeletion')).toEqual(['admins.delete']);
  });

  it('AdminController.deletionStatus requires the dedicated admins.deletion-status.read (anomaly preserved)', () => {
    expect(permissionsOf(AdminController, 'deletionStatus')).toEqual(['admins.deletion-status.read']);
  });

  it('AdminUserController list/getById require users.read', () => {
    expect(permissionsOf(AdminUserController, 'list')).toEqual(['users.read']);
    expect(permissionsOf(AdminUserController, 'getById')).toEqual(['users.read']);
  });

  it('AdminUserController update/deactivate/remove require zero-grant permissions', () => {
    expect(permissionsOf(AdminUserController, 'update')).toEqual(['users.update']);
    expect(permissionsOf(AdminUserController, 'deactivate')).toEqual(['users.deactivate']);
    expect(permissionsOf(AdminUserController, 'remove')).toEqual(['users.delete']);
  });

  it('TenantController create/list/getById/update require the matching zero-grant tenants.* permission', () => {
    expect(permissionsOf(TenantController, 'create')).toEqual(['tenants.create']);
    expect(permissionsOf(TenantController, 'list')).toEqual(['tenants.read']);
    expect(permissionsOf(TenantController, 'getById')).toEqual(['tenants.read']);
    expect(permissionsOf(TenantController, 'update')).toEqual(['tenants.update']);
  });

  it('TenantController assign/remove/listAdmins/roleUpdate require the matching tenants.admin.* permission', () => {
    expect(permissionsOf(TenantController, 'assign')).toEqual(['tenants.admin.assign']);
    expect(permissionsOf(TenantController, 'removeAdmin')).toEqual(['tenants.admin.remove']);
    expect(permissionsOf(TenantController, 'listAdmins')).toEqual(['tenants.admin.read']);
    expect(permissionsOf(TenantController, 'updateAdminRole')).toEqual(['tenants.admin.role.update']);
  });

  it('TenantController deactivate/activate/remove/restore require the matching zero-grant permission', () => {
    expect(permissionsOf(TenantController, 'deactivate')).toEqual(['tenants.deactivate']);
    expect(permissionsOf(TenantController, 'activate')).toEqual(['tenants.activate']);
    expect(permissionsOf(TenantController, 'remove')).toEqual(['tenants.delete']);
    expect(permissionsOf(TenantController, 'restore')).toEqual(['tenants.delete']);
  });

  it('PostController.generateImage requires post.image-generation.manage', () => {
    expect(permissionsOf(PostController, 'generateImage')).toEqual(['post.image-generation.manage']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- admin-rbac-migration`
Expected: FAIL — os métodos ainda têm `ROLES_KEY`/`RolesGuard`, não `REQUIRE_PERMISSIONS_KEY`/`PermissionsGuard`; `permissionsOf(...)` retorna `undefined` para todos.

> Os nomes exatos de método usados no teste (`register`, `listAll`, `updateRole`, `deactivate`, `activate`, `getById`, `update`, `remove`, `restoreDeletion`, `deletionStatus`, `list`, `create`, `assign`, `removeAdmin`, `listAdmins`, `updateAdminRole`, `restore`, `generateImage`) são os nomes reais dos métodos nos arquivos-fonte (confirme com `grep -n "async \|  [a-zA-Z]*(" <arquivo>` antes de rodar o Step 1 se o nome divergir do que está aqui).

- [ ] **Step 3: Write minimal implementation**

Em `admin.controller.ts`, troque o import:

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

E cada par `@Roles(...)`/`@UseGuards(...)`:

```diff
     @Post('/register')
-    @Roles(EAdminRole.super_admin, EAdminRole.manager)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.create')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Get('/list')
-    @Roles(EAdminRole.super_admin, EAdminRole.manager)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.read')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Patch('/:id/role')
-    @Roles(EAdminRole.super_admin, EAdminRole.manager)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.role.update')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Patch('/:id/deactivate')
-    @Roles(EAdminRole.super_admin)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.deactivate')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Patch('/:id/activate')
-    @Roles(EAdminRole.super_admin)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.activate')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Get('/:id')
-    @Roles(EAdminRole.super_admin, EAdminRole.manager)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.read')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Patch('/:id')
-    @Roles(EAdminRole.super_admin, EAdminRole.manager)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.update')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Delete('/:id')
-    @Roles(EAdminRole.super_admin)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.delete')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Post('/:id/restore-deletion')
-    @Roles(EAdminRole.super_admin)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.delete')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
     @Get('/:id/deletion-status')
-    @Roles(EAdminRole.super_admin)
-    @UseGuards(AdminJwtGuard, RolesGuard)
+    @RequirePermissions('admins.deletion-status.read')
+    @UseGuards(AdminJwtGuard, PermissionsGuard)
```

`GET /admin/me` (`@UseGuards(AdminJwtGuard)`, sem `@Roles`) e `POST /admin/authenticate` (já `@Public()` desde a Task 8) não mudam.

Em `admin-user.controller.ts`, mesma troca de import, e:

```diff
   @Get()
-  @Roles(EAdminRole.super_admin, EAdminRole.manager)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('users.read')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Get('/:id')
-  @Roles(EAdminRole.super_admin, EAdminRole.manager)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('users.read')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Patch('/:id')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('users.update')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Patch('/:id/deactivate')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('users.deactivate')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Delete('/:id')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('users.delete')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

Em `tenant.controller.ts`, mesma troca de import, e cada rota (todas hoje `@Roles(EAdminRole.super_admin)` sozinho, exceto `GET /my-tenants` que não muda):

```diff
   @Post('/')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.create')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Get('/')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.read')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Get('/:id')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.read')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Patch('/:id')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.update')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Post('/assign')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.admin.assign')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Delete('/:tenantId/admins/:adminId')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.admin.remove')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Get('/:tenantId/admins')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.admin.read')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Patch('/:id/deactivate')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.deactivate')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Patch('/:id/activate')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.activate')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Delete('/:id')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.delete')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Post('/:id/restore')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.delete')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Get('/:id/deletion-status')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.read')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

```diff
   @Patch('/:tenantId/admins/:adminId/role')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(AdminJwtGuard, RolesGuard)
+  @RequirePermissions('tenants.admin.role.update')
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
```

Em `admin-post.controller.ts` (guard e `@Roles` na classe, não por método):

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('post.image-generation.manage')
 @Controller('admin/post')
 export class PostController {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- admin-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde (`roles.guard.spec.ts` continua passando — `RolesGuard` não foi removido do repositório, só parou de ser usado por estes 4 controllers).

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-auth/infrastructure/controllers/admin.controller.ts src/modules/reserve-auth/infrastructure/controllers/admin-user.controller.ts src/modules/reserve-auth/infrastructure/controllers/tenant.controller.ts src/modules/reserve-auth/infrastructure/controllers/admin-post.controller.ts src/modules/reserve-auth/infrastructure/controllers/admin-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-auth de @Roles para @RequirePermissions"
```

---

### Task 10: Migrar `reserve-cms` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-cms/infrastructure/controllers/article.controller.ts`
- Modify: `src/modules/reserve-cms/infrastructure/controllers/article-image.controller.ts`
- Modify: `src/modules/reserve-cms/infrastructure/controllers/author.controller.ts`
- Modify: `src/modules/reserve-cms/infrastructure/controllers/blog.controller.ts`
- Modify: `src/modules/reserve-cms/infrastructure/controllers/media-asset.controller.ts`
- Modify: `src/modules/reserve-cms/infrastructure/controllers/media-collection.controller.ts`
- Modify: `src/modules/reserve-cms/infrastructure/controllers/media-relation.controller.ts`
- Test: `src/modules/reserve-cms/infrastructure/controllers/cms-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: nenhum controller de `reserve-cms` usa `@Roles`/`RolesGuard` depois desta task. Mapeamento 1:1 confirmado idêntico ao papel que cada rota já exige hoje (nenhuma anomalia neste módulo).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-cms/infrastructure/controllers/cms-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ArticleController } from './article.controller';
import { ArticleImageController } from './article-image.controller';
import { AuthorController } from './author.controller';
import { BlogController } from './blog.controller';
import { MediaAssetController } from './media-asset.controller';
import { MediaCollectionController } from './media-collection.controller';
import { MediaRelationController } from './media-relation.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-cms RBAC migration', () => {
  it('ArticleController', () => {
    expect(permissionsOf(ArticleController, 'create')).toEqual(['cms.article.create']);
    expect(permissionsOf(ArticleController, 'findAll')).toEqual(['cms.article.read']);
    expect(permissionsOf(ArticleController, 'findOne')).toEqual(['cms.article.read']);
    expect(permissionsOf(ArticleController, 'update')).toEqual(['cms.article.update']);
    expect(permissionsOf(ArticleController, 'delete')).toEqual(['cms.article.delete']);
    expect(permissionsOf(ArticleController, 'publish')).toEqual(['cms.article.publish']);
    expect(permissionsOf(ArticleController, 'updatePublishedAt')).toEqual(['cms.article.publish']);
    expect(permissionsOf(ArticleController, 'archive')).toEqual(['cms.article.update']);
    expect(permissionsOf(ArticleController, 'unarchive')).toEqual(['cms.article.update']);
  });

  it('ArticleImageController', () => {
    expect(permissionsOf(ArticleImageController, 'upload')).toEqual(['cms.article-image.create']);
    expect(permissionsOf(ArticleImageController, 'findAll')).toEqual(['cms.article-image.read']);
    expect(permissionsOf(ArticleImageController, 'delete')).toEqual(['cms.article-image.delete']);
    expect(permissionsOf(ArticleImageController, 'reorder')).toEqual(['cms.article-image.update']);
  });

  it('AuthorController', () => {
    expect(permissionsOf(AuthorController, 'create')).toEqual(['cms.author.create']);
    expect(permissionsOf(AuthorController, 'update')).toEqual(['cms.author.update']);
    expect(permissionsOf(AuthorController, 'findOne')).toEqual(['cms.author.read']);
    expect(permissionsOf(AuthorController, 'findAll')).toEqual(['cms.author.read']);
    expect(permissionsOf(AuthorController, 'delete')).toEqual(['cms.author.delete']);
    expect(permissionsOf(AuthorController, 'uploadAvatar')).toEqual(['cms.author.update']);
  });

  it('BlogController', () => {
    expect(permissionsOf(BlogController, 'create')).toEqual(['cms.blog.create']);
    expect(permissionsOf(BlogController, 'findAll')).toEqual(['cms.blog.read']);
    expect(permissionsOf(BlogController, 'listAssets')).toEqual(['cms.blog.read']);
    expect(permissionsOf(BlogController, 'uploadAsset')).toEqual(['cms.blog-asset.create']);
    expect(permissionsOf(BlogController, 'replace')).toEqual(['cms.blog.update']);
    expect(permissionsOf(BlogController, 'update')).toEqual(['cms.blog.update']);
    expect(permissionsOf(BlogController, 'delete')).toEqual(['cms.blog.delete']);
    expect(permissionsOf(BlogController, 'regenerateKey')).toEqual(['cms.blog.manage-key']);
  });

  it('MediaAssetController', () => {
    expect(permissionsOf(MediaAssetController, 'upload')).toEqual(['cms.media-asset.create']);
    expect(permissionsOf(MediaAssetController, 'list')).toEqual(['cms.media-asset.read']);
    expect(permissionsOf(MediaAssetController, 'findOne')).toEqual(['cms.media-asset.read']);
    expect(permissionsOf(MediaAssetController, 'update')).toEqual(['cms.media-asset.update']);
    expect(permissionsOf(MediaAssetController, 'remove')).toEqual(['cms.media-asset.delete']);
  });

  it('MediaCollectionController', () => {
    expect(permissionsOf(MediaCollectionController, 'create')).toEqual(['cms.media-collection.create']);
    expect(permissionsOf(MediaCollectionController, 'list')).toEqual(['cms.media-collection.read']);
    expect(permissionsOf(MediaCollectionController, 'findOne')).toEqual(['cms.media-collection.read']);
    expect(permissionsOf(MediaCollectionController, 'getAssets')).toEqual(['cms.media-collection.read']);
    expect(permissionsOf(MediaCollectionController, 'removeAsset')).toEqual(['cms.media-collection.update']);
    expect(permissionsOf(MediaCollectionController, 'update')).toEqual(['cms.media-collection.update']);
    expect(permissionsOf(MediaCollectionController, 'remove')).toEqual(['cms.media-collection.delete']);
  });

  it('MediaRelationController', () => {
    expect(permissionsOf(MediaRelationController, 'attach')).toEqual(['cms.media-relation.create']);
    expect(permissionsOf(MediaRelationController, 'detach')).toEqual(['cms.media-relation.delete']);
    expect(permissionsOf(MediaRelationController, 'getEntityAssets')).toEqual(['cms.media-relation.read']);
    expect(permissionsOf(MediaRelationController, 'reorder')).toEqual(['cms.media-relation.update']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cms-rbac-migration`
Expected: FAIL — todos os métodos ainda usam `@Roles`, `permissionsOf(...)` retorna `undefined`.

- [ ] **Step 3: Write minimal implementation**

Em cada um dos 7 arquivos, troque o import de `RolesGuard`/`Roles` por `PermissionsGuard`/`RequirePermissions` (mesmo padrão de caminho relativo já usado no arquivo) e troque cada par decorator:

**`article.controller.ts`** (classe já tem `@UseGuards(AdminJwtGuard, TenantGuard, ModuleAccessGuard, RolesGuard)`? — confirme no arquivo real; o Reserve tem `@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)` na classe, sem `ModuleAccessGuard` — troque só `RolesGuard` por `PermissionsGuard` na classe, e cada `@Roles(...)` de método por `@RequirePermissions(...)`):

```diff
-@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
+@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 @Controller('articles')
 export class ArticleController {
```

```diff
   @Post()
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article.create')
```
```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.article.read')
```
```diff
   @Get(':id')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.article.read')
```
```diff
   @Put(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article.update')
```
```diff
   @Delete(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article.delete')
```
```diff
   @Post(':id/publish')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article.publish')
```
```diff
   @Patch(':id/published-at')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article.publish')
```
```diff
   @Post(':articleId/archive')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article.update')
```
```diff
   @Post(':articleId/unarchive')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article.update')
```

**`article-image.controller.ts`** (classe `@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)` → `PermissionsGuard`):

```diff
   @Post()
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article-image.create')
```
```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.article-image.read')
```
```diff
   @Delete(':imageId')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article-image.delete')
```
```diff
   @Put('reorder')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.article-image.update')
```

**`author.controller.ts`** (classe → `PermissionsGuard`):

```diff
   @Post()
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.author.create')
```
```diff
   @Put(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.author.update')
```
```diff
   @Get(':id')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.author.read')
```
```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.author.read')
```
```diff
   @Delete(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.author.delete')
```
```diff
   @Post(':id/avatar')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.author.update')
```

**`blog.controller.ts`** (classe → `PermissionsGuard`):

```diff
   @Post()
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('cms.blog.create')
```
```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.blog.read')
```
```diff
   @Get(':blogId/assets')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.blog.read')
```
```diff
   @Post(':blogId/assets')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.blog-asset.create')
```
```diff
   @Put(':blogId')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.blog.update')
```
```diff
   @Patch(':blogId')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.blog.update')
```
```diff
   @Delete(':blogId')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('cms.blog.delete')
```
```diff
   @Post(':blogId/regenerate-key')
-  @Roles(EAdminRole.owner)
+  @RequirePermissions('cms.blog.manage-key')
```

**`media-asset.controller.ts`** (classe → `PermissionsGuard`):

```diff
   @Post()
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-asset.create')
```
```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.media-asset.read')
```
```diff
   @Get(':id')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.media-asset.read')
```
```diff
   @Patch(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-asset.update')
```
```diff
   @Delete(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-asset.delete')
```

**`media-collection.controller.ts`** (classe → `PermissionsGuard`):

```diff
   @Post()
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-collection.create')
```
```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.media-collection.read')
```
```diff
   @Get(':id')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.media-collection.read')
```
```diff
   @Get(':id/assets')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.media-collection.read')
```
```diff
   @Delete(':id/assets/:assetId')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-collection.update')
```
```diff
   @Put(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-collection.update')
```
```diff
   @Delete(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-collection.delete')
```

**`media-relation.controller.ts`** (classe → `PermissionsGuard`):

```diff
   @Post('attach')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-relation.create')
```
```diff
   @Post('detach')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-relation.delete')
```
```diff
   @Get(':entityType/:entityId')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('cms.media-relation.read')
```
```diff
   @Put('reorder')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('cms.media-relation.update')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cms-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-cms/infrastructure/controllers/*.controller.ts src/modules/reserve-cms/infrastructure/controllers/cms-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-cms de @Roles para @RequirePermissions"
```

---

### Task 11: Migrar `reserve-leads` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-leads/infrastructure/controllers/admin-appointment.controller.ts`
- Modify: `src/modules/reserve-leads/infrastructure/controllers/admin-appointment-schedule-config.controller.ts`
- Modify: `src/modules/reserve-leads/infrastructure/controllers/admin-blocked-period.controller.ts`
- Modify: `src/modules/reserve-leads/infrastructure/controllers/lead.controller.ts`
- Modify: `src/modules/reserve-leads/infrastructure/controllers/lead-collection.controller.ts`
- Test: `src/modules/reserve-leads/infrastructure/controllers/leads-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: nenhum controller de `reserve-leads` usa `@Roles`/`RolesGuard` depois desta task, exceto o `POST /` de `lead.controller.ts` (já `@Public()` desde a Task 8 — não é tocado aqui). Mapeamento 1:1 confirmado idêntico ao papel que cada rota já exige (nenhuma anomalia).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-leads/infrastructure/controllers/leads-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AdminAppointmentController } from './admin-appointment.controller';
import { AdminAppointmentScheduleConfigController } from './admin-appointment-schedule-config.controller';
import { AdminBlockedPeriodController } from './admin-blocked-period.controller';
import { LeadController } from './lead.controller';
import { LeadCollectionController } from './lead-collection.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-leads RBAC migration', () => {
  it('AdminAppointmentController', () => {
    expect(permissionsOf(AdminAppointmentController, 'list')).toEqual(['appointments.read']);
    expect(permissionsOf(AdminAppointmentController, 'getOne')).toEqual(['appointments.read']);
    expect(permissionsOf(AdminAppointmentController, 'cancel')).toEqual(['appointments.update']);
    expect(permissionsOf(AdminAppointmentController, 'complete')).toEqual(['appointments.update']);
  });

  it('AdminAppointmentScheduleConfigController', () => {
    expect(permissionsOf(AdminAppointmentScheduleConfigController, 'upsert')).toEqual([
      'appointments.schedule-config.manage',
    ]);
    expect(permissionsOf(AdminAppointmentScheduleConfigController, 'get')).toEqual([
      'appointments.schedule-config.read',
    ]);
  });

  it('AdminBlockedPeriodController', () => {
    expect(permissionsOf(AdminBlockedPeriodController, 'list')).toEqual(['appointments.blocked-period.read']);
    expect(permissionsOf(AdminBlockedPeriodController, 'create')).toEqual(['appointments.blocked-period.create']);
    expect(permissionsOf(AdminBlockedPeriodController, 'update')).toEqual(['appointments.blocked-period.update']);
    expect(permissionsOf(AdminBlockedPeriodController, 'delete')).toEqual(['appointments.blocked-period.delete']);
  });

  it('LeadController (admin routes)', () => {
    expect(permissionsOf(LeadController, 'findLeads')).toEqual(['leads.read']);
    expect(permissionsOf(LeadController, 'findLeadById')).toEqual(['leads.read']);
    expect(permissionsOf(LeadController, 'getLeadAttachments')).toEqual(['leads.read']);
    expect(permissionsOf(LeadController, 'addAttachment')).toEqual(['leads.attachment.create']);
    expect(permissionsOf(LeadController, 'removeAttachment')).toEqual(['leads.attachment.delete']);
    expect(permissionsOf(LeadController, 'updateLead')).toEqual(['leads.update']);
    expect(permissionsOf(LeadController, 'updateLeadStatus')).toEqual(['leads.update']);
    expect(permissionsOf(LeadController, 'deleteLead')).toEqual(['leads.delete']);
  });

  it('LeadCollectionController', () => {
    expect(permissionsOf(LeadCollectionController, 'create')).toEqual(['leads.collection.create']);
    expect(permissionsOf(LeadCollectionController, 'findAll')).toEqual(['leads.collection.read']);
    expect(permissionsOf(LeadCollectionController, 'getAllTenantLeads')).toEqual(['leads.read']);
    expect(permissionsOf(LeadCollectionController, 'findOne')).toEqual(['leads.collection.read']);
    expect(permissionsOf(LeadCollectionController, 'update')).toEqual(['leads.collection.update']);
    expect(permissionsOf(LeadCollectionController, 'regenerateSecretKey')).toEqual(['leads.collection.manage-key']);
    expect(permissionsOf(LeadCollectionController, 'remove')).toEqual(['leads.collection.delete']);
    expect(permissionsOf(LeadCollectionController, 'getCollectionLeads')).toEqual(['leads.read']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- leads-rbac-migration`
Expected: FAIL — todos os métodos ainda usam `@Roles`.

- [ ] **Step 3: Write minimal implementation**

Em cada arquivo, troque o import de `RolesGuard`/`Roles` por `PermissionsGuard`/`RequirePermissions`, e o `RolesGuard` na cadeia de `@UseGuards` da classe/rota por `PermissionsGuard`.

**`admin-appointment.controller.ts`**:

```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('appointments.read')
```
```diff
   @Get(':id')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('appointments.read')
```
```diff
   @Patch(':id/cancel')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('appointments.update')
```
```diff
   @Patch(':id/complete')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('appointments.update')
```

**`admin-appointment-schedule-config.controller.ts`**:

```diff
   @Put()
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('appointments.schedule-config.manage')
```
```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('appointments.schedule-config.read')
```

**`admin-blocked-period.controller.ts`**:

```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('appointments.blocked-period.read')
```
```diff
   @Post()
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('appointments.blocked-period.create')
```
```diff
   @Patch(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('appointments.blocked-period.update')
```
```diff
   @Delete(':id')
-  @Roles(EAdminRole.editor)
+  @RequirePermissions('appointments.blocked-period.delete')
```

**`lead.controller.ts`** (o `@UseGuards`/`@Roles` aqui é por rota, não por classe — `POST '/'` já é `@Public()` desde a Task 8 e não muda):

```diff
   @Get('/')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.viewer)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('leads.read')
```
```diff
   @Get('/:id')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.viewer)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('leads.read')
```
```diff
   @Get('/:id/attachments')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.viewer)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('leads.read')
```
```diff
   @Post('/:id/attachments')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.editor)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('leads.attachment.create')
```
```diff
   @Delete('/:id/attachments/:attachmentId')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.editor)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('leads.attachment.delete')
```
```diff
   @Patch('/:id')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.editor)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('leads.update')
```
```diff
   @Put('/:id/status')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.editor)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('leads.update')
```
```diff
   @Delete('/:id')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.manager)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('leads.delete')
```

**`lead-collection.controller.ts`** (classe → `PermissionsGuard`):

```diff
   @Post()
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('leads.collection.create')
```
```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('leads.collection.read')
```
```diff
   @Get('leads')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('leads.read')
```
```diff
   @Get(':id')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('leads.collection.read')
```
```diff
   @Put(':id')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('leads.collection.update')
```
```diff
   @Post(':id/regenerate-key')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('leads.collection.manage-key')
```
```diff
   @Delete(':id')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('leads.collection.delete')
```
```diff
   @Get(':id/leads')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('leads.read')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- leads-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-leads/infrastructure/controllers/admin-appointment.controller.ts src/modules/reserve-leads/infrastructure/controllers/admin-appointment-schedule-config.controller.ts src/modules/reserve-leads/infrastructure/controllers/admin-blocked-period.controller.ts src/modules/reserve-leads/infrastructure/controllers/lead.controller.ts src/modules/reserve-leads/infrastructure/controllers/lead-collection.controller.ts src/modules/reserve-leads/infrastructure/controllers/leads-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-leads de @Roles para @RequirePermissions"
```

---

### Task 12: Migrar `reserve-mailer` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-mailer/infrastructure/controllers/config.controller.ts`
- Modify: `src/modules/reserve-mailer/infrastructure/controllers/email-campaign.controller.ts`
- Modify: `src/modules/reserve-mailer/infrastructure/controllers/event-notification.controller.ts`
- Modify: `src/modules/reserve-mailer/infrastructure/controllers/lead.controller.ts`
- Test: `src/modules/reserve-mailer/infrastructure/controllers/mailer-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: nenhum controller de `reserve-mailer` usa `@Roles`/`RolesGuard` depois desta task. `mailer.smtp-config.manage`/`.read` são de concessão zero (super_admin bypass) — preserva exatamente o `@Roles(EAdminRole.super_admin)` de classe que `config.controller.ts` já tinha nas duas rotas.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-mailer/infrastructure/controllers/mailer-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ConfigController } from './config.controller';
import { EmailCampaignController } from './email-campaign.controller';
import { EventNotificationController } from './event-notification.controller';
import { LeadController } from './lead.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-mailer RBAC migration', () => {
  it('ConfigController — smtp-config zero-grant (super_admin only, preserved)', () => {
    expect(permissionsOf(ConfigController, 'createSmtpServer')).toEqual(['mailer.smtp-config.manage']);
    expect(permissionsOf(ConfigController, 'findSmtpServers')).toEqual(['mailer.smtp-config.read']);
  });

  it('EmailCampaignController — mailer.campaign.manage on every route (class-level today)', () => {
    for (const method of [
      'createEmailCampaign',
      'getAllEmailCampaigns',
      'getEmailCampaignById',
      'updateCopyVariant',
      'updateCampaignBatchSize',
      'closeSetup',
      'pauseCampaign',
      'resumeCampaign',
    ]) {
      expect(permissionsOf(EmailCampaignController, method)).toEqual(['mailer.campaign.manage']);
    }
  });

  it('EventNotificationController', () => {
    expect(permissionsOf(EventNotificationController, 'createSMSNotification')).toEqual(['mailer.sms.create']);
    expect(permissionsOf(EventNotificationController, 'findSMSNotification')).toEqual(['mailer.sms.read']);
    expect(permissionsOf(EventNotificationController, 'createSMSNotificationEvent')).toEqual(['mailer.sms.send']);
    expect(permissionsOf(EventNotificationController, 'findByIdNotificationSMSNotificationEvent')).toEqual([
      'mailer.sms.read',
    ]);
    expect(permissionsOf(EventNotificationController, 'findByIdSMSNotification')).toEqual(['mailer.sms.read']);
  });

  it('LeadController (mailer)', () => {
    expect(permissionsOf(LeadController, 'findLead')).toEqual(['mailer.lead.read']);
    expect(permissionsOf(LeadController, 'createLead')).toEqual(['mailer.lead.create']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mailer-rbac-migration`
Expected: FAIL — todos os métodos ainda usam `@Roles`.

- [ ] **Step 3: Write minimal implementation**

**`config.controller.ts`** (guard e `@Roles` na classe):

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
 @Controller()
 export class ConfigController {
```

Como a classe hoje tem um único `@Roles` cobrindo as duas rotas, mas `mailer.smtp-config.manage`/`.read` precisam ser diferenciadas por rota, adicione `@RequirePermissions` em cada método (a classe fica só com `PermissionsGuard`, sem `@RequirePermissions` de classe):

```diff
    @Post('/smtp-server')
+   @RequirePermissions('mailer.smtp-config.manage')
```
```diff
    @Get('/smtp-server')
+   @RequirePermissions('mailer.smtp-config.read')
```

**`email-campaign.controller.ts`** (guard e `@Roles` na classe, permanece um único `@RequirePermissions` de classe já que todas as 8 rotas usam a mesma permissão):

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-@Roles(EAdminRole.manager)
+@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+@RequirePermissions('mailer.campaign.manage')
 @Controller()
 export class EmailCampaignController {
```

**`event-notification.controller.ts`** (guard na classe, `@Roles` por método):

```diff
-import { AdminJwtGuard, RolesGuard } from '../../../../shared/auth/guards';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { AdminJwtGuard } from '../../../../shared/auth/guards';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, RolesGuard)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
 @Controller()
 export class EventNotificationController {
```

```diff
    @Post('/sms/create')
-   @Roles(EAdminRole.manager)
+   @RequirePermissions('mailer.sms.create')
```
```diff
    @Get('/sms')
-   @Roles(EAdminRole.viewer)
+   @RequirePermissions('mailer.sms.read')
```
```diff
    @Post('/sms/webhook/:uuid')
-   @Roles(EAdminRole.manager)
+   @RequirePermissions('mailer.sms.send')
```
```diff
    @Get('/sms/webhook/:id_notification')
-   @Roles(EAdminRole.viewer)
+   @RequirePermissions('mailer.sms.read')
```
```diff
    @Get('/sms/:id')
-   @Roles(EAdminRole.viewer)
+   @RequirePermissions('mailer.sms.read')
```

**`lead.controller.ts`** (mailer, guard na classe, `@Roles` por método):

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
+@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 @Controller()
 export class LeadController {
```

```diff
    @Get('/')
-   @Roles(EAdminRole.viewer)
+   @RequirePermissions('mailer.lead.read')
```
```diff
    @Post('/')
-   @Roles(EAdminRole.manager)
+   @RequirePermissions('mailer.lead.create')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- mailer-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-mailer/infrastructure/controllers/config.controller.ts src/modules/reserve-mailer/infrastructure/controllers/email-campaign.controller.ts src/modules/reserve-mailer/infrastructure/controllers/event-notification.controller.ts src/modules/reserve-mailer/infrastructure/controllers/lead.controller.ts src/modules/reserve-mailer/infrastructure/controllers/mailer-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-mailer de @Roles para @RequirePermissions"
```

---

### Task 13: Migrar `reserve-notifications` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-notifications/infrastructure/controllers/notification.controller.ts`
- Modify: `src/modules/reserve-notifications/infrastructure/controllers/notification-settings.controller.ts`
- Test: `src/modules/reserve-notifications/infrastructure/controllers/notifications-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: `NotificationController` inteiro migrado para `notifications.platform.manage` (zero-grant). Em `NotificationSettingsController`, só as duas rotas cross-tenant (`getForTenant`/`updateForTenant`) ganham `@RequirePermissions`; `getOwn`/`updateOwn` **não ganham nenhuma permissão** — preservando a anomalia documentada nas Global Constraints (qualquer admin autenticado, de qualquer papel, pode ler/escrever as configurações de notificação do próprio tenant).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-notifications/infrastructure/controllers/notifications-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { NotificationController } from './notification.controller';
import { NotificationSettingsController } from './notification-settings.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-notifications RBAC migration', () => {
  it('NotificationController — every route requires notifications.platform.manage', () => {
    for (const method of ['create', 'publish', 'list', 'findById', 'update', 'delete']) {
      expect(permissionsOf(NotificationController, method)).toEqual(['notifications.platform.manage']);
    }
  });

  it('NotificationSettingsController — own-tenant routes stay unpermissioned (preserved anomaly)', () => {
    expect(permissionsOf(NotificationSettingsController, 'getOwn')).toBeUndefined();
    expect(permissionsOf(NotificationSettingsController, 'updateOwn')).toBeUndefined();
  });

  it('NotificationSettingsController — cross-tenant routes require notifications.platform.manage', () => {
    expect(permissionsOf(NotificationSettingsController, 'getForTenant')).toEqual([
      'notifications.platform.manage',
    ]);
    expect(permissionsOf(NotificationSettingsController, 'updateForTenant')).toEqual([
      'notifications.platform.manage',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- notifications-rbac-migration`
Expected: FAIL — `NotificationController` ainda usa `@Roles`; a segunda asserção já passaria hoje incidentalmente (métodos sem decorator nenhum), mas a suíte inteira falha por causa da primeira e da terceira.

- [ ] **Step 3: Write minimal implementation**

**`notification.controller.ts`** (guard e `@Roles` na classe, cobrindo as 6 rotas):

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@Roles(EAdminRole.super_admin)
-@UseGuards(AdminJwtGuard, RolesGuard)
+@RequirePermissions('notifications.platform.manage')
+@UseGuards(AdminJwtGuard, PermissionsGuard)
 @Controller('notifications')
 export class NotificationController {
```

**`notification-settings.controller.ts`** (guard de classe é só `AdminJwtGuard`; `getOwn`/`updateOwn` não mudam; as duas rotas cross-tenant trocam `Roles`/`RolesGuard` por método):

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
   @Get('/:tenantId')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(RolesGuard)
+  @RequirePermissions('notifications.platform.manage')
+  @UseGuards(PermissionsGuard)
```
```diff
   @Patch('/:tenantId')
-  @Roles(EAdminRole.super_admin)
-  @UseGuards(RolesGuard)
+  @RequirePermissions('notifications.platform.manage')
+  @UseGuards(PermissionsGuard)
```

`getOwn` e `updateOwn` continuam exatamente como estão hoje (`@Get()`/`@Patch()` sem `@Roles`, sem `@RequirePermissions`, só a `AdminJwtGuard` de classe se aplica).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- notifications-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-notifications/infrastructure/controllers/notification.controller.ts src/modules/reserve-notifications/infrastructure/controllers/notification-settings.controller.ts src/modules/reserve-notifications/infrastructure/controllers/notifications-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-notifications de @Roles para @RequirePermissions"
```

---

### Task 14: Migrar `reserve-reports` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-reports/infrastructure/controllers/analytics-report.controller.ts`
- Test: `src/modules/reserve-reports/infrastructure/controllers/reports-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: `AnalyticsReportController` migrado para `analytics-reports.manage` (zero-grant, uniforme nas 4 rotas — sem distinção read/manage porque a Zarp não tem este domínio e o Reserve hoje restringe as 4 igualmente a `super_admin`).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-reports/infrastructure/controllers/reports-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AnalyticsReportController } from './analytics-report.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-reports RBAC migration', () => {
  it('AnalyticsReportController — every route requires analytics-reports.manage', () => {
    for (const method of ['create', 'findAll', 'update', 'delete']) {
      expect(permissionsOf(AnalyticsReportController, method)).toEqual(['analytics-reports.manage']);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports-rbac-migration`
Expected: FAIL — a classe ainda usa `@Roles(EAdminRole.super_admin)`.

- [ ] **Step 3: Write minimal implementation**

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('analytics-reports.manage')
 @Controller()
 export class AnalyticsReportController {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-reports/infrastructure/controllers/analytics-report.controller.ts src/modules/reserve-reports/infrastructure/controllers/reports-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-reports de @Roles para @RequirePermissions"
```

---

### Task 15: Migrar `reserve-stats` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-stats/infrastructure/controllers/stats-dashboard.controller.ts`
- Modify: `src/modules/reserve-stats/infrastructure/controllers/stats-integration.controller.ts`
- Test: `src/modules/reserve-stats/infrastructure/controllers/stats-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: nenhum controller de `reserve-stats` usa `@Roles`/`RolesGuard` depois desta task. **Confirmado não-anômalo** (ver Global Constraints): `getGlobalDashboard` continua exigindo `metrics.dashboard.global.read` (zero-grant, sem `TenantGuard`), separado de `metrics.dashboard.read` (viewer+, com `TenantGuard`) nas demais rotas — separação deliberada leitura-por-tenant vs. cross-tenant, não uma inconsistência.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-stats/infrastructure/controllers/stats-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { StatsDashboardController } from './stats-dashboard.controller';
import { StatsIntegrationController } from './stats-integration.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-stats RBAC migration', () => {
  it('StatsDashboardController — per-tenant routes require metrics.dashboard.read', () => {
    expect(permissionsOf(StatsDashboardController, 'getDashboard')).toEqual(['metrics.dashboard.read']);
    expect(permissionsOf(StatsDashboardController, 'getDashboardByTenant')).toEqual(['metrics.dashboard.read']);
    expect(permissionsOf(StatsDashboardController, 'getModuleMetrics')).toEqual(['metrics.dashboard.read']);
    expect(permissionsOf(StatsDashboardController, 'getTimeSeries')).toEqual(['metrics.dashboard.read']);
  });

  it('StatsDashboardController — global route requires the zero-grant metrics.dashboard.global.read', () => {
    expect(permissionsOf(StatsDashboardController, 'getGlobalDashboard')).toEqual([
      'metrics.dashboard.global.read',
    ]);
  });

  it('StatsDashboardController.listAvailableIntegrations requires metrics.integrations.read', () => {
    expect(permissionsOf(StatsDashboardController, 'listAvailableIntegrations')).toEqual([
      'metrics.integrations.read',
    ]);
  });

  it('StatsIntegrationController — reads vs manage split', () => {
    expect(permissionsOf(StatsIntegrationController, 'list')).toEqual(['metrics.integrations.read']);
    expect(permissionsOf(StatsIntegrationController, 'listProviders')).toEqual(['metrics.integrations.read']);
    expect(permissionsOf(StatsIntegrationController, 'getById')).toEqual(['metrics.integrations.read']);
    expect(permissionsOf(StatsIntegrationController, 'create')).toEqual(['metrics.integrations.manage']);
    expect(permissionsOf(StatsIntegrationController, 'update')).toEqual(['metrics.integrations.manage']);
    expect(permissionsOf(StatsIntegrationController, 'delete')).toEqual(['metrics.integrations.manage']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stats-rbac-migration`
Expected: FAIL — todos os métodos ainda usam `@Roles`.

- [ ] **Step 3: Write minimal implementation**

**`stats-dashboard.controller.ts`** (guard e `@Roles` por rota, sem guard de classe):

```diff
-import { AdminJwtGuard, TenantGuard, RolesGuard } from '../../../../shared/auth/guards';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { AdminJwtGuard, TenantGuard } from '../../../../shared/auth/guards';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
   @Get('/dashboard')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.viewer)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('metrics.dashboard.read')
```
```diff
   @Get('/dashboard/tenants/:tenantId')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.viewer)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('metrics.dashboard.read')
```
```diff
   @Get('/dashboard/global')
-  @UseGuards(AdminJwtGuard, RolesGuard)
-  @Roles(EAdminRole.super_admin)
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
+  @RequirePermissions('metrics.dashboard.global.read')
```
```diff
   @Get('/available-integrations')
-  @UseGuards(AdminJwtGuard, RolesGuard)
-  @Roles(EAdminRole.viewer)
+  @UseGuards(AdminJwtGuard, PermissionsGuard)
+  @RequirePermissions('metrics.integrations.read')
```
```diff
   @Get('/module/:moduleKey')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.viewer)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('metrics.dashboard.read')
```
```diff
   @Get('/timeseries')
-  @UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
-  @Roles(EAdminRole.viewer)
+  @UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
+  @RequirePermissions('metrics.dashboard.read')
```

**`stats-integration.controller.ts`** (guard na classe, `@Roles` por método):

```diff
-import { AdminJwtGuard, TenantGuard, RolesGuard } from '../../../../shared/auth/guards';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { AdminJwtGuard, TenantGuard } from '../../../../shared/auth/guards';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
+@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 @Controller('/integrations')
 export class StatsIntegrationController {
```

```diff
   @Get('/')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('metrics.integrations.read')
```
```diff
   @Get('/providers')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('metrics.integrations.read')
```
```diff
   @Get('/:id')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('metrics.integrations.read')
```
```diff
   @Post('/')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('metrics.integrations.manage')
```
```diff
   @Patch('/:id')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('metrics.integrations.manage')
```
```diff
   @Delete('/:id')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('metrics.integrations.manage')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- stats-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-stats/infrastructure/controllers/stats-dashboard.controller.ts src/modules/reserve-stats/infrastructure/controllers/stats-integration.controller.ts src/modules/reserve-stats/infrastructure/controllers/stats-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-stats de @Roles para @RequirePermissions"
```

---

### Task 16: Migrar `reserve-subscriptions` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-subscriptions/infrastructure/controllers/tenant-billing-config.controller.ts`
- Test: `src/modules/reserve-subscriptions/infrastructure/controllers/subscriptions-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: `TenantBillingConfigController` migrado para `billing-config.read`/`billing-config.manage` (nomes reaproveitados 1:1 da Zarp, que já modela o mesmo recurso separado de `billing.read`/`billing.manage`).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-subscriptions/infrastructure/controllers/subscriptions-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { TenantBillingConfigController } from './tenant-billing-config.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-subscriptions RBAC migration', () => {
  it('TenantBillingConfigController — read vs manage split', () => {
    expect(permissionsOf(TenantBillingConfigController, 'get')).toEqual(['billing-config.read']);
    expect(permissionsOf(TenantBillingConfigController, 'create')).toEqual(['billing-config.manage']);
    expect(permissionsOf(TenantBillingConfigController, 'update')).toEqual(['billing-config.manage']);
    expect(permissionsOf(TenantBillingConfigController, 'delete')).toEqual(['billing-config.manage']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- subscriptions-rbac-migration`
Expected: FAIL — a classe ainda usa `@Roles` por método.

- [ ] **Step 3: Write minimal implementation**

```diff
-import { AdminJwtGuard, TenantGuard, RolesGuard } from '../../../../shared/auth/guards';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { AdminJwtGuard, TenantGuard } from '../../../../shared/auth/guards';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
+@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 @Controller('payments/billing-config')
 export class TenantBillingConfigController {
```

```diff
   @Get('/')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('billing-config.read')
```
```diff
   @Post('/')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('billing-config.manage')
```
```diff
   @Patch('/')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('billing-config.manage')
```
```diff
   @Delete('/')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('billing-config.manage')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- subscriptions-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-subscriptions/infrastructure/controllers/tenant-billing-config.controller.ts src/modules/reserve-subscriptions/infrastructure/controllers/subscriptions-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-subscriptions de @Roles para @RequirePermissions"
```

---

### Task 17: Migrar `reserve-b2c-products` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-b2c-products/infrastructure/controllers/admin-fee-config.controller.ts`
- Modify: `src/modules/reserve-b2c-products/infrastructure/controllers/admin-products.controller.ts`
- Test: `src/modules/reserve-b2c-products/infrastructure/controllers/b2c-products-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: os dois controllers migrados para as permissões novas Reserve-exclusivas `b2c-products.read`/`.manage` e `b2c-fees.read`/`.manage` (não existem na Zarp — este é um domínio exclusivo do Reserve).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-b2c-products/infrastructure/controllers/b2c-products-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AdminFeeConfigController } from './admin-fee-config.controller';
import { AdminProductsController } from './admin-products.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-b2c-products RBAC migration', () => {
  it('AdminFeeConfigController — read vs manage split', () => {
    expect(permissionsOf(AdminFeeConfigController, 'getGlobalConfig')).toEqual(['b2c-fees.read']);
    expect(permissionsOf(AdminFeeConfigController, 'upsertGlobalConfig')).toEqual(['b2c-fees.manage']);
    expect(permissionsOf(AdminFeeConfigController, 'listCategories')).toEqual(['b2c-fees.read']);
    expect(permissionsOf(AdminFeeConfigController, 'createCategory')).toEqual(['b2c-fees.manage']);
    expect(permissionsOf(AdminFeeConfigController, 'updateCategory')).toEqual(['b2c-fees.manage']);
    expect(permissionsOf(AdminFeeConfigController, 'deleteCategory')).toEqual(['b2c-fees.manage']);
    expect(permissionsOf(AdminFeeConfigController, 'getProductsByCategory')).toEqual(['b2c-fees.read']);
    expect(permissionsOf(AdminFeeConfigController, 'updateProductFees')).toEqual(['b2c-fees.manage']);
  });

  it('AdminProductsController — read vs manage split', () => {
    expect(permissionsOf(AdminProductsController, 'listProducts')).toEqual(['b2c-products.read']);
    expect(permissionsOf(AdminProductsController, 'createProduct')).toEqual(['b2c-products.manage']);
    expect(permissionsOf(AdminProductsController, 'calculateCost')).toEqual(['b2c-products.read']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- b2c-products-rbac-migration`
Expected: FAIL — os dois controllers ainda usam `@Roles`.

- [ ] **Step 3: Write minimal implementation**

**`admin-fee-config.controller.ts`** (guard na classe, `@Roles` por método):

```diff
-import { AdminJwtGuard, TenantGuard, RolesGuard } from '../../../../shared/auth/guards';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { AdminJwtGuard, TenantGuard } from '../../../../shared/auth/guards';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
+@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 @Controller('b2c/fees')
```

```diff
   @Get('global')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('b2c-fees.read')
```
```diff
   @Put('global')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('b2c-fees.manage')
```
```diff
   @Get('categories')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('b2c-fees.read')
```
```diff
   @Post('categories')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('b2c-fees.manage')
```
```diff
   @Patch('categories/:id')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('b2c-fees.manage')
```
```diff
   @Delete('categories/:id')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('b2c-fees.manage')
```
```diff
   @Get('categories/:id/products')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('b2c-fees.read')
```
```diff
   @Patch('products/:productId')
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('b2c-fees.manage')
```

**`admin-products.controller.ts`** (guard na classe, `@Roles` por método):

```diff
-import { AdminJwtGuard, TenantGuard, RolesGuard } from '../../../../shared/auth/guards';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { AdminJwtGuard, TenantGuard } from '../../../../shared/auth/guards';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
-@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)
+@UseGuards(AdminJwtGuard, TenantGuard, PermissionsGuard)
 @Controller('b2c/products')
```

```diff
   @Get()
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('b2c-products.read')
```
```diff
   @Post()
-  @Roles(EAdminRole.manager)
+  @RequirePermissions('b2c-products.manage')
```
```diff
   @Post(':id/calculate-cost')
-  @Roles(EAdminRole.viewer)
+  @RequirePermissions('b2c-products.read')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- b2c-products-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-b2c-products/infrastructure/controllers/admin-fee-config.controller.ts src/modules/reserve-b2c-products/infrastructure/controllers/admin-products.controller.ts src/modules/reserve-b2c-products/infrastructure/controllers/b2c-products-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-b2c-products de @Roles para @RequirePermissions"
```

---

### Task 18: Migrar `reserve-client-portal` — `@Roles` → `@RequirePermissions`

**Files:**
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/admin-hotel-client.controller.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/admin-hotel-metrics.controller.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/admin-reservations.controller.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/guest-crm.controller.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/report.controller.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/whatsapp.controller.ts`
- Modify: `src/modules/reserve-client-portal/infrastructure/controllers/whatsapp-tracking.controller.ts`
- Test: `src/modules/reserve-client-portal/infrastructure/controllers/client-portal-rbac-migration.spec.ts`

**Interfaces:**
- Consumes: `RequirePermissions`, `PermissionsGuard` (Task 6).
- Produces: os 7 controllers migrados para as permissões novas Reserve-exclusivas `hotel-portal.*` (domínio "hotel-portal" não existe na Zarp). `client-portal.controller.ts` (`ClientPortalController`) **não é tocado** — não usa `@Roles` hoje (só `AdminJwtGuard` de classe, qualquer admin autenticado acessa), e esta task preserva 1:1, não aperta esse acesso.
- **Duas anomalias preservadas (ver Global Constraints):**
  - `admin-hotel-client.controller.ts`: `DELETE :id` (`deactivate`) é `@Roles(super_admin)` sozinho, mais estreito que o resto da classe (`super_admin`+`owner`+`manager`). Permissão dedicada `hotel-portal.clients.deactivate` (zero-grant) preserva isso, separada de `hotel-portal.clients.manage` (manager+) usada pelas outras 6 rotas.
  - `report.controller.ts`: `PATCH :id/publish` é `@Roles(super_admin, owner)`, excluindo `manager` — mais estreito que o resto da classe (`super_admin`+`owner`+`manager`). Permissão dedicada `hotel-portal.reports.publish` (concedida só a partir de `owner`) preserva isso, separada de `hotel-portal.reports.manage` (manager+) usada pelas outras 4 rotas.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-client-portal/infrastructure/controllers/client-portal-rbac-migration.spec.ts
import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { AdminHotelClientController } from './admin-hotel-client.controller';
import { AdminHotelMetricsController } from './admin-hotel-metrics.controller';
import { AdminReservationsController } from './admin-reservations.controller';
import { GuestCrmController } from './guest-crm.controller';
import { ReportController } from './report.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppTrackingController } from './whatsapp-tracking.controller';

function classPermissionsOf(target: any): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target);
}

function methodPermissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-client-portal RBAC migration', () => {
  it('AdminHotelClientController — class requires hotel-portal.clients.manage, deactivate is narrower (anomaly preserved)', () => {
    expect(classPermissionsOf(AdminHotelClientController)).toEqual(['hotel-portal.clients.manage']);
    expect(methodPermissionsOf(AdminHotelClientController, 'deactivate')).toEqual([
      'hotel-portal.clients.deactivate',
    ]);
  });

  it('AdminHotelMetricsController — class requires hotel-portal.metrics.manage, no method override', () => {
    expect(classPermissionsOf(AdminHotelMetricsController)).toEqual(['hotel-portal.metrics.manage']);
  });

  it('AdminReservationsController — class requires hotel-portal.reservations.manage', () => {
    expect(classPermissionsOf(AdminReservationsController)).toEqual(['hotel-portal.reservations.manage']);
  });

  it('GuestCrmController — class requires hotel-portal.guests.manage', () => {
    expect(classPermissionsOf(GuestCrmController)).toEqual(['hotel-portal.guests.manage']);
  });

  it('ReportController — class requires hotel-portal.reports.manage, publish is narrower (anomaly preserved)', () => {
    expect(classPermissionsOf(ReportController)).toEqual(['hotel-portal.reports.manage']);
    expect(methodPermissionsOf(ReportController, 'publish')).toEqual(['hotel-portal.reports.publish']);
  });

  it('WhatsAppController — class requires hotel-portal.whatsapp.manage', () => {
    expect(classPermissionsOf(WhatsAppController)).toEqual(['hotel-portal.whatsapp.manage']);
  });

  it('WhatsAppTrackingController — class requires hotel-portal.whatsapp-links.manage', () => {
    expect(classPermissionsOf(WhatsAppTrackingController)).toEqual(['hotel-portal.whatsapp-links.manage']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- client-portal-rbac-migration`
Expected: FAIL — todos os 7 controllers ainda usam `@Roles` de classe (e `admin-hotel-client.controller.ts`/`report.controller.ts` têm o override de método).

- [ ] **Step 3: Write minimal implementation**

**`admin-hotel-client.controller.ts`**:

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
 @Controller('admin/hotel-portal/clients')
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('hotel-portal.clients.manage')
 export class AdminHotelClientController {
```

```diff
   @Delete(':id')
-  @Roles(EAdminRole.super_admin)
+  @RequirePermissions('hotel-portal.clients.deactivate')
   async deactivate(@Param('id') id: string, @Res() res: Response) {
```

**`admin-hotel-metrics.controller.ts`** (sem override — troca só na classe):

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
 @Controller('admin/hotel-portal/metrics')
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('hotel-portal.metrics.manage')
 export class AdminHotelMetricsController {
```

**`admin-reservations.controller.ts`**:

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
 @Controller('admin/hotel-portal/reservations')
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('hotel-portal.reservations.manage')
 export class AdminReservationsController {
```

**`guest-crm.controller.ts`**:

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
 @Controller('admin/hotel-portal/guests')
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('hotel-portal.guests.manage')
 export class GuestCrmController {
```

**`report.controller.ts`**:

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
 @Controller('admin/hotel-portal/reports')
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('hotel-portal.reports.manage')
 export class ReportController {
```

```diff
   @Patch(':id/publish')
-  @Roles(EAdminRole.super_admin, EAdminRole.owner)
+  @RequirePermissions('hotel-portal.reports.publish')
   async publish(
```

**`whatsapp.controller.ts`**:

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
 @Controller('admin/hotel-portal/whatsapp')
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('hotel-portal.whatsapp.manage')
 export class WhatsAppController {
```

**`whatsapp-tracking.controller.ts`**:

```diff
-import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
-import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
+import { PermissionsGuard } from '../../../../shared/auth/guards/permissions.guard';
+import { RequirePermissions } from '../../../../shared/auth/decorators/require-permissions.decorator';
```

```diff
 @Controller('admin/hotel-portal/whatsapp-links')
-@UseGuards(AdminJwtGuard, RolesGuard)
-@Roles(EAdminRole.super_admin, EAdminRole.owner, EAdminRole.manager)
+@UseGuards(AdminJwtGuard, PermissionsGuard)
+@RequirePermissions('hotel-portal.whatsapp-links.manage')
 export class WhatsAppTrackingController {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- client-portal-rbac-migration`
Expected: PASS.

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reserve-client-portal/infrastructure/controllers/admin-hotel-client.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/admin-hotel-metrics.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/admin-reservations.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/guest-crm.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/report.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/whatsapp.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/whatsapp-tracking.controller.ts src/modules/reserve-client-portal/infrastructure/controllers/client-portal-rbac-migration.spec.ts
git commit -m "refactor: migrar reserve-client-portal de @Roles para @RequirePermissions (2 anomalias de papel preservadas)"
```

---

### Task 19: `GET /api/tenant-capabilities`

**Files:**
- Create: `src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.ts`
- Create: `src/modules/reserve-auth/application/dtos/tenant-capabilities-response.dto.ts`
- Create: `src/modules/reserve-auth/infrastructure/controllers/tenant-capabilities.controller.ts`
- Modify: `src/modules/reserve-auth/reserve-auth.module.ts`
- Test: `src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`; `ADMIN_REPOSITORY`/`IAdminRepository`, `ADMIN_TENANT_REPOSITORY`/`IAdminTenantRepository` (`src/modules/reserve-auth/domain/interfaces`); `PermissionsService` (Task 4); `PermissionOverridesService`, `applyOverrides` (Task 5); `normalizeAdminRole` (Task 3); `AdminJwtGuard`, `TenantGuard`; `CurrentAdmin`/`CurrentAdminPayload` (`admin_id`, `tenant_id`).
- Produces: `interface TenantCapabilities { tenantId: string; role: EAdminRole; permissions: string[] }`; `class GetTenantCapabilitiesUseCase { execute(adminId: string, tenantId: string): Promise<TenantCapabilities> }`; rota `GET /api/tenant-capabilities`.
- **Escopo reduzido em relação à Zarp** (ver Global Constraints): a resposta **não** inclui `tenantType`, `isMasterTenant` nem `modules` — dependem de `Tenant.tenantType`/`TenantSetting`, que só chegam na Fase 3. A Fase 3 estende este mesmo endpoint, não cria um novo.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.spec.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { GetTenantCapabilitiesUseCase } from './get-tenant-capabilities.use-case';

describe('GetTenantCapabilitiesUseCase', () => {
  let prisma: { tenant: { findUnique: jest.Mock } };
  let adminRepository: { selectById: jest.Mock };
  let adminTenantRepository: { findRoleInTenant: jest.Mock };
  let permissionsService: { getPermissionsForRole: jest.Mock };
  let permissionOverridesService: { getForAdmin: jest.Mock };
  let useCase: GetTenantCapabilitiesUseCase;

  beforeEach(() => {
    prisma = { tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', active: true }) } };
    adminRepository = {
      selectById: jest.fn().mockResolvedValue({ id: 'admin-1', role: EAdminRole.manager, active: true }),
    };
    adminTenantRepository = { findRoleInTenant: jest.fn().mockResolvedValue(EAdminRole.manager) };
    permissionsService = {
      getPermissionsForRole: jest.fn().mockResolvedValue(new Set(['leads.read', 'leads.update'])),
    };
    permissionOverridesService = {
      getForAdmin: jest.fn().mockResolvedValue({ grants: new Set(), denies: new Set() }),
    };
    useCase = new GetTenantCapabilitiesUseCase(
      prisma as any,
      adminRepository as any,
      adminTenantRepository as any,
      permissionsService as any,
      permissionOverridesService as any,
    );
  });

  it('throws NotFoundException when the tenant does not exist', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the tenant is inactive', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', active: false });
    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the admin is inactive or not found', async () => {
    adminRepository.selectById.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
  });

  it('super_admin gets the wildcard permission set without querying role grants', async () => {
    adminRepository.selectById.mockResolvedValue({ id: 'admin-1', role: EAdminRole.super_admin, active: true });
    const result = await useCase.execute('admin-1', 'tenant-1');
    expect(result).toEqual({ tenantId: 'tenant-1', role: EAdminRole.super_admin, permissions: ['*'] });
    expect(permissionsService.getPermissionsForRole).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the admin has no role in the tenant', async () => {
    adminTenantRepository.findRoleInTenant.mockResolvedValue(null);
    await expect(useCase.execute('admin-1', 'tenant-1')).rejects.toThrow(ForbiddenException);
  });

  it('returns the sorted, override-applied permission set for a normal admin', async () => {
    permissionOverridesService.getForAdmin.mockResolvedValue({
      grants: new Set(['billing-config.manage']),
      denies: new Set(['leads.update']),
    });
    const result = await useCase.execute('admin-1', 'tenant-1');
    expect(result).toEqual({
      tenantId: 'tenant-1',
      role: EAdminRole.manager,
      permissions: ['billing-config.manage', 'leads.read'],
    });
  });

  it('normalizes company_admin to manager', async () => {
    adminTenantRepository.findRoleInTenant.mockResolvedValue(EAdminRole.company_admin);
    const result = await useCase.execute('admin-1', 'tenant-1');
    expect(result.role).toBe(EAdminRole.manager);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- get-tenant-capabilities.use-case`
Expected: FAIL com `Cannot find module './get-tenant-capabilities.use-case'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.ts
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { ADMIN_REPOSITORY, IAdminRepository } from '../../domain/interfaces';
import {
  ADMIN_TENANT_REPOSITORY,
  IAdminTenantRepository,
} from '../../domain/interfaces/admin-tenant.repository.interface';
import { normalizeAdminRole } from '../../../../shared/auth/rbac/permission-matrix';
import { PermissionsService } from '../../../../shared/auth/rbac/permissions.service';
import { PermissionOverridesService } from '../../../../shared/auth/rbac/permission-overrides.service';
import { applyOverrides } from '../../../../shared/auth/rbac/apply-overrides';

export interface TenantCapabilities {
  tenantId: string;
  role: EAdminRole;
  permissions: string[];
}

/**
 * Fase 2: devolve só { tenantId, role, permissions } — sem tenantType,
 * isMasterTenant nem modules (Fase 3 estende este mesmo endpoint quando
 * Tenant.tenantType e TenantSetting existirem).
 */
@Injectable()
export class GetTenantCapabilitiesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ADMIN_REPOSITORY)
    private readonly adminRepository: IAdminRepository,
    @Inject(ADMIN_TENANT_REPOSITORY)
    private readonly adminTenantRepository: IAdminTenantRepository,
    private readonly permissionsService: PermissionsService,
    private readonly permissionOverridesService: PermissionOverridesService,
  ) {}

  async execute(adminId: string, tenantId: string): Promise<TenantCapabilities> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, active: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.active === false) throw new ForbiddenException('Tenant is inactive');

    const admin = await this.adminRepository.selectById(adminId);
    if (!admin || !admin.active) {
      throw new ForbiddenException('Admin account is inactive or not found');
    }

    if (admin.role === EAdminRole.super_admin) {
      return { tenantId, role: EAdminRole.super_admin, permissions: ['*'] };
    }

    const tenantRole = await this.adminTenantRepository.findRoleInTenant(adminId, tenantId);
    if (!tenantRole) throw new ForbiddenException('You do not have a role in this tenant');

    const role = normalizeAdminRole(tenantRole);
    const held = await this.permissionsService.getPermissionsForRole(role);
    const overrides = await this.permissionOverridesService.getForAdmin(adminId, tenantId);
    const effective = applyOverrides(held, overrides);

    return { tenantId, role, permissions: [...effective].sort() };
  }
}
```

```ts
// src/modules/reserve-auth/application/dtos/tenant-capabilities-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { EAdminRole } from '../../domain/enums/admin-role.enum';

export class TenantCapabilitiesResponseDto {
  @ApiProperty({ example: 'ckt1234567890abcdefghijk' })
  tenantId: string;

  @ApiProperty({ enum: EAdminRole, example: EAdminRole.manager })
  role: EAdminRole;

  @ApiProperty({ type: [String], example: ['leads.read', 'leads.update'] })
  permissions: string[];
}
```

```ts
// src/modules/reserve-auth/infrastructure/controllers/tenant-capabilities.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { TenantCapabilitiesResponseDto } from '../../application/dtos/tenant-capabilities-response.dto';

@ApiTags('Tenant Management')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Active tenant ID' })
@UseGuards(AdminJwtGuard, TenantGuard)
@Controller('tenant-capabilities')
export class TenantCapabilitiesController {
  constructor(private readonly getTenantCapabilities: GetTenantCapabilitiesUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Get effective capabilities for the active tenant and admin',
    description: 'Returns the caller effective role and permission set for the active tenant.',
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

- [ ] **Step 4: Registrar no módulo**

Em `src/modules/reserve-auth/reserve-auth.module.ts`, adicione os imports:

```ts
import { GetTenantCapabilitiesUseCase } from './application/use-cases/get-tenant-capabilities.use-case';
import { TenantCapabilitiesController } from './infrastructure/controllers/tenant-capabilities.controller';
```

No array `controllers`, adicione `TenantCapabilitiesController` (a ordem entre os controllers existentes não importa — esta rota não colide com nenhuma outra).

No array `providers`, adicione `GetTenantCapabilitiesUseCase`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- get-tenant-capabilities.use-case`
Expected: PASS.

- [ ] **Step 6: Build e verificação manual**

Run: `npm run build`
Expected: exit 0. Suba a API e confirme a rota:

```bash
curl -s -H "Authorization: Bearer <token>" -H "session-id: <id>" -H "x-tenant-id: <tenantId>" http://localhost:$PORT/api/tenant-capabilities
```

Expected: `{"tenantId":"...","role":"manager","permissions":["...", "..."]}`.

- [ ] **Step 7: Commit**

```bash
git add src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.ts src/modules/reserve-auth/application/use-cases/get-tenant-capabilities.use-case.spec.ts src/modules/reserve-auth/application/dtos/tenant-capabilities-response.dto.ts src/modules/reserve-auth/infrastructure/controllers/tenant-capabilities.controller.ts src/modules/reserve-auth/reserve-auth.module.ts
git commit -m "feat: GET /api/tenant-capabilities (role + permissoes efetivas do admin no tenant ativo)"
```

---

### Task 20: Seed idempotente + `docs/RBAC-MATRIX.md`

**Files:**
- Create: `prisma/seeds/shared/permissions.seed.ts`
- Modify: `prisma/seeds.ts`
- Create: `docs/RBAC-MATRIX.md`
- Test: nenhum spec novo — verificação é rodar o seed duas vezes seguidas e confirmar que a segunda rodada não cria linha duplicada (idempotência), via `Step 3`.

**Interfaces:**
- Consumes: `PERMISSIONS`, `ROLE_GRANTS` (Task 3); `prisma.permission.upsert`, `prisma.rolePermission.upsert` (Task 2).
- Produces: função `seedPermissions(): Promise<void>` chamada pelo orquestrador `prisma/seeds.ts`; `docs/RBAC-MATRIX.md` com a tabela permissão × papel gerada manualmente a partir do mesmo `permission-matrix.ts` (documento estático — regenerar à mão sempre que o matrix mudar, mesma disciplina que a Zarp já usa).

- [ ] **Step 1: Write the seed script**

```ts
// prisma/seeds/shared/permissions.seed.ts
import 'dotenv/config';
import { PrismaClient, EAdminRole } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PERMISSIONS, ROLE_GRANTS } from '../../../src/shared/auth/rbac/permission-matrix';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Seed idempotente do RBAC (docs/superpowers/plans/2026-07-26-fase2-backend-rbac.md):
 * upserta toda permissão declarada e todo grant de papel do matrix. Nunca
 * remove linha — uma permissão retirada do matrix precisa de limpeza manual
 * e deliberada, não automática pelo seed.
 */
export async function seedPermissions() {
  for (const name of PERMISSIONS) {
    await prisma.permission.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const [role, grants] of Object.entries(ROLE_GRANTS) as [EAdminRole, readonly string[]][]) {
    for (const name of grants) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { name } });
      await prisma.rolePermission.upsert({
        where: { role_permission_id: { role, permission_id: permission.id } },
        update: {},
        create: { role, permission_id: permission.id },
      });
    }
  }

  console.log(
    `Seeded ${PERMISSIONS.length} permissions and role grants for ${Object.keys(ROLE_GRANTS).length} roles.`,
  );
}

if (require.main === module) {
  seedPermissions()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
```

> O nome do índice composto usado em `where: { role_permission_id: {...} }` é o que o Prisma client gera a partir de `@@unique([role, permission_id])` na Task 2 — confirme o nome exato gerado rodando `npx prisma generate` e inspecionando `src/generated/prisma/client` (ou o autocomplete do editor) antes deste Step; se o Prisma gerar um nome diferente (ex.: `role_permission_id`), ajuste a chave aqui para bater exatamente.

- [ ] **Step 2: Ligar ao orquestrador**

Em `prisma/seeds.ts`, adicione o import junto aos outros seeds compartilhados:

```ts
import { seedPermissions } from './seeds/shared/permissions.seed';
```

E a chamada, logo depois de `await seedAdmins();` (RBAC depende de nada além de si mesmo, mas roda perto da fundação de auth por convenção):

```ts
    await seedAdmins();
    await seedPermissions();
```

- [ ] **Step 3: Rodar e confirmar idempotência**

```bash
npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seeds/shared/permissions.seed.ts
npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seeds/shared/permissions.seed.ts
```

Expected: as duas rodadas terminam com exit 0 e a mesma mensagem de contagem; confirme no banco que `SELECT count(*) FROM permissions` e `SELECT count(*) FROM role_permissions` não dobraram entre a primeira e a segunda rodada.

- [ ] **Step 4: Escrever `docs/RBAC-MATRIX.md`**

```markdown
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
```

- [ ] **Step 5: Build e suíte completa**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 6: Commit**

```bash
git add prisma/seeds/shared/permissions.seed.ts prisma/seeds.ts docs/RBAC-MATRIX.md
git commit -m "feat: seed idempotente de permissoes/role_permissions + docs/RBAC-MATRIX.md"
```

---

### Task 21: Ligar o enforce do `SecurityPostureGuard` em produção

**Files:**
- Modify: `.env` (e todo `.env` de ambiente de deploy, se gerenciado fora do repositório — aplicar a mesma mudança lá)

**Interfaces:**
- Consumes: `SecurityPostureGuard` (Task 7), toda rota classificada pelas Tasks 8–18.
- Produces: `SECURITY_POSTURE_ENFORCE` removida (ou `true`) em todo ambiente — o guard volta a 403 qualquer rota não classificada, que é o comportamento padrão do código desde a Task 7 (o kill-switch só existia para não quebrar produção enquanto a auditoria rodava).

> Esta é a última task porque só faz sentido ligar o enforce depois que TODA rota do backend foi classificada — Task 8 (13 rotas `@Public()`) e Tasks 9–18 (todo `@Roles` virou `@RequirePermissions`, o que por si preserva o `@UseGuards` que já classificava a rota). Ligar antes teria 403ado rotas legítimas no meio da migração.

- [ ] **Step 1: Confirmar que não sobrou rota sem classificação**

Com `SECURITY_POSTURE_ENFORCE=false` ainda ativo, suba a aplicação, exercite manualmente (ou via a suíte e2e, se existir) as rotas mais usadas de cada módulo migrado, e cheque o log por qualquer linha:

```
Unclassified route detected (log-only, SECURITY_POSTURE_ENFORCE=false): ...
```

Expected: nenhuma linha desse tipo aparece durante o exercício. Se aparecer, essa rota ainda precisa de `@Public()` ou de guard — volte para a Task 8 antes de prosseguir.

- [ ] **Step 2: Remover o kill-switch**

No `.env` (e em todo ambiente de deploy):

```diff
-SECURITY_POSTURE_ENFORCE=false
```

(remover a linha inteira restaura o default do código, que é enforce — não é necessário setar `true` explicitamente, mas setar não muda o comportamento se preferir deixar documentado.)

- [ ] **Step 3: Verificar em produção (ou staging) logo após o deploy**

Monitore os logs da aplicação nos primeiros minutos depois do deploy por qualquer `Unclassified route denied: ...` — cada uma dessas é uma rota real recebendo 403 que antes era aberta. Se aparecer alguma, é uma rota que a auditoria da Task 8 não cobriu; trate como incidente (adicionar `@Public()` ou guard emergencialmente), não espere o próximo ciclo de plano.

- [ ] **Step 4: Commit**

```bash
git add .env
git commit -m "chore: ligar enforce do SecurityPostureGuard em producao (remover SECURITY_POSTURE_ENFORCE=false)"
```

---

## Resumo da Fase 2

21 tasks: baseline + 2 controllers ⚠️ corrigidos (Task 1) · modelos Prisma RBAC (Task 2) · catálogo de permissões (Task 3) · cache de permissões por papel (Task 4) · overrides por admin/tenant (Task 5) · `PermissionsGuard` (Task 6) · `SecurityPostureGuard` log-only (Task 7) · auditoria deny-by-default (Task 8) · migração `@Roles` → `@RequirePermissions` em 10 módulos (Tasks 9–18) · `GET /api/tenant-capabilities` (Task 19) · seed + `RBAC-MATRIX.md` (Task 20) · enforce ligado em produção (Task 21).

Achados de segurança independentes do porte, fechados na Task 1: `admin-email.controller.ts` (controller administrativo vazio, sem guard, registrado em `reserve-auth.module.ts`) e `email-campaign-batch.controller.ts` (controller de disparo de lote vazio, sem guard e sem sequer estar registrado em nenhum módulo) — ambos ganharam `@UseGuards(AdminJwtGuard, RolesGuard)` + `@Roles(EAdminRole.super_admin)` de defesa em profundidade, usando o guard legado (o `PermissionsGuard` novo só existe a partir da Task 6).

Três anomalias de papel encontradas na auditoria e preservadas (não corrigidas nesta fase): `admins.deletion-status.read` (Task 9, `reserve-auth`), `hotel-portal.clients.deactivate` e `hotel-portal.reports.publish` (Task 18, `reserve-client-portal`) — todas documentadas em `docs/RBAC-MATRIX.md` e nas Global Constraints deste plano.
