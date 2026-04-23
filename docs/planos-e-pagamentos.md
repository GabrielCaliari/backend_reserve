# Estrutura de Planos e Pagamentos (Backend)

> Guia completo de implementação do backend para suportar planos B2B (subscriptions) e B2C (créditos/pacotes avulsos).

---

## Visão Geral

Este documento descreve **dois modelos de monetização**:

| Modelo | Público-alvo | Tipo | Descrição |
|--------|--------------|------|-----------|
| **B2B** | Empresas/Profissionais | Assinatura recorrente (subscription) | Planos mensais com diferentes períodos de cobrança |
| **B2C** | Consumidores finais | Pacote avulso (one-time payment) | Compra de créditos/recursos com validade |

**Responsabilidade do Backend:**
- Armazenar configuração de planos e preços
- Criar sessões de checkout com provedor de pagamento
- Processar webhooks de pagamento
- Gerenciar subscriptions ativas
- Controlar saldo e expiração de créditos/recursos
- Validar permissões de acesso baseado em plano

---

## 1. Planos B2B — Empresas/Profissionais

### 1.1 Tiers de plano (Exemplo)

| Plano | Preço base/mês | Preço teste (trial) | Usuários | Recurso A | Recurso B |
|-------|---------------|---------------------|----------|-----------|-----------|
| **Básico** | R$ 49,90 | R$ 9,90 | 1 | 100 | 50 |
| **Profissional** | R$ 99,90 | R$ 7,90 | 3 | 300 | 150 |
| **Premium** | R$ 199,90 | R$ 5,90 | 10 | 1.000 | 500 |

> **Nota:** Adapte os valores, nomes de planos e recursos conforme seu produto.
> Um plano pode ser marcado como `variant: "popular"` para destaque visual no frontend.

### 1.2 Períodos de cobrança e descontos

| Período | ID | Desconto | Texto de cobrança |
|---------|----|----------|-------------------|
| Mensal | `monthly` | 0% | Cobrado mensalmente |
| Trimestral | `quarterly` | 10% | Cobrado a cada 3 meses |
| Semestral | `semiannual` | 15% | Cobrado a cada 6 meses |
| Anual | `annual` | 20% | Cobrado anualmente |

O desconto é aplicado sobre o `basePrice` do plano:

```ts
// src/lib/constants/pricing/index.ts
const discountedPrice = basePrice * (1 - discount / 100);
```

### 1.3 Preço de teste (trial)

Cada plano tem um `baseTestPrice` separado — é o valor cobrado nos primeiros 7 dias. O desconto do período também se aplica ao trial:

```ts
function getTestPrice(planTitle, period, baseTestPrice) {
  const discount = PERIOD_DISCOUNTS[period];
  return baseTestPrice * (1 - discount / 100);
}
```

### 1.4 URL de cadastro (B2B)

```ts
function getSignUpUrl(planTitle: string): string {
  return `/signup?plan=${planTitle.toLowerCase()}`;
}
// Exemplos:
// /signup?plan=basico
// /signup?plan=profissional
// /signup?plan=premium
```

---

## 2. Pacotes B2C — Consumidores

### 2.1 Pacotes disponíveis (Exemplo)

| Pacote | ID | Preço | Créditos | Preço/crédito | Desconto | Validade |
|--------|----|-------|----------|---------------|----------|----------|
| **Pacote Inicial** | `starter` | R$ 19,90 | 10 | R$ 1,99 | 0% | 30 dias |
| **Pacote Premium** | `premium` | R$ 49,90 | 30 | R$ 1,66 | 15% | 90 dias |
| **Pacote Avançado** | `advanced` | R$ 99,90 | 100 | R$ 0,99 | 20% | 180 dias |

> **Nota:** Adapte os valores, nomes e recursos conforme seu produto.
> Um pacote pode ser marcado como `isPopular: true` para destaque visual.

> **1 crédito = 1 uso do recurso principal** (adapte conforme sua lógica)

### 2.2 URL de cadastro (B2C)

```ts
const getSignUpUrl = (credits: number) =>
  `/signup?type=customer&credits=${credits}`;

// Ou via query params específicos:
// /signup?package=starter
// /signup?package=premium
// /signup?package=advanced
```

---

## 3. Tipos TypeScript (Referência Frontend)

### 3.1 B2B — `PlanConfig`

```ts
export type PricingPeriod = "monthly" | "quarterly" | "semiannual" | "annual";

export interface PlanConfig {
  title: string;
  description: string;
  basePrice: number;       // Preço mensal base
  baseTestPrice: number;   // Preço do trial (ex: 7 dias)
  credits: number;         // Créditos/recursos incluídos
  users: number;           // Usuários permitidos
  resourceA: number;       // Recurso A do seu produto
  resourceB: number;       // Recurso B do seu produto
  variant?: "default" | "popular";
}
```

### 3.2 B2C — `PackageConfig`

```ts
export interface PackageConfig {
  id: string;
  title: string;
  description: string;
  price: number;           // Preço total do pacote
  pricePerCredit: number;  // Preço por crédito individual
  credits: number;         // Quantidade de créditos
  validityDays: number;    // Validade em dias
  discount?: number;       // % de desconto exibido
  isPopular?: boolean;
  features: Feature[];
  variant?: "default" | "popular";
  ctaLabel?: string;
  ctaUrl?: string;
}
```

---

## 4. Arquitetura de APIs

### 4.1 Variáveis de ambiente

```env
# API Backend
API_URL=https://api.seudominio.com          # server-side
NEXT_PUBLIC_API_URL=https://api.seudominio.com   # client-side

# URL base do site
NEXT_PUBLIC_SITE_URL=https://seudominio.com
FRONTEND_URL=https://seudominio.com

# Outras APIs (opcional)
CMS_URL=https://cms.seudominio.com
```

### 4.2 Clientes HTTP (Exemplo)

```ts
// Cliente para API principal
const api = axios.create({ 
  baseURL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL 
});

// Cliente autenticado
const authenticatedApi = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 5. Implementação Backend — Passo a Passo

### 5.1 Estrutura de Banco de Dados

#### Tabela: `plans` (Planos B2B)

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(50) UNIQUE NOT NULL, -- 'basic', 'professional', 'premium'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  trial_price DECIMAL(10,2) NOT NULL,
  trial_days INTEGER DEFAULT 7,
  credits INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  max_resource_a INTEGER NOT NULL,  -- Adapte conforme seu produto
  max_resource_b INTEGER NOT NULL,  -- Adapte conforme seu produto
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed inicial (ADAPTE OS VALORES)
INSERT INTO plans (plan_id, name, description, base_price, trial_price, credits, max_users, max_resource_a, max_resource_b) VALUES
('basic', 'Básico', 'Plano inicial', 49.90, 9.90, 100, 1, 50, 10),
('professional', 'Profissional', 'Plano intermediário', 99.90, 7.90, 300, 3, 150, 30),
('premium', 'Premium', 'Plano avançado', 199.90, 5.90, 1000, 10, 500, 100);
```

#### Tabela: `billing_periods` (Períodos de cobrança)

```sql
CREATE TABLE billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id VARCHAR(20) UNIQUE NOT NULL, -- 'monthly', 'quarterly', 'semiannual', 'annual'
  name VARCHAR(50) NOT NULL,
  months INTEGER NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Seed inicial
INSERT INTO billing_periods (period_id, name, months, discount_percentage) VALUES
('monthly', 'Mensal', 1, 0),
('quarterly', 'Trimestral', 3, 10),
('semiannual', 'Semestral', 6, 15),
('annual', 'Anual', 12, 20);
```

#### Tabela: `subscriptions` (Assinaturas ativas)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  billing_period_id UUID NOT NULL REFERENCES billing_periods(id),
  
  -- Status
  status VARCHAR(20) NOT NULL, -- 'trialing', 'active', 'past_due', 'canceled', 'expired'
  
  -- Datas
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  canceled_at TIMESTAMP,
  
  -- Financeiro
  amount DECIMAL(10,2) NOT NULL, -- Valor total cobrado no período
  currency VARCHAR(3) DEFAULT 'BRL',
  
  -- Provedor de pagamento
  payment_provider VARCHAR(50), -- 'stripe', 'pagarme', 'asaas'
  external_subscription_id VARCHAR(255), -- ID no provedor
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, status) WHERE status IN ('trialing', 'active')
);

CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_external_id ON subscriptions(external_subscription_id);
```

#### Tabela: `credit_packages` (Pacotes B2C)

```sql
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id VARCHAR(50) UNIQUE NOT NULL, -- 'starter', 'premium', 'advanced'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  credits INTEGER NOT NULL,
  validity_days INTEGER NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed inicial (ADAPTE OS VALORES)
INSERT INTO credit_packages (package_id, name, description, price, credits, validity_days, discount_percentage) VALUES
('starter', 'Pacote Inicial', 'Perfeito para começar', 19.90, 10, 30, 0),
('premium', 'Pacote Premium', 'Mais popular', 49.90, 30, 90, 15),
('advanced', 'Pacote Avançado', 'Para uso intensivo', 99.90, 100, 180, 20);
```

#### Tabela: `user_credits` (Saldo de créditos)

```sql
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_user_credits_user ON user_credits(user_id);
```

#### Tabela: `credit_transactions` (Histórico de créditos)

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'purchase', 'usage', 'refund', 'expiration'
  amount INTEGER NOT NULL, -- Positivo para compra, negativo para uso
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID, -- ID da compra ou análise
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id, created_at DESC);
```

#### Tabela: `payments` (Histórico de pagamentos)

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tipo
  payment_type VARCHAR(20) NOT NULL, -- 'subscription', 'credits'
  subscription_id UUID REFERENCES subscriptions(id),
  credit_package_id UUID REFERENCES credit_packages(id),
  
  -- Financeiro
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(20) NOT NULL, -- 'pending', 'paid', 'failed', 'refunded'
  
  -- Provedor
  payment_provider VARCHAR(50) NOT NULL,
  external_payment_id VARCHAR(255),
  payment_method VARCHAR(50), -- 'credit_card', 'pix', 'boleto'
  
  -- Datas
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_external_id ON payments(external_payment_id);
```

---

### 5.2 Endpoints da API

#### **B2B — Subscriptions**

##### `POST /api/v1/subscriptions/checkout`

**Request do frontend:**
```json
{
  "plan_id": "basic" | "professional" | "premium",
  "period_id": "monthly" | "quarterly" | "semiannual" | "annual"
}
```

**Lógica do backend:**
1. Validar autenticação (JWT)
2. Verificar se usuário já tem subscription ativa
3. Buscar plano e período no banco
4. Calcular valor total:
   ```
   discount = billing_period.discount_percentage / 100
   total = plan.base_price * billing_period.months * (1 - discount)
   trial_amount = plan.trial_price * (1 - discount)
   ```
5. Criar sessão de checkout no provedor (Stripe/Pagar.me)
6. Criar registro em `subscriptions` com status `pending`
7. Retornar URL de checkout

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "subscription_id": "uuid",
  "trial_amount": 9.90,
  "total_amount": 49.90,
  "trial_days": 7
}
```

---

##### `GET /api/v1/subscriptions/current`

**Lógica:**
1. Buscar subscription ativa do usuário (`status IN ('trialing', 'active')`)
2. Incluir dados do plano e período
3. Calcular dias restantes

**Response:**
```json
{
  "id": "uuid",
  "status": "active",
  "plan": {
    "id": "basic",
    "name": "Básico",
    "credits": 100,
    "max_users": 1,
    "max_resource_a": 50,
    "max_resource_b": 10
  },
  "billing_period": {
    "id": "annual",
    "name": "Anual",
    "months": 12
  },
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2025-01-01T00:00:00Z",
  "days_remaining": 245,
  "amount": 479.04,
  "currency": "BRL"
}
```

---

##### `POST /api/v1/subscriptions/cancel`

**Lógica:**
1. Buscar subscription ativa
2. Cancelar no provedor de pagamento
3. Atualizar status para `canceled` e setar `canceled_at`
4. Manter acesso até `current_period_end`

**Response:**
```json
{
  "message": "Assinatura cancelada com sucesso",
  "access_until": "2025-01-01T00:00:00Z"
}
```

---

##### `POST /api/v1/subscriptions/upgrade`

**Request:**
```json
{
  "new_plan_id": "premium",
  "prorate": true
}
```

**Lógica:**
1. Calcular valor proporcional (prorate)
2. Atualizar subscription no provedor
3. Atualizar registro no banco
4. Criar payment record

---

#### **B2C — Credits**

##### `POST /api/v1/credits/checkout`

**Request do frontend:**
```json
{
  "package_id": "starter" | "premium" | "advanced"
}
```

**Lógica:**
1. Validar autenticação
2. Buscar pacote no banco
3. Criar sessão de checkout (one-time payment)
4. Criar registro em `payments` com status `pending`

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "payment_id": "uuid",
  "amount": 19.90,
  "credits": 10,
  "validity_days": 30
}
```

---

##### `GET /api/v1/credits/balance`

**Response:**
```json
{
  "user_id": "uuid",
  "credits": 25,
  "expires_at": "2024-12-31T23:59:59Z"
}
```

---

##### `POST /api/v1/credits/use`

**Request (interno, chamado ao usar recurso):**
```json
{
  "user_id": "uuid",
  "amount": 1,
  "reference_id": "resource_usage_uuid",
  "description": "Uso do recurso principal"
}
```

**Lógica:**
1. Verificar saldo disponível
2. Verificar expiração
3. Decrementar créditos
4. Criar registro em `credit_transactions`

---

##### `GET /api/v1/credits/history`

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "purchase",
      "amount": 30,
      "balance_after": 30,
      "description": "Compra de Pacote Premium",
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "type": "usage",
      "amount": -1,
      "balance_after": 29,
      "description": "Uso do recurso principal",
      "created_at": "2024-01-16T14:30:00Z"
    }
  ]
}
```

---

### 5.3 Webhook de Pagamento

##### `POST /api/v1/webhooks/payment`

**Provedor envia eventos:**
- `payment.succeeded`
- `payment.failed`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

**Lógica:**
1. Validar assinatura do webhook (HMAC/signature)
2. Identificar tipo de evento
3. Buscar payment/subscription pelo `external_id`
4. Atualizar status no banco

**Para subscription payment:**
```python
if event.type == 'payment.succeeded':
    subscription = get_subscription_by_external_id(event.subscription_id)
    subscription.status = 'active'
    subscription.current_period_start = event.period_start
    subscription.current_period_end = event.period_end
    subscription.save()
    
    payment = create_payment(
        user_id=subscription.user_id,
        payment_type='subscription',
        amount=event.amount,
        status='paid',
        external_payment_id=event.payment_id
    )
```

**Para credit payment:**
```python
if event.type == 'payment.succeeded':
    payment = get_payment_by_external_id(event.payment_id)
    payment.status = 'paid'
    payment.paid_at = now()
    payment.save()
    
    # Creditar créditos
    package = get_credit_package(payment.credit_package_id)
    add_credits(
        user_id=payment.user_id,
        amount=package.credits,
        expires_at=now() + timedelta(days=package.validity_days)
    )
```

---

### 5.4 Funções Auxiliares (Services)

#### `calculate_subscription_price(plan_id, period_id)`

```python
def calculate_subscription_price(plan_id: str, period_id: str) -> dict:
    plan = db.query(Plan).filter_by(plan_id=plan_id).first()
    period = db.query(BillingPeriod).filter_by(period_id=period_id).first()
    
    discount = period.discount_percentage / 100
    monthly_price = plan.base_price * (1 - discount)
    total_price = monthly_price * period.months
    trial_price = plan.trial_price * (1 - discount)
    
    return {
        'monthly_price': monthly_price,
        'total_price': total_price,
        'trial_price': trial_price,
        'discount_percentage': period.discount_percentage
    }
```

#### `check_user_access(user_id)`

```python
def check_user_access(user_id: str) -> dict:
    # Verificar subscription
    subscription = db.query(Subscription).filter_by(
        user_id=user_id,
        status__in=['trialing', 'active']
    ).first()
    
    # Verificar créditos
    credits = db.query(UserCredits).filter_by(user_id=user_id).first()
    
    return {
        'has_subscription': subscription is not None,
        'subscription_status': subscription.status if subscription else None,
        'credits': credits.credits if credits else 0,
        'credits_expired': credits.expires_at < now() if credits else True
    }
```

#### `add_credits(user_id, amount, expires_at)`

```python
def add_credits(user_id: str, amount: int, expires_at: datetime):
    user_credits = db.query(UserCredits).filter_by(user_id=user_id).first()
    
    if not user_credits:
        user_credits = UserCredits(user_id=user_id, credits=0)
        db.add(user_credits)
    
    user_credits.credits += amount
    user_credits.expires_at = expires_at
    user_credits.updated_at = now()
    db.commit()
    
    # Registrar transação
    transaction = CreditTransaction(
        user_id=user_id,
        type='purchase',
        amount=amount,
        balance_after=user_credits.credits,
        description=f'Compra de {amount} créditos'
    )
    db.add(transaction)
    db.commit()
```

#### `use_credits(user_id, amount, reference_id, description)`

```python
def use_credits(user_id: str, amount: int, reference_id: str, description: str):
    user_credits = db.query(UserCredits).filter_by(user_id=user_id).first()
    
    if not user_credits or user_credits.credits < amount:
        raise InsufficientCreditsError()
    
    if user_credits.expires_at < now():
        raise CreditsExpiredError()
    
    user_credits.credits -= amount
    user_credits.updated_at = now()
    db.commit()
    
    transaction = CreditTransaction(
        user_id=user_id,
        type='usage',
        amount=-amount,
        balance_after=user_credits.credits,
        description=description,
        reference_id=reference_id
    )
    db.add(transaction)
    db.commit()
```

---

### 5.5 Preços que o backend deve registrar (Seeds)

**B2B — Preços base mensais (ADAPTE):**

| Plano | `plan_id` | `base_price` | `trial_price` |
|-------|-----------|-------------|---------------|
| Básico | `basic` | 49.90 | 9.90 |
| Profissional | `professional` | 99.90 | 7.90 |
| Premium | `premium` | 199.90 | 5.90 |

**B2B — Multiplicadores de período (para calcular total cobrado):**

| Período | `period_id` | Meses | Desconto | Fórmula total |
|---------|-------------|-------|----------|---------------|
| Mensal | `monthly` | 1 | 0% | `base_price × 1` |
| Trimestral | `quarterly` | 3 | 10% | `base_price × 3 × 0.90` |
| Semestral | `semiannual` | 6 | 15% | `base_price × 6 × 0.85` |
| Anual | `annual` | 12 | 20% | `base_price × 12 × 0.80` |

**B2C — Pacotes (ADAPTE):**

| Pacote | `package_id` | `price` | `credits` | `validity_days` |
|--------|-------------|---------|-----------|-----------------|
| Inicial | `starter` | 19.90 | 10 | 30 |
| Premium | `premium` | 49.90 | 30 | 90 |
| Avançado | `advanced` | 99.90 | 100 | 180 |

---

## 6. O que o Frontend precisa implementar

### 6.1 Fluxo B2B (Subscription)

1. Usuário seleciona plano + período na `PricingSection`
2. Clica no CTA → redireciona para `/cadastro?plano=<planTitle>`
3. Página de cadastro coleta dados do usuário
4. Chama `POST /subscriptions/checkout` com plano + período
5. Backend retorna URL de checkout (Stripe/Pagar.me/etc.)
6. Frontend redireciona para URL de checkout
7. Após pagamento, provedor redireciona para `success_url` / `cancel_url`
8. Backend processa webhook e ativa a subscription

### 6.2 Fluxo B2C (One-time)

1. Usuário seleciona pacote na seção de pricing B2C
2. Clica no CTA → redireciona para `/signup?package=<packageId>` ou URL externa de cadastro
3. Chama `POST /credits/checkout` com package_id
4. Backend retorna URL de checkout
5. Após pagamento, créditos são creditados na conta

### 6.3 Componentes existentes

| Componente | Caminho | Responsabilidade |
|------------|---------|-----------------|
| `PricingSection` | `src/presentation/components/organisms/sections/pricing-section.tsx` | Seção B2B com toggle de período |
| `PricingCard` | `src/presentation/components/molecules/pricing-section/pricing-card.tsx` | Card individual de plano B2B |
| `B2CPricingSection` | `src/presentation/components/organisms/sections/b2c-pricing-section.tsx` | Seção B2C com pacotes de crédito |
| `B2CPackageCard` | `src/presentation/components/molecules/pricing-section/b2c-package-card.tsx` | Card individual de pacote B2C |

### 6.4 Integrações a criar no frontend

- [ ] Hook `useCheckout(planId, period)` → chama `POST /subscriptions/checkout`
- [ ] Hook `useCreditsCheckout(packageId)` → chama `POST /credits/checkout`
- [ ] Página `/cadastro` com formulário + lógica de redirecionamento
- [ ] Página de sucesso `/pagamento/sucesso`
- [ ] Página de cancelamento `/pagamento/cancelado`
- [ ] Hook `useSubscription()` → busca assinatura ativa do usuário
- [ ] Hook `useCreditBalance()` → busca saldo de créditos

---

## 6. Integração com Provedor de Pagamento

### 6.1 Escolha do Provedor

Opções recomendadas para o mercado brasileiro:

| Provedor | Subscription | One-time | PIX | Boleto | Webhook | Docs |
|----------|-------------|----------|-----|--------|---------|------|
| **Stripe** | ✅ | ✅ | ✅ | ❌ | ✅ | [stripe.com/docs](https://stripe.com/docs) |
| **Pagar.me** | ✅ | ✅ | ✅ | ✅ | ✅ | [docs.pagar.me](https://docs.pagar.me) |
| **Asaas** | ✅ | ✅ | ✅ | ✅ | ✅ | [asaas.com/docs](https://asaas.com/docs) |
| **Mercado Pago** | ✅ | ✅ | ✅ | ✅ | ✅ | [mercadopago.com.br/developers](https://mercadopago.com.br/developers) |

**Recomendação:** Pagar.me ou Asaas (melhor suporte a PIX e boleto no Brasil)

### 6.2 Exemplo de Integração (Stripe)

#### Criar sessão de checkout (Subscription)

```python
import stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

def create_subscription_checkout(user_id: str, plan_id: str, period_id: str):
    prices = calculate_subscription_price(plan_id, period_id)
    
    # Criar ou buscar customer
    customer = stripe.Customer.create(
        email=user.email,
        metadata={'user_id': user_id}
    )
    
    # Criar sessão de checkout
    session = stripe.checkout.Session.create(
        customer=customer.id,
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'brl',
                'product_data': {
                    'name': f'Plano {plan.name} - {period.name}',
                },
                'unit_amount': int(prices['total_price'] * 100),  # Centavos
                'recurring': {
                    'interval': 'month',
                    'interval_count': period.months
                }
            },
            'quantity': 1,
        }],
        mode='subscription',
        subscription_data={
            'trial_period_days': 7,
            'metadata': {
                'user_id': user_id,
                'plan_id': plan_id,
                'period_id': period_id
            }
        },
        success_url=f'{FRONTEND_URL}/pagamento/sucesso?session_id={{CHECKOUT_SESSION_ID}}',
        cancel_url=f'{FRONTEND_URL}/pagamento/cancelado',
    )
    
    return session.url
```

#### Criar sessão de checkout (Credits)

```python
def create_credits_checkout(user_id: str, package_id: str):
    package = get_credit_package(package_id)
    
    session = stripe.checkout.Session.create(
        customer=customer.id,
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'brl',
                'product_data': {
                    'name': f'{package.name} - {package.credits} créditos',
                },
                'unit_amount': int(package.price * 100),
            },
            'quantity': 1,
        }],
        mode='payment',
        metadata={
            'user_id': user_id,
            'package_id': package_id,
            'credits': package.credits,
            'validity_days': package.validity_days
        },
        success_url=f'{FRONTEND_URL}/pagamento/sucesso?session_id={{CHECKOUT_SESSION_ID}}',
        cancel_url=f'{FRONTEND_URL}/pagamento/cancelado',
    )
    
    return session.url
```

#### Processar webhook

```python
@app.post('/api/v1/webhooks/payment')
async def handle_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except ValueError:
        return {'error': 'Invalid payload'}, 400
    except stripe.error.SignatureVerificationError:
        return {'error': 'Invalid signature'}, 400
    
    # Processar evento
    if event.type == 'checkout.session.completed':
        session = event.data.object
        
        if session.mode == 'subscription':
            handle_subscription_created(session)
        elif session.mode == 'payment':
            handle_credit_purchase(session)
    
    elif event.type == 'invoice.paid':
        handle_subscription_renewed(event.data.object)
    
    elif event.type == 'customer.subscription.deleted':
        handle_subscription_canceled(event.data.object)
    
    return {'status': 'success'}
```

---

## 7. Fluxo Completo (Frontend → Backend)

### 7.1 Fluxo B2B (Subscription)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant P as Provedor (Stripe)
    
    U->>F: Seleciona plano + período
    F->>B: POST /subscriptions/checkout
    B->>B: Calcula preços
    B->>P: Cria sessão de checkout
    P-->>B: Retorna checkout_url
    B->>B: Cria subscription (status: pending)
    B-->>F: Retorna checkout_url
    F->>P: Redireciona usuário
    U->>P: Preenche dados de pagamento
    P->>B: Webhook: payment.succeeded
    B->>B: Atualiza subscription (status: active)
    P-->>F: Redireciona para success_url
    F->>B: GET /subscriptions/current
    B-->>F: Retorna subscription ativa
```

### 7.2 Fluxo B2C (Credits)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant P as Provedor
    
    U->>F: Seleciona pacote
    F->>B: POST /credits/checkout
    B->>P: Cria sessão de checkout
    P-->>B: Retorna checkout_url
    B->>B: Cria payment (status: pending)
    B-->>F: Retorna checkout_url
    F->>P: Redireciona usuário
    U->>P: Paga
    P->>B: Webhook: payment.succeeded
    B->>B: Atualiza payment (status: paid)
    B->>B: Credita créditos na conta
    P-->>F: Redireciona para success_url
    F->>B: GET /credits/balance
    B-->>F: Retorna saldo atualizado
```

---

## 8. Métodos de Pagamento (Perfil Público)

Estes são os métodos aceitos pelos **profissionais** nos seus perfis públicos (não relacionado a subscription):

```ts
// src/types/IPublicProfile.ts
export enum PaymentMethodType {
  CASH = "CASH",
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  PIX = "PIX",
  BANK_TRANSFER = "BANK_TRANSFER"
}
```

Mapeamento API ↔ Frontend:

| Frontend | API (backend) |
|----------|--------------|
| `PIX` | `PIX` |
| `CASH` | `DINHEIRO` |
| `CREDIT_CARD` | `CARTAO_CREDITO` |
| `DEBIT_CARD` | `CARTAO_DEBITO` |
| `BANK_TRANSFER` | `TRANSFERENCIA_BANCARIA` |

---

## 9. Checklist de Implementação Backend

### Fase 1: Setup Inicial
- [ ] Escolher provedor de pagamento (Stripe/Pagar.me/Asaas)
- [ ] Criar conta no provedor e obter API keys
- [ ] Configurar variáveis de ambiente
- [ ] Criar migrations do banco de dados
- [ ] Executar seeds de planos e períodos

### Fase 2: Endpoints Core
- [ ] `POST /api/v1/subscriptions/checkout`
- [ ] `GET /api/v1/subscriptions/current`
- [ ] `POST /api/v1/subscriptions/cancel`
- [ ] `POST /api/v1/credits/checkout`
- [ ] `GET /api/v1/credits/balance`
- [ ] `POST /api/v1/credits/use` (interno)

### Fase 3: Webhook
- [ ] `POST /api/v1/webhooks/payment`
- [ ] Validação de assinatura do webhook
- [ ] Handlers para cada tipo de evento
- [ ] Logs de eventos recebidos
- [ ] Retry logic para falhas

### Fase 4: Services
- [ ] `calculate_subscription_price()`
- [ ] `check_user_access()`
- [ ] `add_credits()`
- [ ] `use_credits()`
- [ ] `expire_credits()` (cron job)
- [ ] `renew_subscription()` (cron job)

### Fase 5: Testes
- [ ] Testes unitários dos services
- [ ] Testes de integração dos endpoints
- [ ] Testes do webhook (usar webhook.site para simular)
- [ ] Testes de cálculo de preços
- [ ] Testes de expiração de créditos

### Fase 6: Monitoramento
- [ ] Logs estruturados (JSON)
- [ ] Alertas de falha de pagamento
- [ ] Dashboard de métricas (MRR, churn, etc.)
- [ ] Relatório de créditos expirados

---

## 10. Variáveis de Ambiente

```env
# Provedor de Pagamento
PAYMENT_PROVIDER=stripe  # ou 'pagarme', 'asaas'
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
FRONTEND_URL=https://seudominio.com
BACKEND_URL=https://api.seudominio.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/seu_database

# JWT
JWT_SECRET=...
JWT_EXPIRATION=7d
```

---

## 11. Decisões Pendentes — Alinhar com Lead/Time

### 🔴 Críticas (Bloqueia implementação)

#### 1. **Provedor de Pagamento**
- ✅ **Decisão**: Stripe
- **Impacto Backend**: Biblioteca a instalar, estrutura de webhook, formato de eventos
- **Impacto Frontend**: SDK do Stripe (Stripe.js), componentes de checkout
- **Ação**: Criar conta Stripe, obter API keys (test + production)

#### 2. **Trial B2B — Cobrança**
- **Opção A**: Cobrar R$ 9,90 imediatamente + R$ 49,90 após 7 dias
- **Opção B**: Não cobrar nada nos 7 dias, cobrar R$ 49,90 após trial
- **Opção C**: Cobrar R$ 9,90 imediatamente, descontar do valor mensal após trial
- **Impacto Backend**: Lógica de criação de subscription no Stripe, campo `trial_price` usado ou não
- **Impacto Frontend**: Texto exibido no card de preço ("Teste por R$ 9,90" vs "7 dias grátis")
- **Pergunta**: Qual opção? Como exibir no frontend?

#### 3. **Período B2B — Forma de Cobrança**
- **Opção A**: Cobrar valor total de uma vez (R$ 479,04 anual em janeiro)
- **Opção B**: Cobrar mensalmente com desconto (R$ 39,92/mês por 12 meses)
- **Impacto Backend**: 
  - Opção A: `interval: 'year'` no Stripe
  - Opção B: `interval: 'month'` com metadata de desconto
- **Impacto Frontend**: Texto "Cobrado anualmente" vs "Cobrado mensalmente com 20% de desconto"
- **Pergunta**: Qual opção? Isso afeta o fluxo de cancelamento (reembolso proporcional?)

#### 4. **Webhook URL Pública**
- **Formato esperado**: `https://api.seudominio.com/api/v1/webhooks/payment`
- **Requisitos**: 
  - Domínio público (não localhost)
  - HTTPS obrigatório
  - Responder em < 5 segundos
- **Impacto Backend**: Configurar no Stripe Dashboard, validar signature
- **Impacto Frontend**: Nenhum (mas precisa saber URL de success/cancel)
- **Pergunta**: Qual será o domínio de produção? E de staging?

#### 5. **Autenticação — JWT**
- **Formato do token**: `Bearer <token>` no header `Authorization`?
- **Onde armazenar no frontend**: localStorage, sessionStorage, cookie httpOnly?
- **Expiração**: Quanto tempo? Refresh token?
- **Impacto Backend**: Middleware de autenticação em todos os endpoints de subscription/credits
- **Impacto Frontend**: Interceptor axios para adicionar token, lógica de refresh
- **Pergunta**: Já existe sistema de auth? Qual formato? Onde o frontend pega o token?

---

### 🟡 Importantes (Afeta UX/Regras de negócio)

#### 6. **Créditos B2C — Expiração**
- **Opção A**: Créditos expiram após validade (30/90/180 dias) — usuário perde
- **Opção B**: Créditos acumulam, mas cada compra tem validade própria (FIFO)
- **Opção C**: Créditos nunca expiram
- **Impacto Backend**: 
  - Opção A: Cron job para expirar créditos, campo `expires_at` único
  - Opção B: Tabela `credit_batches` com validade por lote
  - Opção C: Remover campo `expires_at`
- **Impacto Frontend**: Exibir ou não data de expiração, alertas de créditos expirando
- **Pergunta**: Qual regra? Como notificar usuário antes de expirar?

#### 7. **Refund — Reembolso**
- **Cenário 1**: Usuário cancela subscription no trial — reembolsar trial_price?
- **Cenário 2**: Usuário cancela subscription no meio do período — reembolso proporcional?
- **Cenário 3**: Usuário compra créditos e não usa — reembolsar?
- **Impacto Backend**: 
  - Endpoint `POST /api/v1/payments/{id}/refund`
  - Lógica de reverter créditos/subscription
  - Integração com Stripe Refunds API
- **Impacto Frontend**: Botão "Solicitar reembolso" ou processo manual?
- **Pergunta**: Permitir refund? Quais cenários? Automático ou manual (suporte)?

#### 8. **Upgrade/Downgrade de Plano**
- **Upgrade (Básico → Premium)**:
  - Cobrar diferença imediatamente?
  - Calcular prorate (proporcional ao tempo restante)?
  - Resetar período de cobrança?
- **Downgrade (Premium → Básico)**:
  - Aplicar no próximo ciclo ou imediatamente?
  - Reembolsar diferença?
  - Manter recursos do plano antigo até fim do período?
- **Impacto Backend**: 
  - Endpoint `POST /api/v1/subscriptions/change-plan`
  - Lógica de cálculo de prorate
  - Atualizar subscription no Stripe
- **Impacto Frontend**: Modal de confirmação com preview do valor a pagar/receber
- **Pergunta**: Permitir? Como calcular? Aplicar quando?

#### 9. **Mudança de Período (Mensal → Anual)**
- **Cenário**: Usuário está no plano Profissional Mensal, quer mudar para Anual
- **Opção A**: Cancelar subscription atual, criar nova (perde histórico)
- **Opção B**: Atualizar subscription existente com prorate
- **Impacto Backend**: Endpoint `POST /api/v1/subscriptions/change-period`
- **Impacto Frontend**: Botão "Mudar para anual e economizar 20%"
- **Pergunta**: Permitir? Como calcular transição?

---

### 🟢 Opcionais (Melhorias futuras)

#### 10. **Múltiplas Subscriptions**
- **Cenário**: Usuário pode ter subscription B2B + créditos B2C simultaneamente?
- **Impacto Backend**: Remover constraint `UNIQUE(user_id, status)` ou adicionar `subscription_type`
- **Impacto Frontend**: Exibir ambos na dashboard
- **Pergunta**: Permitir? São produtos separados ou excludentes?

#### 11. **Cupons de Desconto**
- **Funcionalidade**: Código promocional (ex: `PROMO20` = 20% off)
- **Impacto Backend**: 
  - Tabela `coupons` (code, discount_type, discount_value, expires_at)
  - Endpoint `POST /api/v1/coupons/validate`
  - Aplicar desconto no checkout
- **Impacto Frontend**: Campo de input no checkout, validação em tempo real
- **Pergunta**: Implementar na v1 ou deixar para depois?

#### 12. **Histórico de Faturas (Invoices)**
- **Funcionalidade**: Usuário baixa PDF das faturas pagas
- **Impacto Backend**: 
  - Endpoint `GET /api/v1/subscriptions/invoices`
  - Buscar invoices do Stripe
  - Gerar PDF ou retornar URL do Stripe
- **Impacto Frontend**: Página "Minhas Faturas" com lista e botão download
- **Pergunta**: Implementar na v1 ou deixar para depois?

#### 13. **Notificações de Pagamento**
- **Cenário**: Enviar email quando:
  - Pagamento aprovado
  - Pagamento falhou
  - Subscription vai renovar em 3 dias
  - Créditos vão expirar em 7 dias
- **Impacto Backend**: 
  - Integração com serviço de email (SendGrid, AWS SES)
  - Templates de email
  - Cron jobs para notificações agendadas
- **Impacto Frontend**: Nenhum (mas usuário recebe emails)
- **Pergunta**: Implementar na v1? Quais eventos notificar?

#### 14. **Limite de Uso (Rate Limiting)**
- **Cenário**: Usuário do plano Básico tem limite de 50 recursos/mês
- **Como controlar**: 
  - Contador no banco (`usage_count` na subscription)
  - Resetar a cada período
  - Bloquear acesso ao atingir limite
- **Impacto Backend**: Middleware para verificar limite antes de permitir ação
- **Impacto Frontend**: Exibir "Você usou 45/50 recursos este mês"
- **Pergunta**: Implementar controle de limite? Como exibir?

#### 15. **Teste A/B de Preços**
- **Cenário**: Testar preço de R$ 49,90 vs R$ 59,90 para novos usuários
- **Impacto Backend**: 
  - Campo `price_variant` na subscription
  - Lógica para sortear variante
  - Analytics para medir conversão
- **Impacto Frontend**: Exibir preço conforme variante
- **Pergunta**: Implementar? Ou preços são fixos?

---

### 📋 Checklist de Alinhamento

**Para reunião com o lead, confirmar:**

- [x] Provedor: Stripe confirmado ✅
- [ ] Trial: Cobrar ou não? Quanto?
- [ ] Período: Cobrança única anual ou mensal com desconto?
- [ ] Webhook URL: Qual domínio? (prod + staging)
- [ ] Auth: Formato do JWT? Onde frontend armazena?
- [ ] Créditos: Expiram ou acumulam?
- [ ] Refund: Permitir? Quais cenários?
- [ ] Upgrade/Downgrade: Permitir? Como calcular?
- [ ] Mudança de período: Permitir?
- [ ] Múltiplas subscriptions: Sim ou não?
- [ ] Cupons: v1 ou v2?
- [ ] Faturas: v1 ou v2?
- [ ] Notificações: v1 ou v2? Quais eventos?
- [ ] Limite de uso: Controlar? Como exibir?
- [ ] Teste A/B: Implementar ou não?

---

### 📝 Template de Resposta para o Lead

```
Olá [Nome do Lead],

Estou estruturando o backend de planos e pagamentos (B2B subscription + B2C créditos).
Preciso alinhar algumas decisões antes de começar a implementação:

CRÍTICAS (bloqueiam desenvolvimento):
1. Trial B2B: Cobrar R$ 9,90 imediatamente ou trial grátis?
2. Período anual: Cobrar R$ 479,04 de uma vez ou R$ 39,92/mês?
3. Webhook URL: Qual será o domínio público? (prod + staging)
4. Autenticação: Qual formato do JWT? Onde o frontend armazena o token?

IMPORTANTES (afetam UX):
5. Créditos B2C: Expiram após 30/90/180 dias ou acumulam?
6. Refund: Permitir reembolso? Em quais cenários?
7. Upgrade/Downgrade: Permitir troca de plano? Como calcular?

OPCIONAIS (podemos deixar para v2):
8. Cupons de desconto
9. Histórico de faturas em PDF
10. Notificações por email
11. Controle de limite de uso

Podemos agendar 30min para alinhar? Tenho um doc completo com detalhes.

Obrigado!
```

---

## 12. Referências Úteis

### Documentação de Provedores
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Pagar.me Assinaturas](https://docs.pagar.me/docs/assinaturas-recorrentes)
- [Asaas API](https://docs.asaas.com/reference/introducao)

### Bibliotecas Python
```bash
pip install stripe  # Stripe
pip install pagarme-python  # Pagar.me
pip install asaas-python  # Asaas (não oficial)
```

### Bibliotecas Node.js
```bash
npm install stripe  # Stripe
npm install pagarme  # Pagar.me
```

---

## 13. Exemplo de Resposta Completa (GET /subscriptions/current)

```json
{
  "subscription": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "trial_end": null,
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2025-01-01T00:00:00Z",
    "days_remaining": 245,
    "cancel_at_period_end": false,
    "canceled_at": null,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "plan": {
    "id": "basic",
    "name": "Básico",
    "description": "Plano inicial",
    "credits": 100,
    "max_users": 1,
    "max_resource_a": 50,
    "max_resource_b": 10
  },
  "billing": {
    "period": "annual",
    "period_name": "Anual",
    "months": 12,
    "discount_percentage": 20,
    "base_price": 49.90,
    "monthly_price": 39.92,
    "total_amount": 479.04,
    "currency": "BRL",
    "next_billing_date": "2025-01-01T00:00:00Z"
  },
  "usage": {
    "resource_a_used": 12,
    "resource_a_remaining": 38,
    "users_count": 1,
    "users_limit": 1
  }
}
```
