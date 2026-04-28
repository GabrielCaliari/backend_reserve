# Guia Completo: Endpoint de Plans (CORRIGIDO)

## 📋 Informações do Endpoint

### GET /api/plans/admin/list

**Descrição:** Lista todos os plans (incluindo inativos) do Stripe usando as chaves do tenant **SELECIONADO**.

**Autenticação:** 
- Requer token JWT de admin via header `Authorization: Bearer <token>`
- **Requer header `x-tenant-id` com o tenant selecionado**

**IMPORTANTE:** O endpoint usa o `x-tenant-id` do **header** (tenant selecionado pelo admin), NÃO o `tenant_id` do token JWT.

---

## 🎯 Arquitetura Multi-Tenant

Um admin pode gerenciar **múltiplos tenants**:

```
Admin (conta de administrador)
  └── Pode gerenciar MÚLTIPLOS tenants
      ├── Tenant A → Stripe Config A → Products A
      ├── Tenant B → Stripe Config B → Products B
      └── Tenant C → Stripe Config C → Products C
```

**Fluxo:**
1. Admin faz login → recebe token JWT
2. Admin **seleciona um tenant** no dropdown
3. Frontend envia `x-tenant-id: <tenant_selecionado>` automaticamente
4. Backend usa o tenant do **header**, não do token

---

## 🔑 Autenticação

O endpoint usa o decorator `@CurrentAdmin()` que extrai informações do token JWT:

```typescript
interface CurrentAdminPayload {
  id: string;
  admin_id: string;
  token: string;
  'session-id': string;
  admin_role?: EAdminRole;
  tenant_id?: string;  // ← ESTE É USADO AUTOMATICAMENTE
  tenant_role?: EAdminRole;
}
```

**O `tenant_id` vem do token JWT do admin**, não de query parameters.

---

## 🚨 Erro 400: Causas Comuns

### 1. Header x-tenant-id não enviado

**Erro:**
```json
{
  "statusCode": 400,
  "message": "x-tenant-id header is required. Please select a tenant.",
  "error": "Bad Request"
}
```

**Causa:** O header `x-tenant-id` não foi enviado na requisição.

**Solução:** Adicione o header com o tenant selecionado:

```bash
curl -X GET "http://localhost:3001/api/plans/admin/list" \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant_id>"  # ← ADICIONE ESTE HEADER
```

### 2. Tenant não tem configuração do Stripe

**Erro:**
```json
{
  "statusCode": 500,
  "message": "Tenant <tenant_id> does not have Stripe configured. Please configure Stripe keys in TenantBillingConfig."
}
```

**Causa:** O tenant selecionado não tem chaves do Stripe configuradas.

**Solução:** Configure as chaves do Stripe para o tenant:

```bash
# Via script
pnpm exec ts-node scripts/configure-tenant-stripe.ts <tenant_id> <stripe_secret_key> <stripe_publishable_key>

# Ou via API
POST /api/payments/billing-config
Headers:
  Authorization: Bearer <admin_token>
  x-tenant-id: <tenant_id>
Body:
{
  "stripeSecretKey": "sk_test_...",
  "stripePublishableKey": "pk_test_...",
  "billingInterval": 2,
  "billingCollectionMode": "upfront",
  "currency": "brl"
}
```

---

## ✅ Chamada Bem-Sucedida

### cURL

```bash
curl -X GET "http://localhost:3001/api/plans/admin/list" \
  -H "Authorization: Bearer <admin_jwt_token>" \
  -H "x-tenant-id: <tenant_selecionado>" \
  -H "Content-Type: application/json"
```

### Postman

```
Method: GET
URL: http://localhost:3001/api/plans/admin/list
Headers:
  Authorization: Bearer <admin_jwt_token>
  x-tenant-id: <tenant_id_selecionado>
  Content-Type: application/json
```

### JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:3001/api/plans/admin/list', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'x-tenant-id': selectedTenantId,  // ← IMPORTANTE!
    'Content-Type': 'application/json'
  }
});

const plans = await response.json();
console.log(plans);
```

---

## 📦 Estrutura da Resposta

### Sucesso (200 OK)

```json
[
  {
    "id": "prod_ABC123",
    "slug": "basico",
    "plan_name": "Plano Básico",
    "description": "Ideal para pequenas empresas",
    "stripe_product_id": "prod_ABC123",
    "stripe_price_id": "price_XYZ789",
    "stripe_trial_price_id": null,
    "billing_interval": 2,
    "unit_amount": 9990,
    "currency": "brl",
    "released_credits": 100,
    "credits_released_trial_period": 20,
    "guest_limit": 3,
    "trial_days": 7,
    "active": true,
    "created_at": "2026-04-27T12:00:00.000Z",
    "updated_at": "2026-04-27T12:00:00.000Z"
  },
  {
    "id": "prod_DEF456",
    "slug": "premium",
    "plan_name": "Plano Premium",
    "description": "Para empresas em crescimento",
    "stripe_product_id": "prod_DEF456",
    "stripe_price_id": "price_UVW456",
    "stripe_trial_price_id": null,
    "billing_interval": 2,
    "unit_amount": 19990,
    "currency": "brl",
    "released_credits": 500,
    "credits_released_trial_period": 50,
    "guest_limit": 10,
    "trial_days": 14,
    "active": true,
    "created_at": "2026-04-27T12:00:00.000Z",
    "updated_at": "2026-04-27T12:00:00.000Z"
  }
]
```

### Campos Explicados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID do produto no Stripe (usado como ID da entidade) |
| `slug` | string | Identificador único do plano (ex: "basico", "premium") |
| `plan_name` | string | Nome do plano exibido ao usuário |
| `description` | string? | Descrição opcional do plano |
| `stripe_product_id` | string | ID do produto no Stripe |
| `stripe_price_id` | string | ID do price recorrente no Stripe |
| `stripe_trial_price_id` | string? | ID do price de trial (se houver) |
| `billing_interval` | number | 1=semanal, 2=mensal, 3=trimestral, 4=anual |
| `unit_amount` | number | Preço em centavos (9990 = R$ 99,90) |
| `currency` | string | Moeda (brl, usd) |
| `released_credits` | number | Créditos liberados por ciclo de cobrança |
| `credits_released_trial_period` | number | Créditos liberados durante trial |
| `guest_limit` | number | Limite de usuários convidados |
| `trial_days` | number | Dias de trial (0 = sem trial) |
| `active` | boolean | Se o plano está ativo |
| `created_at` | Date | Data de criação no Stripe |
| `updated_at` | Date | Data de última atualização no Stripe |

---

## 🔍 Debugging: Como Verificar o Problema

### 1. Verificar o token JWT

Decodifique o token JWT para ver o payload:

```bash
# No site jwt.io ou via código
const decoded = jwt.decode(token);
console.log(decoded);
```

Verifique se tem `tenant_id` no payload.

### 2. Verificar associação Admin-Tenant

```sql
SELECT 
  a.id as admin_id,
  a.email,
  at.tenant_id,
  t.name as tenant_name,
  at.role,
  at.active
FROM "Admin" a
LEFT JOIN "AdminTenant" at ON a.id = at.admin_id
LEFT JOIN "Tenant" t ON at.tenant_id = t.id
WHERE a.id = '<admin_id>';
```

### 3. Verificar configuração do Stripe do tenant

```sql
SELECT 
  tenant_id,
  stripe_publishable_key,
  CASE 
    WHEN stripe_secret_key_hash IS NOT NULL THEN 'Configurado'
    ELSE 'Não configurado'
  END as stripe_secret_status,
  active,
  created_at
FROM "TenantBillingConfig"
WHERE tenant_id = '<tenant_id>';
```

### 4. Verificar logs do servidor

Procure por:
- `[StripeApiPlanRepository] Fetching plans from Stripe API`
- `[StripeApiPlanRepository] Found X products in Stripe`
- Erros de autenticação do Stripe
- Erros de descriptografia

---

## 🛠️ Solução Rápida

Se você está recebendo erro 400, siga estes passos:

1. **Verifique se o admin tem tenant associado:**
   ```bash
   pnpm exec ts-node scripts/list-tenants.ts
   ```

2. **Configure as chaves do Stripe para o tenant:**
   ```bash
   pnpm exec ts-node scripts/configure-tenant-stripe.ts <tenant_id> sk_test_... pk_test_...
   ```

3. **Faça login novamente** para obter um novo token JWT com o `tenant_id`

4. **Teste o endpoint:**
   ```bash
   curl -X GET "http://localhost:3001/api/plans/admin/list" \
     -H "Authorization: Bearer <novo_token>"
   ```

---

## 📝 Notas Importantes

1. **O endpoint busca dados diretamente do Stripe**, não do banco local
2. **Cada tenant tem suas próprias chaves do Stripe**
3. **Os metadados customizados** (credits, guest_limit, trial_days) devem estar nos metadados do produto no Stripe
4. **O `tenant_id` é extraído automaticamente do token JWT**, não precisa passar como parâmetro
5. **Se não houver products no Stripe**, o endpoint retorna array vazio `[]`

---

## 🎯 Exemplo Completo de Teste

```bash
# 1. Listar tenants disponíveis
pnpm exec ts-node scripts/list-tenants.ts

# 2. Configurar Stripe para um tenant
pnpm exec ts-node scripts/configure-tenant-stripe.ts \
  cmodat4pt000030kg41fb255o \
  sk_test_51ABC123... \
  pk_test_51ABC123...

# 3. Fazer login como admin (obter token)
curl -X POST "http://localhost:3001/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "senha123"
  }'

# 4. Listar plans (usar o token do passo 3)
curl -X GET "http://localhost:3001/api/plans/admin/list" \
  -H "Authorization: Bearer <token_do_passo_3>"
```

---

**Data:** 27/04/2026  
**Status:** ✅ Documentação Completa
