# Integração B2C - Site Final (Frontend dos Estudantes)

## Visão Geral

Este documento descreve como integrar o site final dos estudantes com o sistema de produtos e assinaturas B2C. O site permite que os alunos visualizem cursos, façam login, comprem assinaturas e acessem conteúdo exclusivo.

## Arquitetura do Frontend

- **API Backend**: `https://api.seudominio.com/api`
- **Site dos Cursos**: `https://cursos.seudominio.com`
- **Autenticação**: JWT Bearer Token
- **Pagamentos**: Stripe Checkout (hosted)

---

## Fluxo do Usuário

```
1. Estudante navega pelos cursos (público)
   ↓
2. Estudante cria conta ou faz login
   ↓
3. Estudante seleciona um plano (mensal/anual)
   ↓
4. Sistema redireciona para Stripe Checkout
   ↓
5. Estudante completa o pagamento no Stripe
   ↓
6. Stripe redireciona de volta para o site
   ↓
7. Webhook atualiza assinatura no backend
   ↓
8. Estudante acessa conteúdo exclusivo
```

---

## Endpoints da API

### 1. Autenticação

#### Criar Conta (Registro)

**Endpoint**: `POST /api/auth/register` (você precisa implementar este endpoint)

**Body**:
```json
{
  "email": "aluno@exemplo.com",
  "password": "senha123",
  "name": "João Silva"
}
```

**Resposta** (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "aluno@exemplo.com",
    "name": "João Silva"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login

**Endpoint**: `POST /api/auth/login` (você precisa implementar este endpoint)

**Body**:
```json
{
  "email": "aluno@exemplo.com",
  "password": "senha123"
}
```

**Resposta** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "aluno@exemplo.com",
    "name": "João Silva"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Produtos (Cursos)

#### Listar Todos os Cursos

**Endpoint**: `GET /api/products`

**Autenticação**: Não requerida

**Resposta** (200):
```json
[
  {
    "id": "uuid",
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
        "currency": "brl"
      },
      {
        "id": "uuid",
        "stripePriceId": "price_yyyyy",
        "interval": "year",
        "intervalCount": 1,
        "unitAmount": 99000,
        "currency": "brl"
      }
    ]
  }
]
```

**Exemplo React**:
```typescript
// hooks/useProducts.ts
import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  slug: string;
  prices: Array<{
    id: string;
    stripePriceId: string;
    interval: string;
    unitAmount: number;
    currency: string;
  }>;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://api.seudominio.com/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { products, loading, error };
}
```

#### Obter Detalhes de um Curso

**Endpoint**: `GET /api/products/:slug`

**Autenticação**: Não requerida

**Exemplo**:
```typescript
// pages/curso/[slug].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function CursoPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (slug) {
      fetch(`https://api.seudominio.com/api/products/${slug}`)
        .then(res => res.json())
        .then(data => setProduct(data));
    }
  }, [slug]);

  if (!product) return <div>Carregando...</div>;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <div className="prices">
        {product.prices.map(price => (
          <PriceCard key={price.id} price={price} productSlug={slug} />
        ))}
      </div>
    </div>
  );
}
```

---

### 3. Assinaturas

#### Criar Sessão de Checkout

**Endpoint**: `POST /api/subscriptions/checkout`

**Autenticação**: Requerida (Bearer Token)

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body**:
```json
{
  "priceId": "price_xxxxx"
}
```

**Resposta** (201):
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxxxx"
}
```

**Exemplo React**:
```typescript
// components/PriceCard.tsx
import { useState } from 'react';

interface PriceCardProps {
  price: {
    id: string;
    stripePriceId: string;
    interval: string;
    unitAmount: number;
    currency: string;
  };
  productSlug: string;
}

export function PriceCard({ price, productSlug }: PriceCardProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      // Redirecionar para login
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    try {
      const response = await fetch('https://api.seudominio.com/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: price.stripePriceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const { checkoutUrl } = await response.json();
      
      // Redirecionar para o Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      alert('Erro ao criar checkout: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="price-card">
      <h3>Plano {price.interval === 'month' ? 'Mensal' : 'Anual'}</h3>
      <p className="price">
        R$ {(price.unitAmount / 100).toFixed(2)}
        <span>/{price.interval === 'month' ? 'mês' : 'ano'}</span>
      </p>
      <button 
        onClick={handleSubscribe} 
        disabled={loading}
      >
        {loading ? 'Processando...' : 'Assinar Agora'}
      </button>
    </div>
  );
}
```

#### Listar Minhas Assinaturas

**Endpoint**: `GET /api/subscriptions/my`

**Autenticação**: Requerida (Bearer Token)

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta** (200):
```json
[
  {
    "id": "uuid",
    "productId": "uuid",
    "status": "active",
    "currentPeriodStart": "2026-04-01T00:00:00.000Z",
    "currentPeriodEnd": "2026-05-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "amount": 9900,
    "currency": "brl"
  }
]
```

**Exemplo React**:
```typescript
// pages/minhas-assinaturas.tsx
import { useEffect, useState } from 'react';

export default function MinhasAssinaturas() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
    fetch('https://api.seudominio.com/api/subscriptions/my', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setSubscriptions(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1>Minhas Assinaturas</h1>
      {subscriptions.length === 0 ? (
        <p>Você ainda não possui assinaturas ativas.</p>
      ) : (
        <ul>
          {subscriptions.map(sub => (
            <li key={sub.id}>
              <p>Status: {sub.status}</p>
              <p>Valor: R$ {(sub.amount / 100).toFixed(2)}</p>
              <p>Próxima cobrança: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
              {!sub.cancelAtPeriodEnd && (
                <button onClick={() => handleCancel(sub.id)}>
                  Cancelar Assinatura
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### Cancelar Assinatura

**Endpoint**: `POST /api/subscriptions/:id/cancel`

**Autenticação**: Requerida (Bearer Token)

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta** (200):
```json
{
  "message": "Subscription will be canceled at period end",
  "cancelAtPeriodEnd": true,
  "currentPeriodEnd": "2026-05-01T00:00:00.000Z"
}
```

**Exemplo**:
```typescript
async function handleCancel(subscriptionId: string) {
  if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) {
    return;
  }

  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(
      `https://api.seudominio.com/api/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao cancelar assinatura');
    }

    const data = await response.json();
    alert(`Assinatura cancelada. Você terá acesso até ${new Date(data.currentPeriodEnd).toLocaleDateString()}`);
    
    // Recarregar lista
    window.location.reload();
  } catch (error) {
    alert('Erro: ' + error.message);
  }
}
```

---

### 4. Acesso ao Conteúdo

#### Acessar Conteúdo do Curso

**Endpoint**: `GET /api/products/:slug/content`

**Autenticação**: Requerida (Bearer Token)

**Autorização**: Requer assinatura ativa para o produto

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso** (200):
```json
{
  "content": "ok",
  "slug": "javascript-avancado"
}
```

**Resposta de Erro** (403):
```json
{
  "statusCode": 403,
  "message": "No active subscription for this product",
  "error": "Forbidden"
}
```

**Exemplo React**:
```typescript
// pages/curso/[slug]/aulas.tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function AulasPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      const token = localStorage.getItem('authToken');
      
      fetch(`https://api.seudominio.com/api/products/${slug}/content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => {
          if (res.ok) {
            setHasAccess(true);
          } else if (res.status === 403) {
            setHasAccess(false);
          }
          setLoading(false);
        });
    }
  }, [slug]);

  if (loading) return <div>Verificando acesso...</div>;

  if (!hasAccess) {
    return (
      <div>
        <h1>Acesso Negado</h1>
        <p>Você precisa de uma assinatura ativa para acessar este conteúdo.</p>
        <button onClick={() => router.push(`/curso/${slug}`)}>
          Ver Planos
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Aulas do Curso</h1>
      {/* Renderizar conteúdo das aulas aqui */}
    </div>
  );
}
```

---

## Componentes Sugeridos

### 1. Catálogo de Cursos

```typescript
// components/CourseCatalog.tsx
import { useProducts } from '../hooks/useProducts';
import Link from 'next/link';

export function CourseCatalog() {
  const { products, loading, error } = useProducts();

  if (loading) return <div>Carregando cursos...</div>;
  if (error) return <div>Erro ao carregar cursos: {error}</div>;

  return (
    <div className="course-catalog">
      <h1>Nossos Cursos</h1>
      <div className="grid">
        {products.map(product => (
          <Link key={product.id} href={`/curso/${product.slug}`}>
            <div className="course-card">
              <h2>{product.name}</h2>
              <p>{product.description}</p>
              <div className="price-info">
                A partir de R$ {(Math.min(...product.prices.map(p => p.unitAmount)) / 100).toFixed(2)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### 2. Página de Checkout Success

```typescript
// pages/checkout/success.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CheckoutSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Aguardar alguns segundos para o webhook processar
    setTimeout(() => {
      router.push('/minhas-assinaturas');
    }, 3000);
  }, []);

  return (
    <div className="success-page">
      <h1>✅ Pagamento Confirmado!</h1>
      <p>Sua assinatura foi ativada com sucesso.</p>
      <p>Redirecionando para suas assinaturas...</p>
    </div>
  );
}
```

### 3. Página de Checkout Cancel

```typescript
// pages/checkout/cancel.tsx
import { useRouter } from 'next/router';

export default function CheckoutCancel() {
  const router = useRouter();

  return (
    <div className="cancel-page">
      <h1>❌ Pagamento Cancelado</h1>
      <p>Você cancelou o processo de pagamento.</p>
      <button onClick={() => router.push('/cursos')}>
        Voltar para Cursos
      </button>
    </div>
  );
}
```

---

## Configuração de URLs

### Variáveis de Ambiente (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com/api
NEXT_PUBLIC_SITE_URL=https://cursos.seudominio.com
```

### URLs de Redirect do Stripe

Configure no backend (`.env`):
```env
FRONTEND_URL=https://cursos.seudominio.com
```

As URLs de sucesso e cancelamento serão:
- **Success**: `https://cursos.seudominio.com/checkout/success`
- **Cancel**: `https://cursos.seudominio.com/checkout/cancel`

---

## Gerenciamento de Estado (Context API)

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('https://api.seudominio.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Credenciais inválidas');
    }

    const data = await response.json();
    
    setUser(data.user);
    setToken(data.token);
    
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## Checklist de Implementação

### Backend
- [ ] Implementar endpoint de registro de usuários (`POST /api/auth/register`)
- [ ] Implementar endpoint de login (`POST /api/auth/login`)
- [ ] Configurar `UserJwtGuard` para autenticação de estudantes
- [ ] Configurar webhook do Stripe com os eventos necessários
- [ ] Adicionar `FRONTEND_URL` no `.env`

### Frontend
- [ ] Criar página de listagem de cursos
- [ ] Criar página de detalhes do curso
- [ ] Implementar formulário de registro
- [ ] Implementar formulário de login
- [ ] Criar fluxo de checkout (botão → API → redirect Stripe)
- [ ] Criar páginas de success/cancel do checkout
- [ ] Implementar página "Minhas Assinaturas"
- [ ] Implementar proteção de rotas (conteúdo exclusivo)
- [ ] Adicionar gerenciamento de estado (Context API ou Redux)

### Testes
- [ ] Testar fluxo completo de compra
- [ ] Testar cancelamento de assinatura
- [ ] Testar acesso ao conteúdo com e sem assinatura
- [ ] Testar renovação automática
- [ ] Testar falha de pagamento

---

## Troubleshooting

### Token JWT inválido
- Verifique se o token está sendo enviado no header `Authorization: Bearer <token>`
- Confirme que o token não expirou
- Verifique se o `JWT_SECRET` está correto no backend

### Checkout não redireciona
- Verifique se o `FRONTEND_URL` está configurado corretamente
- Confirme que as URLs de success/cancel existem no frontend

### Conteúdo não liberado após pagamento
- Aguarde alguns segundos para o webhook processar
- Verifique os logs do webhook no Stripe Dashboard
- Confirme que a assinatura está com status `active` no banco de dados

---

## Próximos Passos

1. Implementar sistema de aulas e módulos
2. Adicionar progresso do aluno
3. Implementar certificados de conclusão
4. Adicionar sistema de avaliações e comentários
5. Criar área de suporte/FAQ

---

## Recursos Adicionais

- [Documentação do Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Documentação do Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Context API](https://react.dev/reference/react/useContext)
