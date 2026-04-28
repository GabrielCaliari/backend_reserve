# Integração B2C - Painel Administrativo (Dashboard)

## Visão Geral

Este documento descreve como integrar o painel administrativo com o sistema de produtos e assinaturas B2C para estudantes. O painel permite gerenciar produtos educacionais que serão vendidos diretamente aos alunos via Stripe.

## Arquitetura

- **Backend API**: `https://api.seudominio.com/api`
- **Produtos**: Gerenciados no Stripe e sincronizados no banco de dados
- **Assinaturas**: Criadas via Stripe Checkout e gerenciadas via webhooks

## Endpoints Disponíveis

### 1. Listar Produtos (Público)

**Endpoint**: `GET /api/products`

**Descrição**: Lista todos os produtos ativos com seus preços.

**Autenticação**: Não requerida

**Resposta de Sucesso** (200):
```json
[
  {
    "id": "uuid",
    "stripeProductId": "prod_xxxxx",
    "name": "Curso de JavaScript Avançado",
    "description": "Aprenda JavaScript do zero ao avançado",
    "slug": "javascript-avancado",
    "active": true,
    "prices": [
      {
        "id": "uuid",
        "stripePriceId": "price_xxxxx",
        "interval": "month",
        "intervalCount": 1,
        "unitAmount": 9900,
        "currency": "brl",
        "active": true
      },
      {
        "id": "uuid",
        "stripePriceId": "price_yyyyy",
        "interval": "year",
        "intervalCount": 1,
        "unitAmount": 99000,
        "currency": "brl",
        "active": true
      }
    ],
    "createdAt": "2026-04-28T10:00:00.000Z",
    "updatedAt": "2026-04-28T10:00:00.000Z"
  }
]
```

**Exemplo de Requisição**:
```typescript
const response = await fetch('https://api.seudominio.com/api/products', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

const products = await response.json();
```

---

### 2. Obter Produto por Slug (Público)

**Endpoint**: `GET /api/products/:slug`

**Descrição**: Retorna detalhes de um produto específico.

**Autenticação**: Não requerida

**Parâmetros**:
- `slug` (path): Identificador único do produto (ex: "javascript-avancado")

**Resposta de Sucesso** (200):
```json
{
  "id": "uuid",
  "stripeProductId": "prod_xxxxx",
  "name": "Curso de JavaScript Avançado",
  "description": "Aprenda JavaScript do zero ao avançado",
  "slug": "javascript-avancado",
  "active": true,
  "prices": [
    {
      "id": "uuid",
      "stripePriceId": "price_xxxxx",
      "interval": "month",
      "intervalCount": 1,
      "unitAmount": 9900,
      "currency": "brl",
      "active": true
    }
  ],
  "createdAt": "2026-04-28T10:00:00.000Z",
  "updatedAt": "2026-04-28T10:00:00.000Z"
}
```

**Resposta de Erro** (404):
```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

---

## Gerenciamento de Produtos no Dashboard

### Fluxo de Criação de Produtos

1. **Criar Produto no Stripe**:
   - Acesse o [Stripe Dashboard](https://dashboard.stripe.com/products)
   - Crie um novo produto com nome, descrição e imagens
   - Anote o `Product ID` (ex: `prod_xxxxx`)

2. **Criar Preços no Stripe**:
   - No produto criado, adicione um ou mais preços
   - Configure o tipo de cobrança: recorrente (mensal/anual) ou única
   - Anote o `Price ID` (ex: `price_xxxxx`)

3. **Sincronizar no Banco de Dados**:
   - Execute o seguinte SQL para inserir o produto:

```sql
-- Inserir produto
INSERT INTO "Product" (
  id,
  stripe_product_id,
  name,
  description,
  slug,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'prod_xxxxx', -- ID do Stripe
  'Curso de JavaScript Avançado',
  'Aprenda JavaScript do zero ao avançado',
  'javascript-avancado', -- slug único
  true,
  NOW(),
  NOW()
);

-- Inserir preço mensal
INSERT INTO "ProductPrice" (
  id,
  stripe_price_id,
  product_id,
  interval,
  interval_count,
  unit_amount,
  currency,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'price_xxxxx', -- ID do preço no Stripe
  (SELECT id FROM "Product" WHERE slug = 'javascript-avancado'),
  'month',
  1,
  9900, -- R$ 99,00 em centavos
  'brl',
  true,
  NOW(),
  NOW()
);

-- Inserir preço anual (opcional)
INSERT INTO "ProductPrice" (
  id,
  stripe_price_id,
  product_id,
  interval,
  interval_count,
  unit_amount,
  currency,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'price_yyyyy',
  (SELECT id FROM "Product" WHERE slug = 'javascript-avancado'),
  'year',
  1,
  99000, -- R$ 990,00 em centavos
  'brl',
  true,
  NOW(),
  NOW()
);
```

### Interface do Dashboard

#### Tela de Listagem de Produtos

**Componente Sugerido**:
```typescript
// ProductsList.tsx
import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  slug: string;
  active: boolean;
  prices: Array<{
    id: string;
    interval: string;
    intervalCount: number;
    unitAmount: number;
    currency: string;
  }>;
}

export function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.seudominio.com/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando produtos...</div>;

  return (
    <div className="products-list">
      <h1>Produtos Educacionais</h1>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Preços</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.slug}</td>
              <td>{product.active ? 'Ativo' : 'Inativo'}</td>
              <td>
                {product.prices.map(price => (
                  <div key={price.id}>
                    R$ {(price.unitAmount / 100).toFixed(2)} / {price.interval}
                  </div>
                ))}
              </td>
              <td>
                <button onClick={() => window.open(`https://dashboard.stripe.com/products/${product.stripeProductId}`, '_blank')}>
                  Ver no Stripe
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Formulário de Criação de Produto

**Nota**: A criação de produtos deve ser feita diretamente no Stripe Dashboard, seguida pela sincronização manual no banco de dados usando os scripts SQL acima.

**Campos Necessários**:
- Nome do produto
- Descrição
- Slug (identificador único, ex: "javascript-avancado")
- Stripe Product ID (obtido após criar no Stripe)
- Preços associados (Stripe Price IDs)

---

## Monitoramento de Assinaturas

### Visualizar Assinaturas Ativas

Para visualizar todas as assinaturas ativas no sistema:

```sql
SELECT 
  us.id,
  u.email AS student_email,
  p.name AS product_name,
  us.status,
  us.current_period_start,
  us.current_period_end,
  us.amount / 100.0 AS amount_brl,
  us.cancel_at_period_end
FROM "UserSubscription" us
JOIN "User" u ON us.user_id = u.id
JOIN "Product" p ON us.product_id = p.id
WHERE us.status IN ('active', 'trialing')
ORDER BY us.created_at DESC;
```

### Dashboard de Métricas

**Métricas Sugeridas**:
- Total de assinaturas ativas
- Receita mensal recorrente (MRR)
- Taxa de cancelamento (churn)
- Novos assinantes por mês
- Produtos mais vendidos

**Query de Exemplo - MRR**:
```sql
SELECT 
  SUM(amount) / 100.0 AS mrr_total
FROM "UserSubscription"
WHERE status IN ('active', 'trialing')
  AND current_period_end >= NOW();
```

---

## Configuração de Webhooks

### Webhook do Stripe para B2C

**URL do Webhook**: `https://api.seudominio.com/api/webhooks/b2c/stripe`

**Eventos a Configurar no Stripe**:
1. `checkout.session.completed` - Quando o checkout é concluído
2. `customer.subscription.updated` - Quando a assinatura é atualizada
3. `customer.subscription.deleted` - Quando a assinatura é cancelada
4. `invoice.paid` - Quando uma fatura é paga
5. `invoice.payment_failed` - Quando o pagamento falha

**Configuração no Stripe Dashboard**:
1. Acesse [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em "Add endpoint"
3. URL: `https://api.seudominio.com/api/webhooks/b2c/stripe`
4. Selecione os eventos acima
5. Copie o "Signing secret" (ex: `whsec_xxxxx`)
6. Adicione ao `.env`: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`

---

## Variáveis de Ambiente Necessárias

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Frontend URL (para redirect após checkout)
FRONTEND_URL=https://cursos.seudominio.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=seu-secret-aqui
```

---

## Troubleshooting

### Produto não aparece na listagem
- Verifique se `active = true` no banco de dados
- Confirme que o produto tem pelo menos um preço ativo

### Webhook não está funcionando
- Verifique se a URL do webhook está acessível publicamente
- Confirme que o `STRIPE_WEBHOOK_SECRET` está correto no `.env`
- Verifique os logs do Stripe Dashboard para erros

### Assinatura não foi criada após checkout
- Verifique os logs do webhook no Stripe Dashboard
- Confirme que o evento `checkout.session.completed` está configurado
- Verifique se os metadados (`userId`, `productId`, `priceId`) foram enviados corretamente

---

## Próximos Passos

1. Criar interface administrativa para gerenciar produtos
2. Implementar dashboard de métricas e relatórios
3. Adicionar notificações por email para novos assinantes
4. Implementar sistema de cupons de desconto
5. Criar relatórios de receita e churn

---

## Suporte

Para dúvidas ou problemas, consulte:
- [Documentação do Stripe](https://stripe.com/docs)
- [Documentação da API](https://api.seudominio.com/api/docs)
- Logs da aplicação em `logs/application.log`
