# B2C — Sistema de Subscriptions para Alunos (Design e Lógica)

> Este documento descreve como adaptar a lógica de subscriptions existente para um modelo B2C voltado a uma instituição de ensino. O aluno cria conta, compra produtos (cursos/conteúdos) via Stripe, e o acesso é liberado enquanto a subscription estiver ativa.

---

## 1. Contexto e diferença do modelo atual

### Modelo atual (B2B — este projeto)
- Quem paga é o **tenant** (empresa/organização)
- Um admin configura o plano da organização inteira
- Todos os usuários da organização herdam o acesso
- 1 subscription por organização

### Novo modelo (B2C — instituição de ensino)
- Quem paga é o **aluno** diretamente
- Cada aluno tem sua própria conta e suas próprias subscriptions
- O acesso é individual — aluno A não interfere no aluno B
- 1 aluno pode ter N subscriptions (um produto por subscription)
- Quando a subscription expira/cancela, o conteúdo some automaticamente

---

## 2. Entidades do banco de dados

### 2.1 `User` — o aluno

A entidade central. Cada aluno tem uma conta com email/senha e um `stripe_customer_id` vinculado.

```prisma
model User {
  id                 Int      @id @default(autoincrement())
  name               String   @db.VarChar(100)
  email              String   @unique @db.VarChar(150)
  stripe_customer_id String?  @unique @db.VarChar(100)  -- criado na primeira compra
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  UserCredential     UserCredential?
  UserSessionToken   UserSessionToken[]
  UserSubscription   UserSubscription[]
}
```

O `stripe_customer_id` é criado/recuperado no momento do checkout. Guardar ele evita criar customers duplicados no Stripe para o mesmo email.

### 2.2 `Product` — o produto/curso

Representa um curso ou conteúdo vendável. Espelha o produto criado no Stripe.

```prisma
model Product {
  id                String   @id @default(cuid())
  stripe_product_id String   @unique @db.VarChar(100)  -- ID do produto no Stripe
  name              String   @db.VarChar(255)
  description       String?  @db.Text
  slug              String   @unique @db.VarChar(100)   -- para URLs amigáveis
  active            Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  ProductPrice      ProductPrice[]
  UserSubscription  UserSubscription[]
}
```

### 2.3 `ProductPrice` — os preços do produto

Um produto pode ter múltiplos preços (mensal, anual, etc.). Cada preço espelha um `Price` no Stripe.

```prisma
model ProductPrice {
  id              String   @id @default(cuid())
  stripe_price_id String   @unique @db.VarChar(100)  -- price_id do Stripe
  product_id      String
  Product         Product  @relation(fields: [product_id], references: [id])
  interval        String   @db.VarChar(20)   -- month, year, week
  interval_count  Int      @default(1) @db.SmallInt
  unit_amount     Int                         -- em centavos
  currency        String   @default("brl") @db.VarChar(3)
  active          Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  UserSubscription UserSubscription[]
}
```

### 2.4 `UserSubscription` — a subscription do aluno

Registra cada subscription ativa (ou histórica) de um aluno para um produto específico.

```prisma
model UserSubscription {
  id                     String    @id @default(cuid())
  user_id                Int
  User                   User      @relation(fields: [user_id], references: [id])
  product_id             String
  Product                Product   @relation(fields: [product_id], references: [id])
  product_price_id       String
  ProductPrice           ProductPrice @relation(fields: [product_price_id], references: [id])

  -- IDs do Stripe
  stripe_subscription_id String    @unique @db.VarChar(100)
  stripe_customer_id     String    @db.VarChar(100)
  stripe_price_id        String    @db.VarChar(100)

  -- Status e período
  status                 String    @db.VarChar(50)
  -- active | trialing | past_due | canceled | incomplete | unpaid

  current_period_start   DateTime
  current_period_end     DateTime
  trial_start            DateTime?
  trial_end              DateTime?
  canceled_at            DateTime?
  cancel_at_period_end   Boolean   @default(false)

  -- Valor
  amount                 Int       -- em centavos
  currency               String    @default("brl") @db.VarChar(3)

  created_at             DateTime  @default(now())
  updated_at             DateTime  @updatedAt

  @@index([user_id, status])           -- busca rápida de subscriptions ativas do aluno
  @@index([stripe_subscription_id])    -- lookup pelo ID do Stripe no webhook
}
```

### 2.5 `StripeWebhookEvent` — log de eventos (idempotência)

```prisma
model StripeWebhookEvent {
  id                  Int      @id @default(autoincrement())
  stripe_event_id     String   @unique @db.VarChar(255)
  event_type          String   @db.VarChar(100)
  payload             Json
  processed           Boolean  @default(false)
  error_message       String?  @db.Text
  processing_attempts Int      @default(0) @db.SmallInt
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  @@index([processed, processing_attempts])
}
```

---

## 3. Fluxo completo do aluno

```
1. Aluno cria conta (POST /auth/register)
   → Cria User no banco
   → stripe_customer_id ainda é null

2. Aluno navega na página de produtos (GET /products)
   → Lista produtos ativos com seus preços

3. Aluno clica em "Assinar" (POST /subscriptions/checkout)
   → Backend verifica se aluno já tem subscription ativa para esse produto
   → Se não tem: cria ou recupera o stripe_customer_id do aluno
   → Cria checkout session no Stripe com metadata: { userId, productId, priceId }
   → Retorna checkoutUrl
   → Aluno é redirecionado para o Stripe Hosted Checkout

4. Aluno paga no Stripe

5. Stripe dispara webhook para POST /webhooks/stripe
   → Backend valida assinatura HMAC
   → Verifica idempotência pelo stripe_event_id
   → Evento checkout.session.completed:
     - Lê userId, productId, priceId do metadata
     - Salva stripe_customer_id no User (se ainda não tinha)
     - Cria UserSubscription com status = 'active' (ou 'trialing')
   → Retorna 200 imediatamente

6. Aluno acessa o conteúdo (GET /products/:slug/content)
   → Guard verifica se existe UserSubscription ativa para esse produto
   → Se sim: libera o conteúdo
   → Se não: retorna 403

7. Stripe renova a subscription mensalmente
   → Webhook invoice.paid → atualiza current_period_end na UserSubscription
   → Conteúdo continua acessível

8. Aluno cancela (POST /subscriptions/:id/cancel)
   → Backend chama Stripe para cancelar no fim do período
   → cancel_at_period_end = true
   → Conteúdo ainda acessível até current_period_end

9. Período encerra
   → Stripe dispara customer.subscription.deleted
   → Backend atualiza status = 'canceled'
   → Guard bloqueia acesso ao conteúdo
```

---

## 4. Lógica de acesso ao conteúdo

### 4.1 Guard de subscription

O guard é o ponto central de controle de acesso. Ele verifica se o aluno tem uma subscription ativa para o produto solicitado.

```typescript
// subscription-access.guard.ts
@Injectable()
export class SubscriptionAccessGuard implements CanActivate {
  constructor(private readonly subscriptionRepo: UserSubscriptionRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: number = request.user_id;
    const productSlug: string = request.params.slug;

    const hasAccess = await this.subscriptionRepo.hasActiveSubscription(userId, productSlug);

    if (!hasAccess) {
      throw new ForbiddenException('Subscription inativa ou inexistente para este produto.');
    }

    return true;
  }
}
```

### 4.2 O que é "ativa"

Uma subscription dá acesso ao conteúdo quando:

```typescript
function isSubscriptionActive(sub: UserSubscription): boolean {
  const now = new Date();
  const isActiveStatus = ['active', 'trialing'].includes(sub.status);
  const isWithinPeriod = now <= sub.current_period_end;

  // cancelAtPeriodEnd = true significa que cancelou mas ainda está no período pago
  const isCanceledButStillValid =
    sub.cancel_at_period_end &&
    sub.status === 'active' &&
    isWithinPeriod;

  return (isActiveStatus && isWithinPeriod) || isCanceledButStillValid;
}
```

Quando o acesso é bloqueado:
- `status = 'canceled'` e período encerrou
- `status = 'past_due'` (pagamento falhou) — decisão de negócio: bloquear imediatamente ou dar grace period
- `status = 'unpaid'`
- `current_period_end` no passado (subscription expirou sem renovar)

### 4.3 Query de verificação de acesso

```typescript
// user-subscription.repository.ts
async hasActiveSubscription(userId: number, productSlug: string): Promise<boolean> {
  const now = new Date();
  const subscription = await this.prisma.userSubscription.findFirst({
    where: {
      user_id: userId,
      status: { in: ['active', 'trialing'] },
      current_period_end: { gte: now },
      Product: { slug: productSlug },
    },
  });
  return subscription !== null;
}
```

---

## 5. Checkout — criação da sessão

```typescript
// create-checkout-session.use-case.ts
async execute({ userId, priceId }: { userId: number; priceId: string }): Promise<{ checkoutUrl: string }> {
  // 1. Buscar o preço e o produto vinculado
  const price = await this.priceRepo.findByStripePriceId(priceId);
  if (!price || !price.active) throw new NotFoundException('Preço não encontrado.');

  // 2. Verificar se já tem subscription ativa para esse produto
  const alreadySubscribed = await this.subscriptionRepo.hasActiveSubscription(userId, price.product.slug);
  if (alreadySubscribed) throw new ConflictException('Você já possui uma assinatura ativa para este produto.');

  // 3. Criar ou recuperar o customer no Stripe
  const user = await this.userRepo.findById(userId);
  let customerId = user.stripe_customer_id;

  if (!customerId) {
    const customer = await this.stripeProvider.createOrRetrieveCustomer({
      email: user.email,
      name: user.name,
      metadata: { userId: userId.toString() },
    });
    customerId = customer.id;
    await this.userRepo.update(userId, { stripe_customer_id: customerId });
  }

  // 4. Criar checkout session
  const session = await this.stripeProvider.createCheckoutSession({
    customerId,
    priceId,
    successUrl: `${process.env.FRONTEND_URL}/dashboard?checkout=success&product=${price.product.slug}`,
    cancelUrl: `${process.env.FRONTEND_URL}/products/${price.product.slug}?checkout=canceled`,
    metadata: {
      userId: userId.toString(),
      productId: price.product_id,
      priceId: price.id,
    },
    subscriptionData: {
      metadata: {
        userId: userId.toString(),
        productId: price.product_id,
      },
    },
  });

  return { checkoutUrl: session.url };
}
```

---

## 6. Processamento do webhook

### 6.1 Eventos a tratar

| Evento Stripe | O que fazer |
|---------------|-------------|
| `checkout.session.completed` | Criar `UserSubscription` no banco |
| `customer.subscription.updated` | Atualizar status, período e `cancel_at_period_end` |
| `customer.subscription.deleted` | Setar `status = 'canceled'`, `canceled_at = now` |
| `invoice.paid` | Atualizar `current_period_end` (renovação confirmada) |
| `invoice.payment_failed` | Setar `status = 'past_due'` |

### 6.2 Lógica do checkout.session.completed

```typescript
private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = parseInt(session.metadata?.userId ?? '0');
  const productId = session.metadata?.productId;
  const priceId = session.metadata?.priceId;
  const stripeSubscriptionId = session.subscription as string;

  if (!userId || !productId || !priceId || !stripeSubscriptionId) {
    throw new Error('Metadata incompleto no checkout.session.completed');
  }

  // Buscar detalhes da subscription no Stripe para pegar as datas
  const stripeSub = await this.stripeProvider.retrieveSubscription(stripeSubscriptionId);

  // Salvar stripe_customer_id no User se ainda não tinha
  const customerId = session.customer as string;
  await this.userRepo.updateStripeCustomerId(userId, customerId);

  // Criar UserSubscription
  await this.subscriptionRepo.create({
    user_id: userId,
    product_id: productId,
    product_price_id: priceId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: customerId,
    stripe_price_id: stripeSub.items.data[0].price.id,
    status: stripeSub.status,
    current_period_start: new Date(stripeSub.current_period_start * 1000),
    current_period_end: new Date(stripeSub.current_period_end * 1000),
    trial_start: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
    trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
    amount: stripeSub.items.data[0].price.unit_amount ?? 0,
    currency: stripeSub.currency,
  });
}
```

### 6.3 Lógica do invoice.paid (renovação)

```typescript
private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubscriptionId = invoice.subscription as string;
  if (!stripeSubscriptionId) return;

  // Buscar subscription atualizada no Stripe
  const stripeSub = await this.stripeProvider.retrieveSubscription(stripeSubscriptionId);

  // Atualizar período e status no banco
  await this.subscriptionRepo.updateByStripeSubscriptionId(stripeSubscriptionId, {
    status: 'active',
    current_period_start: new Date(stripeSub.current_period_start * 1000),
    current_period_end: new Date(stripeSub.current_period_end * 1000),
    cancel_at_period_end: stripeSub.cancel_at_period_end,
  });
}
```

---

## 7. Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/products` | Público | Listar produtos ativos com preços |
| `GET` | `/products/:slug` | Público | Detalhes de um produto |
| `GET` | `/products/:slug/content` | JwtGuard + SubscriptionAccessGuard | Acessar conteúdo do produto |
| `POST` | `/subscriptions/checkout` | JwtGuard | Iniciar checkout para um preço |
| `GET` | `/subscriptions/my` | JwtGuard | Listar subscriptions do aluno logado |
| `POST` | `/subscriptions/:id/cancel` | JwtGuard | Cancelar subscription (no fim do período) |
| `POST` | `/webhooks/stripe` | Stripe signature | Receber eventos do Stripe |

---

## 8. Diferenças-chave em relação ao modelo B2B

| Aspecto | B2B (este projeto) | B2C (novo) |
|---------|-------------------|------------|
| Quem assina | Organização/tenant | Aluno (User) |
| Quem inicia o checkout | Admin | O próprio aluno |
| Quantas subscriptions | 1 por organização | N por aluno (1 por produto) |
| Controle de acesso | Todos da org herdam | Individual por aluno |
| Webhook URL | Por tenant (`:tenantId`) | Única (`/webhooks/stripe`) |
| Chaves Stripe | Por tenant (criptografadas) | Global (1 conta Stripe) |
| Cancelamento | Admin cancela | Aluno cancela a própria |
| Conteúdo bloqueado ao cancelar | Não se aplica | Sim — some ao fim do período |

---

## 9. Pontos de atenção

### 9.1 Nunca confiar no frontend para liberar acesso

O acesso ao conteúdo deve ser sempre validado no backend via guard. O frontend pode esconder botões, mas a API precisa rejeitar requisições de alunos sem subscription ativa.

### 9.2 Guardar stripe_customer_id no User

Sem isso, cada checkout cria um novo customer no Stripe para o mesmo email. Com o tempo, o Stripe fica cheio de customers duplicados e o histórico de cobranças fica fragmentado.

### 9.3 Metadata no checkout é obrigatório

O `userId`, `productId` e `priceId` precisam estar no metadata da session. Se o webhook receber um evento sem esses dados, não tem como saber para qual aluno liberar o acesso.

### 9.4 Raw body no webhook

O Stripe valida a assinatura usando o body bruto (não parseado). Configurar no `main.ts`:

```typescript
app.use(
  '/webhooks/stripe',
  json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
```

### 9.5 Responder 200 imediatamente no webhook

O Stripe considera o webhook como falho se não receber 200 em até 30 segundos. Responder imediatamente e processar em background:

```typescript
res.status(200).json({ received: true });
this.webhookService.processEvent(event).catch(console.error);
```

### 9.6 Idempotência é obrigatória

O Stripe pode reenviar o mesmo evento múltiplas vezes (retry automático). Sem idempotência, o mesmo aluno recebe acesso duplicado ou tem a subscription cancelada duas vezes. Sempre verificar `stripe_event_id` antes de processar.

### 9.7 past_due — decisão de negócio

Quando o pagamento falha, o Stripe muda o status para `past_due`. Você precisa decidir:
- Bloquear acesso imediatamente → mais rigoroso, pode frustrar alunos com falha temporária de cartão
- Dar grace period de X dias → mais amigável, mas precisa de lógica adicional

A recomendação é dar pelo menos 3-7 dias de grace period e enviar email de aviso.

---

## 10. Variáveis de ambiente

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...   # retornado na API para o frontend iniciar checkout
STRIPE_WEBHOOK_SECRET=whsec_...      # obtido ao criar o endpoint no Stripe Dashboard
FRONTEND_URL=https://www.seusite.com
JWT_SECRET=...
```

---

## 11. Estrutura de módulo sugerida

```
src/modules/
├── auth/                        # login, registro, sessão do aluno
├── user/                        # perfil do aluno
├── product/                     # listagem de produtos e preços
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── product.dto.ts
├── subscription/                # checkout, listagem, cancelamento
│   ├── subscription.controller.ts
│   ├── subscription.service.ts
│   ├── subscription.dto.ts
│   └── subscription.type.ts
└── webhook/                     # recebe e processa eventos do Stripe
    ├── webhook.controller.ts
    └── webhook.service.ts

src/core/
└── providers/
    └── Stripe.ts                # wrapper do SDK (lazy init)

src/core/guards/
└── subscription-access.guard.ts # verifica se aluno tem acesso ao produto
```

---

*Documento gerado em 28/04/2026 — baseado na lógica existente do projeto e adaptada para o modelo B2C de instituição de ensino.*
