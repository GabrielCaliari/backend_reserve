# Guia de Integração: Sistemas de Pagamento

## 📋 Visão Geral dos Sistemas

Este projeto possui **3 sistemas de pagamento independentes**:

| Sistema | Tipo | Cliente | Uso | Status |
|---------|------|---------|-----|--------|
| **Sistema Interno** | Assinatura recorrente | Tenants (empresas) | Uso da plataforma ZARP | ✅ Implementado |
| **B2B Payments** | Pagamento único | Empresas/Pessoas | Produtos/serviços pontuais | ✅ Implementado |
| **B2C Subscriptions** | Assinatura recorrente | Estudantes | Cursos online | ✅ Implementado |

---

## 🏢 Sistema 1: Plataforma ZARP (Interno)

### O que é
Sistema de assinaturas para empresas que usam a plataforma ZARP (CNPJ lookup, brand monitoring, etc).

### Características
- **Modelo**: Assinatura recorrente (mensal/anual)
- **Cliente**: Tenant (empresa)
- **Planos**: Free, Basic, Pro, Enterprise
- **Recursos**: Tokens, features, limites de uso
- **Autenticação**: `AdminJwtGuard`

### Endpoints da API

```
# Gerenciamento de Assinaturas (Tenants)
GET    /api/subscriptions/plans                    - Listar planos disponíveis
POST   /api/subscriptions/checkout                 - Criar checkout para tenant
GET    /api/subscriptions/my                       - Ver assinatura do tenant
POST   /api/subscriptions/:id/cancel               - Cancelar assinatura

# Configuração de Cobrança
GET    /api/payments/billing-config                - Ver config de cobrança
PUT    /api/payments/billing-config                - Atualizar config

# Webhook
POST   /api/webhooks/stripe                        - Webhook do Stripe (tenants)
```

### Integração no Painel

**Tela: Planos e Assinaturas**

```typescript
// Listar planos disponíveis
const response = await fetch('https://api.seudominio.com/api/subscriptions/plans', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});

const plans = await response.json();
// [{ id, name, slug, monthPriceId, annualPriceId, features: [...] }]
```

```typescript
// Criar checkout para o tenant
const response = await fetch('https://api.seudominio.com/api/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    priceId: 'price_xxxxx', // ID do preço no Stripe
  }),
});

const { checkoutUrl } = await response.json();
window.location.href = checkoutUrl; // Redirecionar para Stripe
```

---

## 💼 Sistema 2: B2B One-Time Payments (NOVO)

### O que é
Sistema de pagamentos únicos para venda de produtos/serviços pontuais (consultoria, produtos físicos, etc).

### Características
- **Modelo**: Pagamento único (one-time)
- **Cliente**: Empresas ou pessoas físicas
- **Fluxo**: Admin cria link → Envia para cliente → Cliente paga
- **Tracking**: Monitora checkout iniciado, completado, abandonado
- **Autenticação**: `AdminJwtGuard` (apenas admin cria links)

### Endpoints da API

```
# Gerenciamento de Produtos B2B
GET    /api/b2b/payments/products                  - Listar produtos B2B

# Criação de Links de Pagamento
POST   /api/b2b/payments/create-link               - Criar link de pagamento

# Gestão de Compras
GET    /api/b2b/payments/purchases                 - Listar todas as compras
GET    /api/b2b/payments/purchases/:id             - Detalhes de uma compra

# Métricas
GET    /api/b2b/payments/metrics                   - Métricas do funil

# Webhook
POST   /api/webhooks/b2b/stripe                    - Webhook do Stripe (B2B)
```

### Integração no Painel

#### 1. Listar Produtos B2B

```typescript
const response = await fetch('https://api.seudominio.com/api/b2b/payments/products', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});

const products = await response.json();
/*
[
  {
    id: "uuid",
    name: "Consultoria Premium",
    description: "Consultoria especializada",
    price: 500000, // R$ 5.000,00 em centavos
    currency: "brl",
    active: true
  }
]
*/
```

#### 2. Criar Link de Pagamento

```typescript
const response = await fetch('https://api.seudominio.com/api/b2b/payments/create-link', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    productId: "uuid-do-produto",
    customerEmail: "cliente@empresa.com",
    customerName: "João Silva", // opcional
    customerPhone: "+5511999999999", // opcional
  }),
});

const { checkoutUrl, purchaseId } = await response.json();

// Copiar link para enviar ao cliente
navigator.clipboard.writeText(checkoutUrl);
alert('Link copiado! Envie para o cliente.');
```

#### 3. Listar Compras (Funil de Vendas)

```typescript
const response = await fetch('https://api.seudominio.com/api/b2b/payments/purchases?status=all&limit=50', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});

const { data, total } = await response.json();
/*
{
  data: [
    {
      id: "uuid",
      productName: "Consultoria Premium",
      customerEmail: "cliente@empresa.com",
      customerName: "João Silva",
      amount: 500000,
      currency: "brl",
      status: "completed", // pending | completed | abandoned | refunded
      checkoutStartedAt: "2026-04-28T10:00:00Z",
      checkoutCompletedAt: "2026-04-28T10:05:00Z",
      createdAt: "2026-04-28T10:00:00Z"
    },
    {
      id: "uuid",
      productName: "Produto X",
      customerEmail: "outro@empresa.com",
      amount: 300000,
      status: "abandoned", // Cliente abandonou o checkout
      checkoutStartedAt: "2026-04-28T11:00:00Z",
      checkoutAbandonedAt: "2026-04-28T11:10:00Z",
      createdAt: "2026-04-28T11:00:00Z"
    }
  ],
  total: 2
}
*/
```

#### 4. Métricas do Funil

```typescript
const response = await fetch('https://api.seudominio.com/api/b2b/payments/metrics', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});

const metrics = await response.json();
/*
{
  totalCheckoutsStarted: 100,
  totalCheckoutsCompleted: 75,
  totalCheckoutsAbandoned: 20,
  conversionRate: 75.0, // %
  abandonmentRate: 20.0, // %
  totalRevenue: 375000.00, // R$ 3.750.000,00
  averageOrderValue: 5000.00, // R$ 50.000,00
  recentPurchases: [...]
}
*/
```

### Componentes Sugeridos para o Painel

#### Tela: Criar Link de Pagamento

```typescript
// components/B2B/CreatePaymentLink.tsx
import { useState } from 'react';

export function CreatePaymentLink() {
  const [productId, setProductId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/b2b/payments/create-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          customerEmail,
          customerName,
        }),
      });

      const { checkoutUrl } = await response.json();
      
      // Copiar link
      await navigator.clipboard.writeText(checkoutUrl);
      alert('Link criado e copiado! Envie para o cliente.');
    } catch (error) {
      alert('Erro ao criar link: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-payment-link">
      <h2>Criar Link de Pagamento</h2>
      
      <select value={productId} onChange={e => setProductId(e.target.value)}>
        <option value="">Selecione um produto</option>
        {/* Carregar produtos da API */}
      </select>

      <input
        type="email"
        placeholder="Email do cliente"
        value={customerEmail}
        onChange={e => setCustomerEmail(e.target.value)}
      />

      <input
        type="text"
        placeholder="Nome do cliente (opcional)"
        value={customerName}
        onChange={e => setCustomerName(e.target.value)}
      />

      <button onClick={handleCreate} disabled={loading || !productId || !customerEmail}>
        {loading ? 'Criando...' : 'Criar Link'}
      </button>
    </div>
  );
}
```

#### Tela: Funil de Vendas

```typescript
// components/B2B/SalesFunnel.tsx
import { useEffect, useState } from 'react';

export function SalesFunnel() {
  const [purchases, setPurchases] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Carregar compras
    fetch('/api/b2b/payments/purchases', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
    })
      .then(res => res.json())
      .then(data => setPurchases(data.data));

    // Carregar métricas
    fetch('/api/b2b/payments/metrics', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
    })
      .then(res => res.json())
      .then(data => setMetrics(data));
  }, []);

  return (
    <div className="sales-funnel">
      <h2>Funil de Vendas B2B</h2>

      {/* Métricas */}
      {metrics && (
        <div className="metrics">
          <div className="metric-card">
            <h3>Checkouts Iniciados</h3>
            <p>{metrics.totalCheckoutsStarted}</p>
          </div>
          <div className="metric-card">
            <h3>Conversão</h3>
            <p>{metrics.conversionRate.toFixed(1)}%</p>
          </div>
          <div className="metric-card">
            <h3>Receita Total</h3>
            <p>R$ {metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="metric-card">
            <h3>Ticket Médio</h3>
            <p>R$ {metrics.averageOrderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* Tabela de compras */}
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map(purchase => (
            <tr key={purchase.id}>
              <td>
                {purchase.customerName || purchase.customerEmail}
                <br />
                <small>{purchase.customerEmail}</small>
              </td>
              <td>{purchase.productName}</td>
              <td>R$ {(purchase.amount / 100).toFixed(2)}</td>
              <td>
                <span className={`status-${purchase.status}`}>
                  {purchase.status === 'completed' && '✅ Pago'}
                  {purchase.status === 'pending' && '⏳ Pendente'}
                  {purchase.status === 'abandoned' && '❌ Abandonado'}
                  {purchase.status === 'refunded' && '↩️ Reembolsado'}
                </span>
              </td>
              <td>{new Date(purchase.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 👨‍🎓 Sistema 3: B2C Student Subscriptions

### O que é
Sistema de assinaturas recorrentes para estudantes que compram cursos online.

### Características
- **Modelo**: Assinatura recorrente (mensal/anual)
- **Cliente**: Estudantes (pessoas físicas)
- **Fluxo**: Self-service (estudante navega, escolhe, paga)
- **Controle de Acesso**: Guard verifica assinatura ativa
- **Autenticação**: `UserJwtGuard`

### Endpoints da API

```
# Produtos (Cursos)
GET    /api/products                               - Listar cursos disponíveis
GET    /api/products/:slug                         - Detalhes de um curso
GET    /api/products/:slug/content                 - Acessar conteúdo (requer assinatura)

# Assinaturas de Estudantes
POST   /api/subscriptions/checkout                 - Criar checkout (estudante)
GET    /api/subscriptions/my                       - Minhas assinaturas
POST   /api/subscriptions/:id/cancel               - Cancelar assinatura

# Webhook
POST   /api/webhooks/b2c/stripe                    - Webhook do Stripe (B2C)
```

### Integração no Painel

**Nota**: Este sistema é principalmente para o **site final dos estudantes**, não para o painel administrativo.

Para o painel, você pode querer:

#### Visualizar Assinaturas Ativas

```sql
-- Query SQL para dashboard
SELECT 
  us.id,
  u.email AS student_email,
  p.name AS product_name,
  us.status,
  us.current_period_end,
  us.amount / 100.0 AS amount_brl
FROM "b2c_user_subscriptions" us
JOIN "User" u ON us.user_id = u.id
JOIN "Product" p ON us.product_id = p.id
WHERE us.status IN ('active', 'trialing')
ORDER BY us.created_at DESC;
```

---

## 🔧 Configuração de Webhooks no Stripe

### Webhook 1: Sistema Interno (Tenants)

**URL**: `https://api.seudominio.com/api/webhooks/stripe`

**Eventos**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Secret**: `STRIPE_WEBHOOK_SECRET` (por tenant)

---

### Webhook 2: B2B Payments

**URL**: `https://api.seudominio.com/api/webhooks/b2b/stripe`

**Eventos**:
- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `charge.refunded`

**Secret**: `STRIPE_WEBHOOK_SECRET_B2B`

---

### Webhook 3: B2C Subscriptions

**URL**: `https://api.seudominio.com/api/webhooks/b2c/stripe`

**Eventos**:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Secret**: `STRIPE_WEBHOOK_SECRET` (global)

---

## 📊 Resumo para o Painel

### Telas Sugeridas

1. **Planos da Plataforma** (Sistema Interno)
   - Ver plano atual do tenant
   - Upgrade/downgrade de plano
   - Histórico de faturas

2. **Vendas B2B** (NOVO)
   - Criar link de pagamento
   - Funil de vendas (iniciado/completado/abandonado)
   - Lista de compradores
   - Métricas de conversão

3. **Cursos e Assinaturas** (B2C)
   - Lista de produtos/cursos
   - Assinaturas ativas de estudantes
   - Métricas de MRR (Monthly Recurring Revenue)

---

## 🚀 Próximos Passos

1. ✅ Migração do banco de dados aplicada
2. ⏳ Implementar módulo `zarp-b2b-payments`
3. ⏳ Criar componentes do painel para B2B
4. ⏳ Configurar webhook B2B no Stripe
5. ⏳ Testar fluxo completo de pagamento

---

## 📞 Suporte

Para dúvidas sobre integração:
- Sistema Interno: Ver `docs/DASHBOARD-PLANS-INTEGRATION.md`
- B2B Payments: Este documento
- B2C Subscriptions: Ver `docs/B2C-FRONTEND-INTEGRATION.md`
