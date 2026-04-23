# Payments — API Reference para o Painel

> Documento de referência para o painel administrativo implementar a seção de **Payments**.
> Todos os endpoints exigem autenticação via `Authorization: Bearer <token>` + `session-id` + `x-tenant-id`.

---

## Visão Geral da Seção de Payments

O painel deve ter uma seção **Payments** com duas subseções:

| Subseção | Descrição |
|----------|-----------|
| **Billing Config** | Configuração de como o tenant vai cobrar (Stripe keys, price IDs, intervalo, modo de cobrança) |
| **Subscriptions** | Visualização e gerenciamento da assinatura ativa do tenant |

---

## Autenticação

Todos os endpoints abaixo exigem os seguintes headers:

```http
Authorization: Bearer <jwt_token>
session-id: <session_id>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

---

## 1. Billing Config

> Configuração de pagamento por tenant. Cada tenant tem **uma única config**.
> As Stripe secret keys são **criptografadas no banco** e **nunca retornadas** nas respostas — apenas um booleano indicando se estão configuradas.

### 1.1 Buscar configuração atual

```http
GET /api/payments/billing-config
```

**Roles permitidos:** `viewer`, `editor`, `manager`, `owner`, `super_admin`

**Response 200:**
```json
{
  "id": "cma1abc...",
  "tenantId": "cma1tenant...",
  "stripePublishableKey": "pk_live_51...",
  "hasStripeSecretKey": true,
  "hasStripeWebhookSecret": true,
  "stripePriceIds": {
    "monthly": "price_1ABC",
    "quarterly": "price_1DEF",
    "semiannual": "price_1GHI",
    "annual": "price_1JKL"
  },
  "billingInterval": "monthly",
  "billingCollectionMode": "upfront",
  "trialEnabled": true,
  "trialDays": 7,
  "currency": "brl",
  "planName": "Plano Profissional",
  "planDescription": "Acesso completo à plataforma",
  "metadata": {
    "showAnnualToggle": true,
    "highlightPlan": "annual"
  },
  "active": true,
  "createdAt": "2026-04-22T00:00:00Z",
  "updatedAt": "2026-04-22T00:00:00Z"
}
```

**Response 404:** Nenhuma config encontrada para este tenant.

---

### 1.2 Criar configuração

```http
POST /api/payments/billing-config
```

**Roles permitidos:** `manager`, `owner`, `super_admin`

**Request Body:**
```json
{
  "stripePublishableKey": "pk_live_51...",
  "stripeSecretKey": "sk_live_51...",
  "stripeWebhookSecret": "whsec_...",
  "stripePriceIds": {
    "monthly": "price_1ABC",
    "annual": "price_1JKL"
  },
  "billingInterval": "monthly",
  "billingCollectionMode": "upfront",
  "trialEnabled": true,
  "trialDays": 7,
  "currency": "brl",
  "planName": "Plano Profissional",
  "planDescription": "Acesso completo à plataforma",
  "metadata": {
    "showAnnualToggle": true
  }
}
```

**Campos obrigatórios:** `billingInterval`, `billingCollectionMode`

**Response 201:** Objeto `TenantBillingConfig` (mesmo formato do GET)

**Response 409:** Config já existe — use PATCH para atualizar.

---

### 1.3 Atualizar configuração (parcial)

```http
PATCH /api/payments/billing-config
```

**Roles permitidos:** `manager`, `owner`, `super_admin`

Todos os campos são opcionais. Apenas os campos enviados são atualizados.

**Exemplos de uso:**

**Trocar apenas o intervalo de cobrança:**
```json
{
  "billingInterval": "annual",
  "billingCollectionMode": "installments"
}
```

**Adicionar um novo price ID:**
```json
{
  "stripePriceIds": {
    "monthly": "price_1ABC",
    "annual": "price_1JKL"
  }
}
```

**Rotacionar a Stripe secret key:**
```json
{
  "stripeSecretKey": "sk_live_nova_chave..."
}
```

**Desativar a config:**
```json
{
  "active": false
}
```

**Response 200:** Objeto `TenantBillingConfig` atualizado.

**Response 404:** Config não encontrada.

---

### 1.4 Deletar configuração

```http
DELETE /api/payments/billing-config
```

**Roles permitidos:** `manager`, `owner`, `super_admin`

> ⚠️ Isso **não cancela** assinaturas ativas no Stripe. Apenas remove a configuração local.

**Response 204:** Sem conteúdo.

---

## 2. Subscriptions

> Gerenciamento da assinatura Stripe vinculada ao tenant.

### 2.1 Buscar assinatura ativa

```http
GET /api/subscriptions/tenant/:tenantId
```

**Roles permitidos:** `viewer`, `editor`, `manager`, `owner`, `super_admin`

**Response 200:**
```json
{
  "id": "cma1sub...",
  "tenantId": "cma1tenant...",
  "stripeSubscriptionId": "sub_1ABC...",
  "stripeCustomerId": "cus_1ABC...",
  "stripePriceId": "price_1ABC...",
  "stripeProductId": "prod_1ABC...",
  "status": "active",
  "currentPeriodStart": "2026-04-01T00:00:00Z",
  "currentPeriodEnd": "2026-05-01T00:00:00Z",
  "trialStart": null,
  "trialEnd": null,
  "canceledAt": null,
  "cancelAtPeriodEnd": false,
  "amount": 9990,
  "formattedAmount": 99.90,
  "currency": "brl",
  "interval": "month",
  "intervalCount": 1,
  "daysRemaining": 15,
  "isActive": true,
  "isInTrial": false,
  "metadata": {},
  "createdAt": "2026-04-01T00:00:00Z",
  "updatedAt": "2026-04-01T00:00:00Z"
}
```

**Response 200 (sem assinatura):**
```json
{
  "message": "No subscription found for this tenant",
  "subscription": null
}
```

---

### 2.2 Criar checkout session (iniciar assinatura)

```http
POST /api/subscriptions/checkout
```

**Roles permitidos:** `manager`, `owner`, `super_admin`

**Request Body:**
```json
{
  "tenantId": "cma1tenant...",
  "priceId": "price_1ABC...",
  "successUrl": "https://painel.zarp.com/payments/success",
  "cancelUrl": "https://painel.zarp.com/payments/cancel",
  "trialPeriodDays": 7
}
```

> **Dica:** O `priceId` deve vir do campo `stripePriceIds[billingInterval]` da billing config do tenant.

**Response 200:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

O painel deve redirecionar o usuário para `checkoutUrl`.

---

### 2.3 Cancelar assinatura

```http
POST /api/subscriptions/:id/cancel
```

**Roles permitidos:** `manager`, `owner`, `super_admin`

**Request Body:**
```json
{
  "cancelImmediately": false
}
```

| `cancelImmediately` | Comportamento |
|---------------------|---------------|
| `false` (padrão) | Cancela no fim do período atual. Acesso mantido até `currentPeriodEnd`. |
| `true` | Cancela imediatamente. Acesso encerrado agora. |

**Response 200:**
```json
{
  "message": "Subscription will be canceled at the end of the current period",
  "cancelAtPeriodEnd": true,
  "accessUntil": "2026-05-01T00:00:00Z"
}
```

---

## 3. Enums de Referência

### `billingInterval`

| Valor | Descrição | Meses |
|-------|-----------|-------|
| `monthly` | Mensal | 1 |
| `quarterly` | Trimestral | 3 |
| `semiannual` | Semestral | 6 |
| `annual` | Anual | 12 |

### `billingCollectionMode`

| Valor | Descrição | Exemplo |
|-------|-----------|---------|
| `upfront` | Valor total cobrado de uma vez | R$479 cobrado em janeiro |
| `installments` | Parcelas mensais com desconto | R$39,92/mês × 12 |

### `status` (Subscription)

| Valor | Descrição |
|-------|-----------|
| `active` | Assinatura ativa e paga |
| `trialing` | Em período de teste |
| `past_due` | Pagamento atrasado |
| `canceled` | Cancelada |
| `incomplete` | Checkout iniciado, aguardando pagamento |
| `incomplete_expired` | Checkout expirou sem pagamento |
| `unpaid` | Não paga após tentativas |
| `paused` | Pausada |

---

## 4. Fluxo Completo no Painel

### 4.1 Configurar billing pela primeira vez

```
1. Admin acessa Payments > Billing Config
2. Painel chama GET /payments/billing-config
   → 404: exibe formulário de criação
   → 200: exibe dados atuais com botão "Editar"

3. Admin preenche:
   - Stripe publishable key
   - Stripe secret key
   - Stripe webhook secret
   - Price IDs por intervalo
   - Intervalo padrão (monthly/annual)
   - Modo de cobrança (upfront/installments)
   - Trial (sim/não, quantos dias)
   - Nome e descrição do plano

4. Painel chama POST /payments/billing-config
5. Exibe confirmação de sucesso
```

### 4.2 Iniciar assinatura para o tenant

```
1. Admin acessa Payments > Subscriptions
2. Painel chama GET /subscriptions/tenant/:tenantId
   → sem assinatura: exibe botão "Assinar"
   → com assinatura: exibe status atual

3. Admin clica em "Assinar"
4. Painel lê billing config para obter o priceId correto:
   config.stripePriceIds[config.billingInterval]

5. Painel chama POST /subscriptions/checkout com:
   - tenantId
   - priceId (do billing config)
   - successUrl / cancelUrl
   - trialPeriodDays (se config.trialEnabled)

6. Painel redireciona para checkoutUrl
7. Após pagamento, Stripe redireciona para successUrl
8. Painel recarrega GET /subscriptions/tenant/:tenantId
```

### 4.3 Cancelar assinatura

```
1. Admin acessa Payments > Subscriptions
2. Clica em "Cancelar assinatura"
3. Modal de confirmação:
   - "Cancelar no fim do período" (recomendado)
   - "Cancelar imediatamente"

4. Painel chama POST /subscriptions/:id/cancel
5. Exibe data de acesso até (accessUntil)
```

---

## 5. Renderização Dinâmica com `metadata`

O campo `metadata` da billing config é livre e pode ser usado para passar hints de UI ao painel:

```json
{
  "metadata": {
    "showAnnualToggle": true,
    "highlightPlan": "annual",
    "discountBadge": "20% OFF",
    "availableIntervals": ["monthly", "annual"],
    "features": [
      "Leads ilimitados",
      "Blog com CMS",
      "Agendamentos",
      "Suporte prioritário"
    ]
  }
}
```

O painel pode usar esses dados para:
- Mostrar/esconder o toggle de período
- Destacar um plano específico
- Exibir badge de desconto
- Listar features do plano

---

## 6. Segurança — O que o painel NUNCA deve fazer

- ❌ Nunca exibir `stripeSecretKey` ou `stripeWebhookSecret` — eles nunca são retornados pela API
- ❌ Nunca armazenar keys no localStorage ou sessionStorage
- ✅ Usar apenas `stripePublishableKey` no frontend para inicializar Stripe.js
- ✅ Verificar `hasStripeSecretKey` e `hasStripeWebhookSecret` para indicar status de configuração

---

## 7. Erros Comuns

| Status | Mensagem | Causa |
|--------|----------|-------|
| `401` | Unauthorized | Token JWT inválido ou expirado |
| `403` | Forbidden | Role insuficiente para a operação |
| `404` | Not found | Config ou subscription não existe |
| `409` | Conflict | Config já existe (use PATCH) |
| `400` | Bad Request | Dados inválidos no body |

---

## 8. Exemplo de Componente React (Pseudocódigo)

```tsx
// Payments/BillingConfig.tsx
function BillingConfigSection({ tenantId }) {
  const { data: config, isLoading } = useQuery(
    ['billing-config', tenantId],
    () => api.get('/payments/billing-config')
  );

  if (isLoading) return <Spinner />;

  if (!config) {
    return <CreateBillingConfigForm tenantId={tenantId} />;
  }

  return (
    <div>
      <h2>{config.planName ?? 'Configuração de Pagamento'}</h2>

      <StatusBadge
        label="Stripe Secret Key"
        configured={config.hasStripeSecretKey}
      />
      <StatusBadge
        label="Webhook Secret"
        configured={config.hasStripeWebhookSecret}
      />

      <Field label="Intervalo" value={config.billingInterval} />
      <Field label="Modo de cobrança" value={config.billingCollectionMode} />
      <Field label="Trial" value={config.trialEnabled ? `${config.trialDays} dias` : 'Desativado'} />

      <PriceIdsTable priceIds={config.stripePriceIds} />

      <EditBillingConfigButton tenantId={tenantId} current={config} />
    </div>
  );
}

// Payments/Subscriptions.tsx
function SubscriptionsSection({ tenantId }) {
  const { data: sub } = useQuery(
    ['subscription', tenantId],
    () => api.get(`/subscriptions/tenant/${tenantId}`)
  );
  const { data: config } = useQuery(
    ['billing-config', tenantId],
    () => api.get('/payments/billing-config')
  );

  const handleSubscribe = async () => {
    const priceId = config.stripePriceIds?.[config.billingInterval];
    const { checkoutUrl } = await api.post('/subscriptions/checkout', {
      tenantId,
      priceId,
      successUrl: `${window.location.origin}/payments/success`,
      cancelUrl: `${window.location.origin}/payments/cancel`,
      trialPeriodDays: config.trialEnabled ? config.trialDays : undefined,
    });
    window.location.href = checkoutUrl;
  };

  if (!sub?.isActive) {
    return <Button onClick={handleSubscribe}>Assinar Agora</Button>;
  }

  return (
    <SubscriptionCard
      status={sub.status}
      amount={sub.formattedAmount}
      currency={sub.currency}
      interval={sub.interval}
      periodEnd={sub.currentPeriodEnd}
      daysRemaining={sub.daysRemaining}
      cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
      onCancel={() => cancelSubscription(sub.id)}
    />
  );
}
```

---

## 9. Resumo dos Endpoints

| Método | Endpoint | Role mínimo | Descrição |
|--------|----------|-------------|-----------|
| `GET` | `/api/payments/billing-config` | `viewer` | Buscar config do tenant |
| `POST` | `/api/payments/billing-config` | `manager` | Criar config |
| `PATCH` | `/api/payments/billing-config` | `manager` | Atualizar config |
| `DELETE` | `/api/payments/billing-config` | `manager` | Deletar config |
| `GET` | `/api/subscriptions/tenant/:id` | `viewer` | Buscar assinatura |
| `POST` | `/api/subscriptions/checkout` | `manager` | Iniciar checkout |
| `POST` | `/api/subscriptions/:id/cancel` | `manager` | Cancelar assinatura |
| `POST` | `/api/webhooks/stripe` | — (Stripe signature) | Webhook do Stripe |

---

*Última atualização: 23/04/2026*
