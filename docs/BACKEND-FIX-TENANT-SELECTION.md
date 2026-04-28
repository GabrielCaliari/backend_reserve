# 🚨 CORREÇÃO URGENTE: Backend deve usar tenant SELECIONADO, não tenant do admin

## ❌ Problema Atual

O endpoint `GET /api/plans/admin/list` está usando o `tenant_id` do **admin** (extraído do token JWT), mas deveria usar o `tenant_id` do **tenant SELECIONADO** (enviado via header `x-tenant-id`).

**Erro atual:**
```json
{
  "message": "tenant_id is required. Admin must be associated with a tenant.",
  "error": "Bad Request",
  "statusCode": 400
}
```

## 🎯 Arquitetura Correta

### Como o sistema funciona:

```
Admin (conta de administrador)
  └── Pode gerenciar MÚLTIPLOS tenants
      ├── Tenant A (Empresa A)
      │   └── Stripe Config A
      │       └── Products/Plans do Stripe A
      ├── Tenant B (Empresa B)
      │   └── Stripe Config B
      │       └── Products/Plans do Stripe B
      └── Tenant C (Empresa C)
          └── Stripe Config C
              └── Products/Plans do Stripe C
```

### Fluxo correto:

1. Admin faz login → recebe token JWT
2. Admin **seleciona um tenant** no dropdown do painel
3. Frontend envia `x-tenant-id: <tenant_selecionado>` em TODAS as requisições
4. Backend usa o **tenant selecionado** (header), NÃO o tenant do admin (token)

## ✅ Correção Necessária

### Endpoint: GET /api/plans/admin/list

**ANTES (ERRADO):**
```typescript
@Get('admin/list')
@UseGuards(AdminJwtGuard)
async listPlans(@CurrentAdmin() admin: CurrentAdminPayload) {
  // ❌ ERRADO: Usa tenant_id do admin
  const tenantId = admin.tenant_id;
  
  if (!tenantId) {
    throw new BadRequestException('tenant_id is required. Admin must be associated with a tenant.');
  }
  
  return this.listPlansUseCase.execute(tenantId);
}
```

**DEPOIS (CORRETO):**
```typescript
@Get('admin/list')
@UseGuards(AdminJwtGuard)
async listPlans(
  @Headers('x-tenant-id') tenantId: string,
  @CurrentAdmin() admin: CurrentAdminPayload
) {
  // ✅ CORRETO: Usa tenant_id do header (tenant selecionado)
  if (!tenantId) {
    throw new BadRequestException('x-tenant-id header is required. Please select a tenant.');
  }
  
  // Opcional: Validar se o admin tem permissão para acessar este tenant
  // await this.validateAdminTenantAccess(admin.admin_id, tenantId);
  
  return this.listPlansUseCase.execute(tenantId);
}
```

## 📋 Outros Endpoints que Precisam da Mesma Correção

Todos os endpoints de admin devem usar o **tenant selecionado** (header), não o tenant do admin (token):

### 1. Plans
- `GET /api/plans/admin/list` ✅ (corrigir)
- `POST /api/plans/admin/create` (verificar)
- `PATCH /api/plans/admin/:id` (verificar)
- `DELETE /api/plans/admin/:id` (verificar)

### 2. Subscriptions
- `GET /api/subscriptions/tenant/:tenantId` ✅ (já usa tenantId do path)

### 3. Billing Config
- `GET /api/payments/billing-config` (verificar)
- `POST /api/payments/billing-config` (verificar)
- `PATCH /api/payments/billing-config` (verificar)

## 🔍 Como Validar

### 1. Verificar o header x-tenant-id

O frontend já envia o header automaticamente via interceptor:

```typescript
// src/common/config/api.ts
api.interceptors.request.use(async (config) => {
  const result = await injectAuthHeaders(config);
  // Adiciona x-tenant-id do tenant selecionado
  return result;
});
```

### 2. Testar com cURL

```bash
# Correto: Usar x-tenant-id header
curl -X GET "http://localhost:3001/api/plans/admin/list" \
  -H "Authorization: Bearer <admin_token>" \
  -H "x-tenant-id: <tenant_selecionado>"
```

### 3. Logs esperados

```
[PlansController] Listing plans for tenant: <tenant_selecionado>
[StripeApiPlanRepository] Fetching plans from Stripe API for tenant: <tenant_selecionado>
[StripeApiPlanRepository] Found X products in Stripe
```

## 💡 Por que isso é importante?

1. **Admin pode gerenciar múltiplos tenants** - não faz sentido usar o tenant do admin
2. **Cada tenant tem seu próprio Stripe** - precisa buscar do Stripe correto
3. **Segurança** - admin só deve acessar tenants que tem permissão
4. **UX** - usuário seleciona o tenant no dropdown, espera ver dados daquele tenant

## 🎯 Resumo da Correção

**Mudar de:**
```typescript
@CurrentAdmin() admin → admin.tenant_id
```

**Para:**
```typescript
@Headers('x-tenant-id') tenantId: string
```

**Em todos os endpoints de admin que acessam dados específicos de tenant.**

---

**Prioridade:** 🔴 CRÍTICA  
**Impacto:** Sistema não funciona sem essa correção  
**Tempo estimado:** 15 minutos

