# B2C Frontend Integration Guide

Guia completo para integrar o site final dos estudantes com o backend.

## Base URL

```
https://api.seudominio.com/api
```

## Visão Geral do Fluxo

```
1. Estudante cria conta  →  POST /user/
2. Estudante faz login   →  POST /user/authenticate
3. Recebe session_token + session_id
4. Navega pelos cursos   →  GET /products
5. Escolhe um plano      →  POST /subscriptions/checkout
6. Paga no Stripe        →  Stripe Checkout (hosted)
7. Webhook atualiza      →  Backend cria UserSubscription
8. Acessa conteúdo       →  GET /products/:slug/content
```

---

## Headers Obrigatórios

Todas as rotas autenticadas exigem:

```
Authorization: Bearer <session_token>
session-id: <session_id>
x-tenant-id: <tenantId>
Content-Type: application/json
```

> `session_token` e `session_id` são retornados pelo login.
> `x-tenant-id` identifica a instituição — fixo por site.

---

## 1. Autenticação

### Criar Conta

```
POST /user/
```

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone_number": "11999999999",
  "cpf": "12345678901",
  "password": "Senha123!"
}
```

| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `name` | string | ✅ | Mínimo 2 palavras, só letras |
| `email` | string | ✅ | Formato email válido |
| `phone_number` | string | ✅ | Só números |
| `cpf` | string | ✅ | CPF válido, 11 dígitos |
| `password` | string | ✅ | Mínimo 6 caracteres |

**Resposta 201:**
```json
{
  "id": "cm5abc123"
}
```

**Erros:**
- `409` — Email ou CPF já cadastrado

---

### Login

```
POST /user/authenticate
```

**Body:**
```json
{
  "email": "joao@email.com",
  "password": "Senha123!"
}
```

**Resposta 200:**
```json
{
  "session_id": "cm5session123",
  "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "details": {
    "name": "João Silva",
    "email": "joao@email.com"
  }
}
```

> Salve `session_token` como `Authorization: Bearer <token>` e `session_id` no header `session-id`.

**Erros:**
- `401` — Email não encontrado ou senha incorreta

---

## 2. Produtos (Cursos)

Todas as rotas de produtos exigem autenticação + `x-tenant-id`.

### Listar Cursos

```
GET /products
```

**Headers:**
```
Authorization: Bearer <session_token>
session-id: <session_id>
x-tenant-id: <tenantId>
```

**Resposta 200:**
```json
[
  {
    "id": "cm5prod123",
    "stripeProductId": "prod_xxxxx",
    "name": "Curso de JavaScript",
    "description": "Do zero ao avançado",
    "slug": "javascript-avancado",
    "active": true,
    "prices": [
      {
        "id": "cm5price123",
        "stripePriceId": "price_xxxxx",
        "interval": "month",
        "intervalCount": 1,
        "unitAmount": 9900,
        "currency": "brl",
        "active": true
      },
      {
        "id": "cm5price456",
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

> `unitAmount` em centavos: `9900 = R$ 99,00`

---

### Detalhes de um Curso

```
GET /products/:slug
```

**Resposta 200:** Mesmo formato de um item da listagem acima.

**Erros:**
- `404` — Produto não encontrado

---

### Acessar Conteúdo (requer assinatura ativa)

```
GET /products/:slug/content
```

**Resposta 200:**
```json
{
  "content": "ok",
  "slug": "javascript-avancado"
}
```

**Erros:**
- `401` — Não autenticado
- `403` — Sem assinatura ativa para este produto

---

## 3. Assinaturas

### Criar Checkout (iniciar compra)

```
POST /subscriptions/checkout
```

**Headers:**
```
Authorization: Bearer <session_token>
session-id: <session_id>
x-tenant-id: <tenantId>
Content-Type: application/json
```

**Body:**
```json
{
  "priceId": "cm5price123"
}
```

> `priceId` é o **ID interno** do preço (campo `id` do objeto `prices` retornado em `/products`), não o `stripePriceId`.

**Resposta 201:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Redirecione o usuário para `checkoutUrl`. O Stripe cuida do pagamento.

Após o pagamento, o Stripe redireciona para:
- **Sucesso:** `FRONTEND_URL/dashboard?checkout=success&product=<slug>`
- **Cancelamento:** `FRONTEND_URL/products/<slug>?checkout=canceled`

**Erros:**
- `404` — Preço não encontrado ou inativo
- `409` — Usuário já tem assinatura ativa para este produto
- `400` — Stripe não configurado para este tenant

---

### Listar Minhas Assinaturas

```
GET /subscriptions/my
```

**Resposta 200:**
```json
[
  {
    "id": "cm5sub123",
    "tenantId": "cm5tenant123",
    "userId": "cm5user123",
    "productId": "cm5prod123",
    "productPriceId": "cm5price123",
    "stripeSubscriptionId": "sub_xxxxx",
    "stripeCustomerId": "cus_xxxxx",
    "stripePriceId": "price_xxxxx",
    "status": "active",
    "currentPeriodStart": "2026-04-01T00:00:00.000Z",
    "currentPeriodEnd": "2026-05-01T00:00:00.000Z",
    "trialStart": null,
    "trialEnd": null,
    "canceledAt": null,
    "cancelAtPeriodEnd": false,
    "amount": 9900,
    "currency": "brl",
    "createdAt": "2026-04-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z"
  }
]
```

**Status possíveis:**
| Status | Significado |
|--------|-------------|
| `active` | Assinatura ativa, acesso liberado |
| `trialing` | Em período de trial, acesso liberado |
| `past_due` | Pagamento atrasado |
| `canceled` | Cancelada |
| `incomplete` | Pagamento inicial pendente |
| `unpaid` | Não pago |

> Acesso ao conteúdo liberado apenas para `active` e `trialing` com `currentPeriodEnd` no futuro.

---

### Cancelar Assinatura

```
POST /subscriptions/:id/cancel
```

> Cancela ao final do período atual — o acesso continua até `currentPeriodEnd`.

**Resposta 200:**
```json
{
  "message": "Subscription will be canceled at the end of the current period"
}
```

**Erros:**
- `404` — Assinatura não encontrada ou não pertence ao usuário
- `400` — Assinatura já cancelada

---

## 4. Webhook (backend only)

O frontend não chama este endpoint. O Stripe chama automaticamente após cada evento.

```
POST /webhooks/b2c/stripe
```

Eventos processados:
- `checkout.session.completed` → cria `UserSubscription`, vincula `stripe_customer_id` ao `User`
- `customer.subscription.updated` → atualiza status e período
- `customer.subscription.deleted` → marca como `canceled`
- `invoice.paid` → renova período, status `active`
- `invoice.payment_failed` → status `past_due`

---

## 5. Exemplo de Implementação (React/Next.js)

### Hook de autenticação

```typescript
// hooks/useAuth.ts
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL; // https://api.seudominio.com/api
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID; // fixo por site

export function useAuth() {
  const [loading, setLoading] = useState(false);

  const register = async (data: {
    name: string;
    email: string;
    phone_number: string;
    cpf: string;
    password: string;
  }) => {
    setLoading(true);
    const res = await fetch(`${API}/user/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) throw await res.json();
    return res.json();
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    const res = await fetch(`${API}/user/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) throw await res.json();
    const data = await res.json();
    // Salvar no localStorage
    localStorage.setItem('session_token', data.session_token);
    localStorage.setItem('session_id', data.session_id);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('session_id');
  };

  return { register, login, logout, loading };
}
```

### Headers autenticados

```typescript
// lib/api.ts
const API = process.env.NEXT_PUBLIC_API_URL;
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID;

export function authHeaders() {
  return {
    'Authorization': `Bearer ${localStorage.getItem('session_token')}`,
    'session-id': localStorage.getItem('session_id') ?? '',
    'x-tenant-id': TENANT_ID ?? '',
    'Content-Type': 'application/json',
  };
}

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

### Listar cursos

```typescript
// pages/cursos.tsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function CursosPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    apiFetch('/products').then(setProducts);
  }, []);

  return (
    <div>
      {products.map((p: any) => (
        <div key={p.id}>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          {p.prices.map((price: any) => (
            <button
              key={price.id}
              onClick={async () => {
                const { checkoutUrl } = await apiFetch('/subscriptions/checkout', {
                  method: 'POST',
                  body: JSON.stringify({ priceId: price.id }),
                });
                window.location.href = checkoutUrl;
              }}
            >
              {price.interval === 'month' ? 'Mensal' : 'Anual'} —
              R$ {(price.unitAmount / 100).toFixed(2)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Verificar acesso ao conteúdo

```typescript
// pages/cursos/[slug]/aulas.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../../../lib/api';

export default function AulasPage() {
  const { slug } = useRouter().query;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!slug) return;
    apiFetch(`/products/${slug}/content`)
      .then(() => setHasAccess(true))
      .catch((err) => {
        if (err.statusCode === 403) setHasAccess(false);
      });
  }, [slug]);

  if (hasAccess === null) return <p>Verificando acesso...</p>;
  if (!hasAccess) return <p>Você precisa de uma assinatura ativa.</p>;
  return <div>Conteúdo do curso aqui</div>;
}
```

### Minhas assinaturas

```typescript
// pages/minhas-assinaturas.tsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function MinhasAssinaturasPage() {
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    apiFetch('/subscriptions/my').then(setSubs);
  }, []);

  return (
    <ul>
      {subs.map((s: any) => (
        <li key={s.id}>
          Status: {s.status} |
          Próxima cobrança: {new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR')} |
          R$ {(s.amount / 100).toFixed(2)}/{s.currency}
          {s.status !== 'canceled' && !s.cancelAtPeriodEnd && (
            <button
              onClick={async () => {
                await apiFetch(`/subscriptions/${s.id}/cancel`, { method: 'POST' });
                setSubs((prev: any[]) =>
                  prev.map((x) => x.id === s.id ? { ...x, cancelAtPeriodEnd: true } : x)
                );
              }}
            >
              Cancelar
            </button>
          )}
          {s.cancelAtPeriodEnd && (
            <span> (cancela em {new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR')})</span>
          )}
        </li>
      ))}
    </ul>
  );
}
```

---

## 6. Variáveis de Ambiente (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com/api
NEXT_PUBLIC_TENANT_ID=cmodat4pt000030kg41fb255o
```

---

## 7. Checklist de Implementação

- [ ] Página de cadastro (`POST /user/`)
- [ ] Página de login (`POST /user/authenticate`)
- [ ] Salvar `session_token` e `session_id` após login
- [ ] Enviar `Authorization`, `session-id` e `x-tenant-id` em todas as chamadas autenticadas
- [ ] Página de listagem de cursos (`GET /products`)
- [ ] Página de detalhes do curso com botão de compra
- [ ] Redirecionar para `checkoutUrl` após `POST /subscriptions/checkout`
- [ ] Página `/dashboard?checkout=success` (pós-pagamento)
- [ ] Página de minhas assinaturas (`GET /subscriptions/my`)
- [ ] Proteção de rotas de conteúdo (`GET /products/:slug/content`)
- [ ] Botão de cancelamento (`POST /subscriptions/:id/cancel`)
