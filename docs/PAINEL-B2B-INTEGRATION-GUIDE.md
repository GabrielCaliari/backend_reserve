# Guia Rápido: Integração B2B no Painel

## 🎯 O que é o Sistema B2B?

Sistema para criar links de pagamento únicos (one-time) e enviar para clientes. Ideal para:
- Consultorias
- Produtos físicos
- Serviços pontuais
- Qualquer venda que NÃO seja assinatura recorrente

## 🔑 Autenticação

Todos os endpoints B2B requerem token de admin:

```typescript
const adminToken = localStorage.getItem('adminToken');

const headers = {
  'Authorization': `Bearer ${adminToken}`,
  'Content-Type': 'application/json',
};
```

---

## 📡 Endpoints Disponíveis

### Base URL
```
https://api.seudominio.com/api/b2b/payments
```

---

## 1️⃣ Listar Produtos B2B

### Endpoint
```
GET /api/b2b/payments/products
```

### Exemplo de Requisição
```typescript
const response = await fetch('https://api.seudominio.com/api/b2b/payments/products', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});

const products = await response.json();
```

### Resposta
```json
[
  {
    "id": "cm5abc123",
    "name": "Consultoria Premium",
    "description": "Consultoria especializada de 2 horas",
    "price": 500000,
    "currency": "brl",
    "active": true,
    "stripeProductId": "prod_xxxxx",
    "stripePriceId": "price_xxxxx"
  },
  {
    "id": "cm5def456",
    "name": "Produto Físico X",
    "description": "Descrição do produto",
    "price": 150000,
    "currency": "brl",
    "active": true,
    "stripeProductId": "prod_yyyyy",
    "stripePriceId": "price_yyyyy"
  }
]
```

**Nota**: `price` está em centavos. R$ 5.000,00 = 500000 centavos

---

## 2️⃣ Criar Link de Pagamento

### Endpoint
```
POST /api/b2b/payments/create-link
```

### Body
```json
{
  "productId": "cm5abc123",
  "customerEmail": "cliente@empresa.com",
  "customerName": "João Silva",
  "customerPhone": "+5511999999999"
}
```

**Campos obrigatórios**: `productId`, `customerEmail`  
**Campos opcionais**: `customerName`, `customerPhone`

### Exemplo de Requisição
```typescript
const response = await fetch('https://api.seudominio.com/api/b2b/payments/create-link', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    productId: 'cm5abc123',
    customerEmail: 'cliente@empresa.com',
    customerName: 'João Silva',
  }),
});

const data = await response.json();
```

### Resposta
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6g7h8i9j0",
  "purchaseId": "cm5xyz789"
}
```

### Como Usar
```typescript
// Copiar link para área de transferência
await navigator.clipboard.writeText(data.checkoutUrl);
alert('Link copiado! Envie para o cliente via WhatsApp, email, etc.');

// OU abrir em nova aba para testar
window.open(data.checkoutUrl, '_blank');
```

---

## 3️⃣ Listar Compras (Funil de Vendas)

### Endpoint
```
GET /api/b2b/payments/purchases?status={status}&limit={limit}&offset={offset}
```

### Query Parameters
- `status` (opcional): `all`, `pending`, `completed`, `abandoned`, `refunded`
- `limit` (opcional): Número de resultados (padrão: 50)
- `offset` (opcional): Paginação (padrão: 0)

### Exemplo de Requisição
```typescript
// Listar todas as compras
const response = await fetch('https://api.seudominio.com/api/b2b/payments/purchases?status=all&limit=50', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});

const { data, total } = await response.json();
```

### Resposta
```json
{
  "data": [
    {
      "id": "cm5xyz789",
      "productId": "cm5abc123",
      "productName": "Consultoria Premium",
      "customerEmail": "cliente@empresa.com",
      "customerName": "João Silva",
      "customerPhone": "+5511999999999",
      "amount": 500000,
      "currency": "brl",
      "status": "completed",
      "checkoutStartedAt": "2026-04-28T10:00:00.000Z",
      "checkoutCompletedAt": "2026-04-28T10:05:23.000Z",
      "createdAt": "2026-04-28T10:00:00.000Z"
    },
    {
      "id": "cm5uvw456",
      "productId": "cm5def456",
      "productName": "Produto Físico X",
      "customerEmail": "outro@empresa.com",
      "customerName": null,
      "customerPhone": null,
      "amount": 150000,
      "currency": "brl",
      "status": "abandoned",
      "checkoutStartedAt": "2026-04-28T11:00:00.000Z",
      "checkoutAbandonedAt": "2026-04-28T11:10:00.000Z",
      "createdAt": "2026-04-28T11:00:00.000Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

### Status Possíveis
- `pending`: Cliente ainda não completou o pagamento
- `completed`: ✅ Pagamento confirmado
- `abandoned`: ❌ Cliente abandonou o checkout
- `refunded`: ↩️ Pagamento reembolsado

---

## 4️⃣ Obter Detalhes de uma Compra

### Endpoint
```
GET /api/b2b/payments/purchases/:id
```

### Exemplo de Requisição
```typescript
const purchaseId = 'cm5xyz789';

const response = await fetch(`https://api.seudominio.com/api/b2b/payments/purchases/${purchaseId}`, {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});

const purchase = await response.json();
```

### Resposta
```json
{
  "id": "cm5xyz789",
  "productId": "cm5abc123",
  "productName": "Consultoria Premium",
  "userId": "cm1user123",
  "customerEmail": "cliente@empresa.com",
  "customerName": "João Silva",
  "customerPhone": "+5511999999999",
  "amount": 500000,
  "currency": "brl",
  "status": "completed",
  "stripeCheckoutId": "cs_test_xxxxx",
  "stripePaymentIntent": "pi_xxxxx",
  "checkoutStartedAt": "2026-04-28T10:00:00.000Z",
  "checkoutCompletedAt": "2026-04-28T10:05:23.000Z",
  "metadata": {
    "source": "whatsapp",
    "campaign": "promo-maio"
  },
  "createdAt": "2026-04-28T10:00:00.000Z",
  "updatedAt": "2026-04-28T10:05:23.000Z"
}
```

---

## 5️⃣ Métricas do Funil

### Endpoint
```
GET /api/b2b/payments/metrics
```

### Exemplo de Requisição
```typescript
const response = await fetch('https://api.seudominio.com/api/b2b/payments/metrics', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  },
});

const metrics = await response.json();
```

### Resposta
```json
{
  "totalCheckoutsStarted": 100,
  "totalCheckoutsCompleted": 75,
  "totalCheckoutsAbandoned": 20,
  "totalCheckoutsRefunded": 2,
  "conversionRate": 75.0,
  "abandonmentRate": 20.0,
  "totalRevenue": 3750000.00,
  "averageOrderValue": 50000.00,
  "recentPurchases": [
    {
      "id": "cm5xyz789",
      "customerEmail": "cliente@empresa.com",
      "productName": "Consultoria Premium",
      "amount": 500000,
      "status": "completed",
      "createdAt": "2026-04-28T10:00:00.000Z"
    }
  ]
}
```

**Nota**: `totalRevenue` e `averageOrderValue` estão em centavos

---

## 🎨 Componentes React Prontos

### Componente: Criar Link de Pagamento

```tsx
import { useState, useEffect } from 'react';

export function CreatePaymentLinkForm() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carregar produtos
    fetch('https://api.seudominio.com/api/b2b/payments/products', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    })
      .then(res => res.json())
      .then(data => setProducts(data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://api.seudominio.com/api/b2b/payments/create-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct,
          customerEmail,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar link');
      }

      const { checkoutUrl } = await response.json();

      // Copiar link
      await navigator.clipboard.writeText(checkoutUrl);
      alert('✅ Link criado e copiado!\n\nEnvie para o cliente via WhatsApp, email, etc.');

      // Limpar formulário
      setCustomerEmail('');
      setCustomerName('');
      setCustomerPhone('');
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-payment-link-form">
      <h2>Criar Link de Pagamento</h2>

      <div className="form-group">
        <label>Produto *</label>
        <select
          value={selectedProduct}
          onChange={e => setSelectedProduct(e.target.value)}
          required
        >
          <option value="">Selecione um produto</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name} - R$ {(product.price / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Email do Cliente *</label>
        <input
          type="email"
          value={customerEmail}
          onChange={e => setCustomerEmail(e.target.value)}
          placeholder="cliente@empresa.com"
          required
        />
      </div>

      <div className="form-group">
        <label>Nome do Cliente</label>
        <input
          type="text"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          placeholder="João Silva"
        />
      </div>

      <div className="form-group">
        <label>Telefone do Cliente</label>
        <input
          type="tel"
          value={customerPhone}
          onChange={e => setCustomerPhone(e.target.value)}
          placeholder="+5511999999999"
        />
      </div>

      <button type="submit" disabled={loading || !selectedProduct || !customerEmail}>
        {loading ? 'Criando...' : 'Criar Link de Pagamento'}
      </button>
    </form>
  );
}
```

### Componente: Tabela de Compras

```tsx
import { useState, useEffect } from 'react';

export function PurchasesTable() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadPurchases();
  }, [statusFilter]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.seudominio.com/api/b2b/payments/purchases?status=${statusFilter}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );
      const { data } = await response.json();
      setPurchases(data);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { emoji: '✅', text: 'Pago', color: 'green' },
      pending: { emoji: '⏳', text: 'Pendente', color: 'yellow' },
      abandoned: { emoji: '❌', text: 'Abandonado', color: 'red' },
      refunded: { emoji: '↩️', text: 'Reembolsado', color: 'gray' },
    };
    const badge = badges[status] || { emoji: '❓', text: status, color: 'gray' };
    return (
      <span className={`badge badge-${badge.color}`}>
        {badge.emoji} {badge.text}
      </span>
    );
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="purchases-table">
      <div className="table-header">
        <h2>Compras B2B</h2>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="completed">Pagos</option>
          <option value="pending">Pendentes</option>
          <option value="abandoned">Abandonados</option>
          <option value="refunded">Reembolsados</option>
        </select>
      </div>

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
          {purchases.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center' }}>
                Nenhuma compra encontrada
              </td>
            </tr>
          ) : (
            purchases.map(purchase => (
              <tr key={purchase.id}>
                <td>
                  <div>
                    <strong>{purchase.customerName || 'Sem nome'}</strong>
                    <br />
                    <small>{purchase.customerEmail}</small>
                  </div>
                </td>
                <td>{purchase.productName}</td>
                <td>R$ {(purchase.amount / 100).toFixed(2)}</td>
                <td>{getStatusBadge(purchase.status)}</td>
                <td>{new Date(purchase.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### Componente: Dashboard de Métricas

```tsx
import { useState, useEffect } from 'react';

export function B2BMetricsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.seudominio.com/api/b2b/payments/metrics', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando métricas...</div>;
  if (!metrics) return <div>Erro ao carregar métricas</div>;

  return (
    <div className="metrics-dashboard">
      <h2>Métricas B2B</h2>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">🛒</div>
          <div className="metric-value">{metrics.totalCheckoutsStarted}</div>
          <div className="metric-label">Checkouts Iniciados</div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-value">{metrics.totalCheckoutsCompleted}</div>
          <div className="metric-label">Pagamentos Confirmados</div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">❌</div>
          <div className="metric-value">{metrics.totalCheckoutsAbandoned}</div>
          <div className="metric-label">Checkouts Abandonados</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-value">{metrics.conversionRate.toFixed(1)}%</div>
          <div className="metric-label">Taxa de Conversão</div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">💰</div>
          <div className="metric-value">
            R$ {(metrics.totalRevenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-label">Receita Total</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-value">
            R$ {(metrics.averageOrderValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-label">Ticket Médio</div>
        </div>
      </div>

      <div className="recent-purchases">
        <h3>Compras Recentes</h3>
        <ul>
          {metrics.recentPurchases.map(purchase => (
            <li key={purchase.id}>
              <span>{purchase.customerEmail}</span>
              <span>{purchase.productName}</span>
              <span>R$ {(purchase.amount / 100).toFixed(2)}</span>
              <span>{new Date(purchase.createdAt).toLocaleDateString('pt-BR')}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

## 🎨 CSS Sugerido

```css
.create-payment-link-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.purchases-table {
  padding: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.badge-green { background: #d4edda; color: #155724; }
.badge-yellow { background: #fff3cd; color: #856404; }
.badge-red { background: #f8d7da; color: #721c24; }
.badge-gray { background: #e2e3e5; color: #383d41; }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.metric-card.success {
  border-left: 4px solid #28a745;
}

.metric-card.warning {
  border-left: 4px solid #ffc107;
}

.metric-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: #666;
}
```

---

## ✅ Checklist de Implementação

- [ ] Criar página "Criar Link de Pagamento"
- [ ] Criar página "Funil de Vendas B2B"
- [ ] Criar dashboard de métricas
- [ ] Adicionar filtros na tabela de compras
- [ ] Implementar paginação
- [ ] Adicionar notificações quando pagamento for confirmado
- [ ] Criar relatório exportável (CSV/PDF)

---

## 🐛 Troubleshooting

### Erro 401 (Unauthorized)
- Verificar se o token está sendo enviado corretamente
- Confirmar que o token não expirou

### Erro 404 (Not Found)
- Verificar se a URL está correta
- Confirmar que o backend está rodando

### Link não copia
- Verificar se o navegador suporta `navigator.clipboard`
- Usar fallback com `document.execCommand('copy')`

### Webhook não processa
- Verificar logs do Stripe Dashboard
- Confirmar que o webhook está configurado corretamente
- Verificar se o `STRIPE_WEBHOOK_SECRET_B2B` está correto

---

## 📞 Suporte

Dúvidas? Consulte:
- Documentação completa: `docs/PAYMENT-SYSTEMS-INTEGRATION.md`
- Spec do B2B: `.kiro/specs/b2b-one-time-payments/`
