# Guia de Integração - Site Final (Produtos B2C e B2B)

## 📋 Visão Geral

Este guia explica como o **site final** deve integrar com o backend para:
- **Produtos B2C (Recorrentes)**: Cursos com assinatura que requerem login
- **Produtos B2B (Avulsos)**: Produtos one-time que podem ser comprados sem login

---

## 🎯 Tipos de Produtos

### B2C - Produtos Recorrentes (Cursos)
- **Requer autenticação**: Sim, usuário deve estar logado
- **Tipo de pagamento**: Assinatura recorrente (mensal/anual) ou vitalício
- **Acesso**: Vinculado à conta do usuário
- **Endpoint**: `/api/products`

### B2B - Produtos Avulsos
- **Requer autenticação**: Não, leads podem comprar sem conta
- **Tipo de pagamento**: One-time payment
- **Acesso**: Criado após pagamento (lead vira user)
- **Endpoint**: `/api/public/b2b/products`

---

## 🔐 Pré-requisitos

### 1. Produtos B2C (Cursos) - Usuário Autenticado
O usuário **DEVE estar logado** antes de comprar. O backend precisa do `userId` para vincular o produto à conta.

```typescript
// Estado de autenticação necessário
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;           // userId (obrigatório)
    email: string;
    name: string;
  };
  token: string;          // JWT token
  tenantId: string;       // tenant_id
}
```

**⚠️ IMPORTANTE**: Se o usuário não estiver logado, redirecione para login antes de permitir compra.

### 2. Produtos B2B (Avulsos) - Lead Não Autenticado
O lead **NÃO precisa estar logado**. Captura dados básicos antes do checkout.

```typescript
// Dados do lead necessários
interface LeadData {
  name: string;           // Nome completo
  email: string;          // Email
  phone: string;          // Telefone (formato E.164)
}
```

**✅ FLUXO**: Lead → Modal (captura dados) → Checkout → Pagamento → Vira User

---

## 🎯 Fluxo Completo de Compra

### Produtos B2C (Cursos com Login)
```
1. Login → 2. Listar Produtos → 3. Exibir Detalhes → 4. Criar Checkout → 5. Redirecionar Stripe → 6. Webhook → 7. Verificar Acesso
```

### Produtos B2B (Avulsos sem Login)
```
1. Listar Produtos → 2. Clicar Comprar → 3. Modal (captura dados) → 4. Criar Checkout → 5. Redirecionar Stripe → 6. Webhook → 7. Lead vira User
```

---

## 📡 Endpoints da API

### Base URL
```
https://api.seu-dominio.com/api
```

### Headers Obrigatórios

#### Para Produtos B2C (Autenticados)
```typescript
{
  "Authorization": "Bearer <jwt_token>",
  "x-tenant-id": "<tenant_id>",
  "Content-Type": "application/json"
}
```

#### Para Produtos B2B (Públicos)
```typescript
{
  "x-tenant-id": "<tenant_id>",
  "Content-Type": "application/json"
}
```

---

## 🛍️ PRODUTOS B2C (CURSOS RECORRENTES)

## 1️⃣ Listar Produtos B2C

### Endpoint
```
GET /products
```

### Request
```typescript
// Headers apenas (sem body)
const response = await fetch('https://api.seu-dominio.com/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
  }
});
```

### Response
```json
[
  {
    "id": "prod_123",
    "name": "Curso React Avançado",
    "slug": "react-avancado",
    "description": "Aprenda React do zero ao avançado",
    "categories": ["programação", "javascript", "frontend"],
    "active": true,
    "prices": [
      {
        "id": "price_123",
        "name": "Mensal",
        "billingMode": "unlimited",
        "interval": "month",
        "intervalCount": 1,
        "unitAmount": 4990,
        "currency": "brl",
        "stripePriceId": "price_stripe_xxx"
      },
      {
        "id": "price_456",
        "name": "Anual",
        "billingMode": "unlimited",
        "interval": "year",
        "intervalCount": 1,
        "unitAmount": 49990,
        "currency": "brl",
        "stripePriceId": "price_stripe_yyy"
      },
      {
        "id": "price_789",
        "name": "Vitalício",
        "billingMode": "one_time",
        "interval": null,
        "unitAmount": 99990,
        "currency": "brl",
        "stripePriceId": "price_stripe_zzz"
      }
    ],
    "createdAt": "2026-05-01T00:00:00Z",
    "updatedAt": "2026-05-01T00:00:00Z"
  }
]
```

---

## 2️⃣ Filtrar por Categoria (B2C)

### Opção 1: Filtro no Frontend
```typescript
// Filtrar localmente após buscar todos os produtos
const products = await fetchProducts();
const filtered = products.filter(p => 
  p.categories.includes('programação')
);
```

### Opção 2: Filtro no Backend (futuro)
```typescript
// Endpoint futuro (ainda não implementado)
GET /products?category=programação
```

---

## 3️⃣ Exibir Produtos B2C no Site

### Exemplo de Card de Produto

```tsx
interface ProductCardProps {
  product: Product;
  onBuy: (priceId: string) => void;
}

function ProductCard({ product, onBuy }: ProductCardProps) {
  return (
    <div className="product-card">
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      
      {/* Categorias */}
      <div className="categories">
        {product.categories.map(cat => (
          <span key={cat} className="badge">{cat}</span>
        ))}
      </div>

      {/* Opções de Preço */}
      <div className="prices">
        {product.prices.map(price => (
          <div key={price.id} className="price-option">
            <h3>{price.name}</h3>
            <p className="amount">
              {formatPrice(price.unitAmount, price.currency)}
              {price.interval && `/${price.interval}`}
            </p>
            
            {/* Badge do tipo */}
            {getBillingModeBadge(price.billingMode)}
            
            <button onClick={() => onBuy(price.id)}>
              Comprar Agora
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper: Formatar preço
function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

// Helper: Badge do modo de cobrança
function getBillingModeBadge(mode: string) {
  const badges = {
    unlimited: <Badge variant="primary">Recorrente</Badge>,
    limited: <Badge variant="warning">Limitado</Badge>,
    one_time: <Badge variant="success">Vitalício ♾️</Badge>,
    one_time_exp: <Badge variant="info">Temporário</Badge>,
  };
  return badges[mode] || null;
}
```

---

## 4️⃣ Criar Checkout B2C (Comprar)

### Endpoint
```
POST /products/:slug/checkout
```

### Request
```typescript
const response = await fetch(
  `https://api.seu-dominio.com/api/products/${product.slug}/checkout`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId: 'price_123', // ID do backend (NÃO do Stripe)
    }),
  }
);

const data = await response.json();
```

### Response
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxxxx"
}
```

### ⚠️ IMPORTANTE: O que o Backend Faz

Quando você chama `/checkout`, o backend:

1. ✅ Valida se o usuário está autenticado
2. ✅ Busca o produto e preço no banco
3. ✅ Cria uma sessão de checkout no Stripe com **metadata**:
   ```json
   {
     "userId": "user_123",
     "productId": "prod_123",
     "priceId": "price_123",
     "tenantId": "tenant_123",
     "billingMode": "unlimited"
   }
   ```
4. ✅ Retorna a URL do Stripe Checkout

**Essa metadata é CRUCIAL** para o webhook funcionar!

---

## 5️⃣ Redirecionar para Stripe (B2C)

### Código
```typescript
async function handleBuy(priceId: string) {
  try {
    // 1. Verificar se está logado
    if (!isAuthenticated) {
      router.push('/login?redirect=/produtos');
      return;
    }

    // 2. Criar checkout
    const response = await fetch(
      `${API_URL}/products/${productSlug}/checkout`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao criar checkout');
    }

    const { checkoutUrl } = await response.json();

    // 3. Redirecionar para Stripe
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error('Erro na compra:', error);
    alert('Erro ao processar compra. Tente novamente.');
  }
}
```

---

## 6️⃣ Stripe Processa Pagamento (B2C)

### O que acontece no Stripe:

1. Usuário preenche dados do cartão
2. Stripe processa pagamento
3. Stripe envia webhook para: `https://api.seu-dominio.com/api/webhooks/stripe`
4. Backend recebe evento `checkout.session.completed`
5. Backend cria `UserProductAccess` vinculando produto ao usuário

### ⚠️ IMPORTANTE: Configuração do Webhook

**No Stripe Dashboard:**
- URL: `https://api.seu-dominio.com/api/webhooks/stripe`
- Eventos:
  ```
  checkout.session.completed
  customer.subscription.updated
  customer.subscription.deleted
  invoice.paid
  invoice.payment_failed
  payment_intent.succeeded
  payment_intent.payment_failed
  ```
- Secret: `whsec_xxxxx` (salvar no banco via painel admin)

---

## 7️⃣ Verificar Acesso do Usuário (B2C)

### Endpoint
```
GET /my/products
```

### Request
```typescript
const response = await fetch('https://api.seu-dominio.com/api/my/products', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
  }
});
```

### Response
```json
{
  "accesses": [
    {
      "id": "access_123",
      "product": {
        "id": "prod_123",
        "name": "Curso React Avançado",
        "slug": "react-avancado",
        "categories": ["programação", "javascript"]
      },
      "accessType": "subscription",
      "status": "active",
      "currentPeriodEnd": "2026-06-01T00:00:00Z",
      "completedBillingCycles": 1,
      "maxBillingCycles": null,
      "accessGrantedAt": "2026-05-01T00:00:00Z",
      "accessExpiresAt": null
    },
    {
      "id": "access_456",
      "product": {
        "id": "prod_456",
        "name": "Curso Node.js",
        "slug": "nodejs-completo",
        "categories": ["programação", "backend"]
      },
      "accessType": "lifetime",
      "status": "active",
      "stripePaymentIntentId": "pi_xxx",
      "accessGrantedAt": "2026-04-15T00:00:00Z",
      "accessExpiresAt": null
    }
  ]
}
```

---

## 8️⃣ Proteger Conteúdo (B2C)

### Verificar se tem acesso antes de exibir conteúdo

```typescript
async function checkAccess(productSlug: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.seu-dominio.com/api/products/${productSlug}/content`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
        }
      }
    );

    return response.ok; // 200 = tem acesso, 403 = sem acesso
  } catch {
    return false;
  }
}

// Uso
function CoursePage({ slug }: { slug: string }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess(slug).then(access => {
      setHasAccess(access);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <Loading />;
  
  if (!hasAccess) {
    return (
      <div>
        <h1>Você não tem acesso a este curso</h1>
        <Link href={`/produtos/${slug}`}>Comprar Agora</Link>
      </div>
    );
  }

  return <CourseContent slug={slug} />;
}
```

---

## 🛒 PRODUTOS B2B (AVULSOS SEM LOGIN)

## 1️⃣ Listar Produtos B2B (Público)

### Endpoint
```
GET /public/b2b/products
```

### Request
```typescript
// Não requer autenticação!
const response = await fetch('https://api.seu-dominio.com/api/public/b2b/products', {
  headers: {
    'x-tenant-id': tenantId,
  }
});
```

### Response
```json
[
  {
    "id": "cm5abc123",
    "name": "Consultoria Empresarial",
    "description": "Consultoria especializada para seu negócio",
    "categories": ["consultoria", "empresarial"],
    "price": 50000,
    "currency": "brl",
    "active": true,
    "stripeProductId": "prod_xxx",
    "stripePriceId": "price_xxx"
  }
]
```

---

## 2️⃣ Criar Checkout B2B (Lead sem Login)

### Endpoint
```
POST /public/b2b/products/:productId/checkout
```

### Request
```typescript
const response = await fetch(
  `https://api.seu-dominio.com/api/public/b2b/products/${productId}/checkout`,
  {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: 'cm5abc123',
      leadName: 'João Silva',
      leadEmail: 'joao@email.com',
      leadPhone: '+5511999999999',
    }),
  }
);

const data = await response.json();
```

### Response
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxxxx",
  "purchaseId": "cm5xyz789"
}
```

### ⚠️ IMPORTANTE: O que o Backend Faz

Quando você chama `/public/b2b/products/:id/checkout`, o backend:

1. ✅ **NÃO valida autenticação** (endpoint público)
2. ✅ Busca o produto e valida se está ativo
3. ✅ Cria registro de `B2BPurchase` com status "pending"
4. ✅ Cria sessão de checkout no Stripe com **metadata especial**:
   ```json
   {
     "tenant_id": "tenant_123",
     "product_id": "prod_123",
     "lead_name": "João Silva",
     "lead_email": "joao@email.com",
     "lead_phone": "+5511999999999",
     "is_lead_purchase": "true"
   }
   ```
5. ✅ Retorna URL do Stripe Checkout

**Essa metadata é CRUCIAL** para o webhook converter o lead em user!

---

## 3️⃣ Fluxo Completo B2B com Modal

### Código Exemplo
```typescript
async function handleB2BPurchase(productId: string) {
  // 1. Abrir modal para capturar dados do lead
  const leadData = await openLeadModal();
  
  if (!leadData) {
    return; // Usuário cancelou
  }

  try {
    // 2. Criar checkout com dados do lead
    const response = await fetch(
      `${API_URL}/public/b2b/products/${productId}/checkout`,
      {
        method: 'POST',
        headers: {
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          leadName: leadData.name,
          leadEmail: leadData.email,
          leadPhone: leadData.phone,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao criar checkout');
    }

    const { checkoutUrl } = await response.json();

    // 3. Redirecionar para Stripe
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error('Erro na compra:', error);
    alert('Erro ao processar compra. Tente novamente.');
  }
}

// Modal para capturar dados do lead
async function openLeadModal(): Promise<LeadData | null> {
  return new Promise((resolve) => {
    // Implementar modal com formulário
    // Retornar dados ou null se cancelar
  });
}
```

---

## 4️⃣ Webhook Converte Lead em User

### O que acontece após pagamento:

1. Lead paga no Stripe
2. Stripe envia webhook `checkout.session.completed`
3. Backend detecta `is_lead_purchase: "true"` na metadata
4. Backend cria novo `User` com dados do lead
5. Backend cria `B2BPurchase` com status "completed"
6. Lead agora é um User e pode fazer login

### Carrinho Abandonado (Remarketing)

Se o lead **não completar o pagamento**:
- Registro de `B2BPurchase` fica com status "pending"
- Dados do lead ficam salvos (nome, email, telefone)
- Pode ser usado para campanhas de remarketing

---

## 5️⃣ Exemplo de Card B2B

```tsx
interface B2BProductCardProps {
  product: B2BProduct;
  onBuy: (productId: string) => void;
}

function B2BProductCard({ product, onBuy }: B2BProductCardProps) {
  return (
    <div className="product-card">
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      
      {/* Categorias */}
      <div className="categories">
        {product.categories.map(cat => (
          <span key={cat} className="badge">{cat}</span>
        ))}
      </div>

      {/* Preço */}
      <div className="price">
        <h3>{formatPrice(product.price, product.currency)}</h3>
        <span className="badge-one-time">Pagamento Único</span>
      </div>

      {/* Botão de compra - NÃO requer login */}
      <button onClick={() => onBuy(product.id)}>
        Comprar Agora
      </button>
      
      <p className="info">
        ℹ️ Não precisa criar conta. Preencha seus dados no próximo passo.
      </p>
    </div>
  );
}
```

---

## 🎨 Exemplo Completo - Página de Produtos B2C

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categories: string[];
  prices: ProductPrice[];
}

interface ProductPrice {
  id: string;
  name: string;
  billingMode: 'unlimited' | 'limited' | 'one_time' | 'one_time_exp';
  interval?: string;
  unitAmount: number;
  currency: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, token, tenantId, isAuthenticated } = useAuth();
  const router = useRouter();

  // 1. Buscar produtos
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const response = await fetch('https://api.seu-dominio.com/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
        }
      });
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  }

  // 2. Filtrar por categoria
  const filteredProducts = selectedCategory
    ? products.filter(p => p.categories.includes(selectedCategory))
    : products;

  // 3. Obter todas as categorias únicas
  const allCategories = Array.from(
    new Set(products.flatMap(p => p.categories))
  );

  // 4. Comprar produto
  async function handleBuy(productSlug: string, priceId: string) {
    // Verificar autenticação
    if (!isAuthenticated) {
      router.push(`/login?redirect=/produtos/${productSlug}`);
      return;
    }

    try {
      const response = await fetch(
        `https://api.seu-dominio.com/api/products/${productSlug}/checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ priceId }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao criar checkout');
      }

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Erro na compra:', error);
      alert('Erro ao processar compra. Tente novamente.');
    }
  }

  if (loading) return <div>Carregando produtos...</div>;

  return (
    <div className="products-page">
      <h1>Nossos Cursos</h1>

      {/* Filtro de Categorias */}
      <div className="categories-filter">
        <button
          onClick={() => setSelectedCategory(null)}
          className={!selectedCategory ? 'active' : ''}
        >
          Todos
        </button>
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? 'active' : ''}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de Produtos */}
      <div className="products-grid">
        {filteredProducts.map(product => (
          <div key={product.id} className="product-card">
            <h2>{product.name}</h2>
            <p>{product.description}</p>

            {/* Categorias */}
            <div className="categories">
              {product.categories.map(cat => (
                <span key={cat} className="badge">{cat}</span>
              ))}
            </div>

            {/* Preços */}
            <div className="prices">
              {product.prices.map(price => (
                <div key={price.id} className="price-option">
                  <h3>{price.name}</h3>
                  <p className="amount">
                    {formatPrice(price.unitAmount, price.currency)}
                    {price.interval && `/${price.interval}`}
                  </p>
                  <button onClick={() => handleBuy(product.slug, price.id)}>
                    Comprar
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
```

---

## 🎨 Exemplo Completo - Página de Produtos B2B

```tsx
'use client';

import { useState, useEffect } from 'react';

interface B2BProduct {
  id: string;
  name: string;
  description: string;
  categories: string[];
  price: number;
  currency: string;
  active: boolean;
}

interface LeadData {
  name: string;
  email: string;
  phone: string;
}

export default function B2BProductsPage() {
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const tenantId = 'your-tenant-id'; // Obter do contexto

  // 1. Buscar produtos (público, sem autenticação)
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const response = await fetch('https://api.seu-dominio.com/api/public/b2b/products', {
        headers: {
          'x-tenant-id': tenantId,
        }
      });
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  }

  // 2. Abrir modal para capturar dados do lead
  function handleBuyClick(productId: string) {
    setSelectedProduct(productId);
    setShowModal(true);
  }

  // 3. Processar compra com dados do lead
  async function handleLeadSubmit(leadData: LeadData) {
    if (!selectedProduct) return;

    try {
      const response = await fetch(
        `https://api.seu-dominio.com/api/public/b2b/products/${selectedProduct}/checkout`,
        {
          method: 'POST',
          headers: {
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: selectedProduct,
            leadName: leadData.name,
            leadEmail: leadData.email,
            leadPhone: leadData.phone,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao criar checkout');
      }

      const { checkoutUrl } = await response.json();
      
      // Redirecionar para Stripe
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Erro na compra:', error);
      alert('Erro ao processar compra. Tente novamente.');
    }
  }

  if (loading) return <div>Carregando produtos...</div>;

  return (
    <div className="b2b-products-page">
      <h1>Produtos Avulsos</h1>
      <p>Compre sem precisar criar conta. Preencha seus dados no checkout.</p>

      {/* Lista de Produtos */}
      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <h2>{product.name}</h2>
            <p>{product.description}</p>

            {/* Categorias */}
            <div className="categories">
              {product.categories.map(cat => (
                <span key={cat} className="badge">{cat}</span>
              ))}
            </div>

            {/* Preço */}
            <div className="price">
              <h3>{formatPrice(product.price, product.currency)}</h3>
              <span className="badge-one-time">Pagamento Único</span>
            </div>

            <button onClick={() => handleBuyClick(product.id)}>
              Comprar Agora
            </button>
            
            <p className="info">
              ℹ️ Não precisa criar conta
            </p>
          </div>
        ))}
      </div>

      {/* Modal para capturar dados do lead */}
      {showModal && (
        <LeadModal
          onSubmit={handleLeadSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// Componente do Modal
function LeadModal({ 
  onSubmit, 
  onClose 
}: { 
  onSubmit: (data: LeadData) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<LeadData>({
    name: '',
    email: '',
    phone: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(formData);
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Finalize sua compra</h2>
        <p>Preencha seus dados para continuar</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nome completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <input
            type="tel"
            placeholder="Telefone (com DDD)"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit">
              Ir para Pagamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
```

---

## 🔄 Fluxo de Dados Completo

```
┌─────────────┐
│ Site Final  │ (B2C - Requer Login)
└──────┬──────┘
       │ 1. GET /products
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 2. Retorna produtos
       ▼
┌─────────────┐
│ Site Final  │ Exibe produtos com categorias
└──────┬──────┘
       │ 3. Usuário clica "Comprar"
       │ 4. POST /products/:slug/checkout
       ▼
┌─────────────┐
│   Backend   │ Cria checkout no Stripe com metadata
└──────┬──────┘
       │ 5. Retorna checkoutUrl
       ▼
┌─────────────┐
│ Site Final  │ Redireciona para Stripe
└─────────────┘
       │
       ▼
┌─────────────┐
│   Stripe    │ Usuário paga
└──────┬──────┘
       │ 6. Webhook: checkout.session.completed
       ▼
┌─────────────┐
│   Backend   │ Cria UserProductAccess
└─────────────┘
       │
       ▼
┌─────────────┐
│ Site Final  │ 7. GET /my/products (verifica acesso)
└─────────────┘

┌─────────────┐
│ Site Final  │ (B2B - Sem Login)
└──────┬──────┘
       │ 1. GET /public/b2b/products
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 2. Retorna produtos (público)
       ▼
┌─────────────┐
│ Site Final  │ Exibe produtos
└──────┬──────┘
       │ 3. Lead clica "Comprar"
       │ 4. Modal captura: nome, email, telefone
       │ 5. POST /public/b2b/products/:id/checkout
       ▼
┌─────────────┐
│   Backend   │ Cria B2BPurchase (pending) + checkout Stripe
└──────┬──────┘
       │ 6. Retorna checkoutUrl
       ▼
┌─────────────┐
│ Site Final  │ Redireciona para Stripe
└─────────────┘
       │
       ▼
┌─────────────┐
│   Stripe    │ Lead paga
└──────┬──────┘
       │ 7. Webhook: checkout.session.completed
       ▼
┌─────────────┐
│   Backend   │ Cria User + atualiza B2BPurchase (completed)
└─────────────┘
       │
       ▼
┌─────────────┐
│ Site Final  │ Lead agora é User (pode fazer login)
└─────────────┘
```

---

## ✅ Checklist de Implementação

### Backend (Já Pronto)

#### B2C (Cursos Recorrentes)
- [x] Endpoint GET /products
- [x] Endpoint POST /products/:slug/checkout
- [x] Endpoint GET /my/products
- [x] Endpoint GET /products/:slug/content (guard)
- [x] Webhook unificado /webhooks/stripe
- [x] Metadata no checkout (userId, productId, etc)
- [x] Criação automática de UserProductAccess

#### B2B (Produtos Avulsos)
- [x] Endpoint GET /public/b2b/products (público)
- [x] Endpoint POST /public/b2b/products/:id/checkout (público)
- [x] Captura de dados do lead (nome, email, telefone)
- [x] Criação de B2BPurchase com status "pending"
- [x] Metadata especial com `is_lead_purchase: "true"`
- [x] Webhook converte lead em user após pagamento
- [x] Carrinho abandonado (purchases pending para remarketing)

### Site Final (A Fazer)

#### B2C (Cursos)
- [ ] Página de listagem de produtos B2C
- [ ] Filtro por categoria
- [ ] Cards de produto com preços
- [ ] Botão de compra (redireciona para Stripe)
- [ ] Verificação de autenticação antes de comprar
- [ ] Página "Meus Cursos" (lista acessos)
- [ ] Proteção de conteúdo (verificar acesso)
- [ ] Página de sucesso após pagamento

#### B2B (Produtos Avulsos)
- [ ] Página de listagem de produtos B2B (pública)
- [ ] Cards de produto B2B
- [ ] Modal para capturar dados do lead
- [ ] Validação de formulário (nome, email, telefone)
- [ ] Botão de compra sem login
- [ ] Página de sucesso B2B
- [ ] Mensagem clara: "Não precisa criar conta"

---

## 🆘 Troubleshooting

### B2C (Cursos)

#### Erro: "Missing tenant_id in event metadata"
**Causa**: Webhook não consegue identificar o tenant  
**Solução**: Verificar se o checkout está sendo criado com metadata correta

#### Erro: "Unauthorized" ao criar checkout
**Causa**: Usuário não está autenticado  
**Solução**: Verificar se o token JWT está sendo enviado no header

#### Produto não aparece vinculado após pagamento
**Causa**: Webhook não processou ou falhou  
**Solução**: Verificar logs do webhook no backend

#### Usuário não consegue acessar conteúdo após compra
**Causa**: UserProductAccess não foi criado ou status não é "active"  
**Solução**: Verificar tabela `b2c_user_product_access` no banco

### B2B (Produtos Avulsos)

#### Erro: "x-tenant-id header is required"
**Causa**: Header obrigatório não foi enviado  
**Solução**: Adicionar header `x-tenant-id` em todas as requisições

#### Erro: "Product not found or inactive"
**Causa**: Produto não existe ou está desativado  
**Solução**: Verificar se o produto está ativo no painel admin

#### Lead não vira user após pagamento
**Causa**: Webhook não detectou `is_lead_purchase: "true"` na metadata  
**Solução**: Verificar logs do webhook e metadata do checkout

#### Dados do lead não foram salvos
**Causa**: B2BPurchase não foi criado antes do redirect  
**Solução**: Verificar tabela `b2b_purchases` no banco

#### Modal não abre ao clicar em "Comprar"
**Causa**: Estado do React não está sendo gerenciado corretamente  
**Solução**: Verificar `useState` e `setShowModal`

---

## 📊 Diferenças entre B2C e B2B

| Aspecto | B2C (Cursos) | B2B (Avulsos) |
|---------|--------------|---------------|
| **Autenticação** | Obrigatória (JWT) | Opcional (público) |
| **Endpoint** | `/api/products` | `/api/public/b2b/products` |
| **Tipo de Pagamento** | Recorrente ou vitalício | One-time payment |
| **Captura de Dados** | Já tem conta (user) | Modal antes do checkout (lead) |
| **Após Pagamento** | Cria `UserProductAccess` | Cria `User` + `B2BPurchase` |
| **Carrinho Abandonado** | Não aplicável | `B2BPurchase` com status "pending" |
| **Remarketing** | Via email de user | Via dados do lead (nome, email, telefone) |

---

## 🔑 Metadata do Stripe

### B2C (Cursos)
```json
{
  "userId": "user_123",
  "productId": "prod_123",
  "priceId": "price_123",
  "tenantId": "tenant_123",
  "billingMode": "unlimited"
}
```

### B2B (Produtos Avulsos)
```json
{
  "tenant_id": "tenant_123",
  "product_id": "prod_123",
  "lead_name": "João Silva",
  "lead_email": "joao@email.com",
  "lead_phone": "+5511999999999",
  "is_lead_purchase": "true"
}
```

**⚠️ IMPORTANTE**: A flag `is_lead_purchase: "true"` é essencial para o webhook identificar que deve criar um novo user!

---

## 📞 Suporte

Dúvidas? Entre em contato com o time de backend.

**Última atualização**: 01/05/2026 - Adicionado suporte para produtos B2B sem login
