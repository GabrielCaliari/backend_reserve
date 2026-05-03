# B2C API - Breaking Changes & Migration Guide

## 🔴 BREAKING CHANGES

### 1. Tabela Renomeada
```
ANTES: b2c_user_subscriptions
AGORA: b2c_user_product_access
```

### 2. Campos Renomeados/Adicionados

#### ProductPrice (b2c_product_prices)
```typescript
// NOVOS CAMPOS
{
  name: string;                  // "Mensal", "Anual", "Vitalício"
  billing_mode: string;          // "unlimited" | "limited" | "one_time" | "one_time_exp"
  max_billing_cycles?: number;   // Para "limited"
  access_duration_days?: number; // Para "one_time_exp"
}

// REMOVIDOS
{
  product_type: string;  // ❌ Removido
  max_charges?: number;  // ❌ Removido
}

// ALTERADOS
{
  interval?: string;  // Agora é NULLABLE (null para one_time)
}
```

#### UserProductAccess (b2c_user_product_access)
```typescript
// NOVOS CAMPOS
{
  access_type: string;              // "subscription" | "lifetime" | "temporary"
  stripe_payment_intent_id?: string; // Para pagamentos únicos
  access_granted_at: Date;
  max_billing_cycles?: number;
  completed_billing_cycles: number;
}

// REMOVIDOS
{
  product_type: string;         // ❌ Removido
  charges_count: number;        // ❌ Removido (agora é completed_billing_cycles)
  max_charges?: number;         // ❌ Removido (agora é max_billing_cycles)
  auto_cancel_scheduled: boolean; // ❌ Removido
}

// ALTERADOS
{
  stripe_subscription_id?: string;  // Agora é NULLABLE (null para one_time)
  current_period_start?: Date;      // Agora é NULLABLE
  current_period_end?: Date;        // Agora é NULLABLE
}
```

---

## 📋 Mapeamento de Valores

### billing_mode (ProductPrice)
```typescript
// ANTES → AGORA
"recurring_infinite"      → "unlimited"
"recurring_limited"       → "limited"
"one_time_with_expiration" → "one_time_exp"
// NOVO
                          → "one_time" (vitalício)
```

### access_type (UserProductAccess)
```typescript
// Baseado no billing_mode:
"unlimited" | "limited"   → access_type: "subscription"
"one_time"                → access_type: "lifetime"
"one_time_exp"            → access_type: "temporary"
```

---

## 🔄 Migration Automática

A migration `20260501000001_refactor_to_user_product_access.sql` faz:

1. ✅ Renomeia tabela automaticamente
2. ✅ Adiciona novos campos
3. ✅ Migra dados existentes
4. ✅ Remove campos antigos
5. ✅ Cria novos índices

**Nenhuma ação manual necessária no banco!**

---

## 🎯 Novos Modos de Cobrança

### 1. unlimited (Recorrente Ilimitado)
```json
{
  "name": "Mensal",
  "billing_mode": "unlimited",
  "interval": "month",
  "interval_count": 1,
  "unit_amount": 4990
}
```
- Cobra indefinidamente até cancelar
- Stripe: `mode: 'subscription'`

### 2. limited (Recorrente Limitado)
```json
{
  "name": "12 Meses",
  "billing_mode": "limited",
  "interval": "month",
  "interval_count": 1,
  "unit_amount": 4990,
  "max_billing_cycles": 12
}
```
- Cobra N vezes e cancela automaticamente
- Stripe: `mode: 'subscription'`
- Backend cancela após N cobranças

### 3. one_time (Pagamento Único Vitalício) ⭐ NOVO
```json
{
  "name": "Vitalício",
  "billing_mode": "one_time",
  "interval": null,
  "unit_amount": 49990
}
```
- Paga 1x, acesso para sempre
- Stripe: `mode: 'payment'` (NÃO cria subscription)
- Vincula com User após compra

### 4. one_time_exp (Pagamento Único com Expiração)
```json
{
  "name": "30 Dias",
  "billing_mode": "one_time_exp",
  "interval": null,
  "unit_amount": 1990,
  "access_duration_days": 30
}
```
- Paga 1x, acesso por X dias
- Stripe: `mode: 'payment'`
- Expira automaticamente

---

## 📡 Endpoints Atualizados

### GET /api/products
```typescript
// Response
{
  "id": "clxxx",
  "name": "Curso React",
  "slug": "react-avancado",
  "prices": [
    {
      "id": "clyyy",
      "name": "Mensal",              // ⭐ NOVO
      "billing_mode": "unlimited",   // ⭐ NOVO (antes: product_type)
      "interval": "month",
      "unit_amount": 4990,
      "stripe_price_id": "price_xxx"
    },
    {
      "id": "clzzz",
      "name": "Vitalício",           // ⭐ NOVO
      "billing_mode": "one_time",    // ⭐ NOVO
      "interval": null,              // ⭐ NOVO (null para one_time)
      "unit_amount": 49990,
      "stripe_price_id": "price_yyy"
    }
  ]
}
```

### GET /api/my/products
```typescript
// Response
{
  "accesses": [
    {
      "id": "clxxx",
      "product": {
        "id": "clyyy",
        "name": "Curso React",
        "slug": "react-avancado"
      },
      "access_type": "subscription",     // ⭐ NOVO (antes: product_type)
      "status": "active",
      "current_period_end": "2026-06-01",
      "completed_billing_cycles": 5,     // ⭐ NOVO (antes: charges_count)
      "max_billing_cycles": 12,          // ⭐ NOVO (antes: max_charges)
      "access_granted_at": "2026-01-01", // ⭐ NOVO
      "access_expires_at": null          // ⭐ NOVO
    },
    {
      "id": "clzzz",
      "product": {
        "id": "claaa",
        "name": "Curso Node",
        "slug": "node-completo"
      },
      "access_type": "lifetime",         // ⭐ NOVO (vitalício)
      "status": "active",
      "stripe_payment_intent_id": "pi_xxx", // ⭐ NOVO
      "access_granted_at": "2026-01-15",
      "access_expires_at": null          // null = nunca expira
    }
  ]
}
```

### POST /api/products/:slug/checkout
```typescript
// Request (sem mudanças)
{
  "priceId": "clxxx"
}

// Response (sem mudanças)
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

---

## 🔐 Guard de Acesso

### ProductAccessGuard
```typescript
// Uso
@UseGuards(JwtGuard, ProductAccessGuard)
@Get('/products/:slug/content')
async getContent(@Param('slug') slug: string) {
  // Só acessa se tiver acesso ativo
}
```

**Lógica de verificação:**
```typescript
// Verifica se tem acesso ativo baseado em:
1. status === 'active'
2. access_type === 'subscription' → current_period_end >= now
3. access_type === 'lifetime' → sempre tem acesso
4. access_type === 'temporary' → access_expires_at >= now
```

---

## 🔄 Webhooks (Backend)

### checkout.session.completed
```typescript
// Agora detecta automaticamente o modo:
if (billing_mode === 'unlimited' || billing_mode === 'limited') {
  // Cria com access_type: 'subscription'
  // stripe_subscription_id preenchido
} else if (billing_mode === 'one_time') {
  // Cria com access_type: 'lifetime'
  // stripe_payment_intent_id preenchido
  // access_expires_at: null
} else if (billing_mode === 'one_time_exp') {
  // Cria com access_type: 'temporary'
  // stripe_payment_intent_id preenchido
  // access_expires_at: calculado
}
```

### invoice.paid
```typescript
// Incrementa completed_billing_cycles
// Se limited e atingiu max_billing_cycles, cancela automaticamente
```

---

## 🎨 Frontend - Mudanças Necessárias

### 1. Listar Produtos
```typescript
// ANTES
price.product_type === 'recurring_infinite'

// AGORA
price.billing_mode === 'unlimited'
```

### 2. Exibir Tipo de Acesso
```typescript
// ANTES
access.product_type === 'recurring_limited'

// AGORA
access.access_type === 'subscription' && access.max_billing_cycles
```

### 3. Verificar Expiração
```typescript
// ANTES
if (access.access_expires_at && access.access_expires_at < now) {
  // Expirado
}

// AGORA (mais robusto)
if (access.access_type === 'temporary' && access.access_expires_at < now) {
  // Expirado
} else if (access.access_type === 'lifetime') {
  // Nunca expira
} else if (access.access_type === 'subscription') {
  // Verifica current_period_end
}
```

### 4. Exibir Progresso (Limited)
```typescript
// ANTES
`${access.charges_count} / ${access.max_charges} cobranças`

// AGORA
`${access.completed_billing_cycles} / ${access.max_billing_cycles} cobranças`
```

### 5. Identificar Vitalício
```typescript
// NOVO
if (access.access_type === 'lifetime') {
  return 'Acesso Vitalício ♾️';
}
```

---

## 📊 Exemplo Completo - Card de Produto

```tsx
// ProductCard.tsx
interface ProductPrice {
  id: string;
  name: string;
  billing_mode: 'unlimited' | 'limited' | 'one_time' | 'one_time_exp';
  interval?: string;
  unit_amount: number;
  max_billing_cycles?: number;
  access_duration_days?: number;
}

function ProductCard({ price }: { price: ProductPrice }) {
  const getBadge = () => {
    switch (price.billing_mode) {
      case 'unlimited':
        return <Badge>Recorrente</Badge>;
      case 'limited':
        return <Badge>Parcelado {price.max_billing_cycles}x</Badge>;
      case 'one_time':
        return <Badge variant="success">Vitalício ♾️</Badge>;
      case 'one_time_exp':
        return <Badge variant="warning">{price.access_duration_days} dias</Badge>;
    }
  };

  const getDescription = () => {
    switch (price.billing_mode) {
      case 'unlimited':
        return `R$ ${price.unit_amount / 100}/mês até cancelar`;
      case 'limited':
        return `R$ ${price.unit_amount / 100}/mês por ${price.max_billing_cycles} meses`;
      case 'one_time':
        return `R$ ${price.unit_amount / 100} - Acesso para sempre`;
      case 'one_time_exp':
        return `R$ ${price.unit_amount / 100} - Acesso por ${price.access_duration_days} dias`;
    }
  };

  return (
    <Card>
      <h3>{price.name}</h3>
      {getBadge()}
      <p>{getDescription()}</p>
      <Button onClick={() => checkout(price.id)}>Comprar</Button>
    </Card>
  );
}
```

---

## 🚀 Checklist de Migração

### Backend (Automático)
- [x] Migration roda automaticamente
- [x] Dados migrados automaticamente
- [x] Webhooks atualizados
- [x] Guard atualizado

### Frontend (Manual)
- [ ] Atualizar tipos TypeScript
- [ ] Substituir `product_type` por `billing_mode`
- [ ] Substituir `charges_count` por `completed_billing_cycles`
- [ ] Substituir `max_charges` por `max_billing_cycles`
- [ ] Adicionar suporte para `access_type`
- [ ] Adicionar suporte para modo `one_time` (vitalício)
- [ ] Atualizar lógica de expiração
- [ ] Testar todos os fluxos

---

## 🆘 Troubleshooting

### Erro: "stripe_subscription_id cannot be null"
**Causa**: Tentando acessar subscription_id em pagamento único  
**Solução**: Verificar `access_type` antes:
```typescript
if (access.access_type === 'subscription') {
  // Só aqui tem stripe_subscription_id
}
```

### Erro: "interval is null"
**Causa**: Tentando acessar interval em one_time  
**Solução**: Verificar `billing_mode` antes:
```typescript
if (price.billing_mode === 'unlimited' || price.billing_mode === 'limited') {
  // Só aqui tem interval
}
```

### Produto vitalício não aparece vinculado ao usuário
**Causa**: Webhook não processou corretamente  
**Solução**: Verificar logs do webhook e reprocessar se necessário

---

## 📞 Suporte

Dúvidas? Entre em contato com o time de backend.

**Última atualização**: 01/05/2026
