# Arquitetura Multi-Tenant: Sistemas de Pagamento

## 🏗️ Visão Geral

Todos os 3 sistemas de pagamento são **multi-tenant**. Cada tenant (empresa/instituição) tem:
- Sua própria conta Stripe
- Seus próprios produtos
- Suas próprias vendas/assinaturas
- Isolamento completo de dados

## 📊 Estrutura Multi-Tenant

```
Tenant A (Instituição de Ensino A)
  ├── Stripe Account A
  ├── Sistema Interno
  │   └── Assinatura do plano ZARP (Pro)
  ├── B2B Payments
  │   ├── Produto: "Consultoria Premium" (R$ 5.000)
  │   └── Purchases: [compra1, compra2, ...]
  └── B2C Subscriptions
      ├── Produto: "Curso de JavaScript" (R$ 99/mês)
      ├── Produto: "Curso de Python" (R$ 149/mês)
      └── UserSubscriptions: [aluno1, aluno2, ...]

Tenant B (Instituição de Ensino B)
  ├── Stripe Account B
  ├── Sistema Interno
  │   └── Assinatura do plano ZARP (Enterprise)
  ├── B2B Payments
  │   ├── Produto: "Produto Físico X" (R$ 1.500)
  │   └── Purchases: [compra1, compra2, ...]
  └── B2C Subscriptions
      ├── Produto: "Curso de React" (R$ 199/mês)
      └── UserSubscriptions: [aluno1, aluno2, ...]
```

---

## 🔐 Isolamento de Dados

### Nível de Banco de Dados

Todas as tabelas têm `tenant_id`:

```sql
-- B2B
b2b_products (tenant_id, ...)
b2b_purchases (tenant_id, ...)

-- B2C
b2c_products (tenant_id, ...)
b2c_product_prices (tenant_id, ...)
b2c_user_subscriptions (tenant_id, ...)

-- Sistema Interno
stripe_subscriptions (tenant_id, ...)
tenant_billing_config (tenant_id, ...)
```

### Nível de Aplicação

Todos os endpoints filtram por `tenant_id`:

```typescript
// Exemplo: Listar produtos B2B do tenant
const products = await prisma.b2BProduct.findMany({
  where: {
    tenant_id: currentTenant.id,
    active: true,
  },
});
```

---

## 🎯 Sistema 1: Plataforma ZARP (Interno)

### O que é
Assinatura da própria plataforma ZARP (CNPJ lookup, brand monitoring, etc).

### Multi-Tenancy
- Cada tenant assina um plano (Free, Basic, Pro, Enterprise)
- Tenant tem seu próprio `stripe_customer_id`
- Cobrança mensal/anual por tenant

### Tabelas
```
Tenant
  ├── stripe_customer_id (cliente Stripe do tenant)
  ├── subscription_status (none, active, trialing, etc)
  ├── StripeSubscription (assinatura ativa)
  └── TenantBillingConfig (configuração de cobrança)
```

### Webhook
- **URL**: `/api/webhooks/stripe`
- **Secret**: Por tenant (cada tenant tem seu próprio webhook secret)
- **Eventos**: subscription.*, invoice.*

---

## 💼 Sistema 2: B2B One-Time Payments

### O que é
Pagamentos únicos para produtos/serviços do tenant.

### Multi-Tenancy
- Cada tenant cria seus próprios produtos B2B no Stripe
- Cada tenant vê apenas suas próprias vendas
- Stripe Account é do tenant

### Tabelas
```
B2BProduct
  ├── tenant_id (dono do produto)
  ├── stripe_product_id (produto no Stripe do tenant)
  └── stripe_price_id (preço no Stripe do tenant)

B2BPurchase
  ├── tenant_id (tenant que vendeu)
  ├── product_id (produto vendido)
  ├── customer_email (comprador)
  └── status (pending, completed, abandoned, refunded)
```

### Fluxo
```
1. Admin do Tenant A cria produto no Stripe do Tenant A
2. Admin sincroniza produto no banco (INSERT com tenant_id)
3. Admin cria link de pagamento para cliente
4. Cliente paga no Stripe do Tenant A
5. Webhook notifica backend com tenant_id
6. Backend registra purchase vinculada ao Tenant A
```

### Webhook
- **URL**: `/api/webhooks/b2b/stripe`
- **Secret**: Por tenant (usa Stripe Account do tenant)
- **Eventos**: checkout.session.*, payment_intent.*, charge.refunded
- **Metadata**: Deve incluir `tenant_id` para identificar o tenant

---

## 👨‍🎓 Sistema 3: B2C Student Subscriptions

### O que é
Assinaturas recorrentes de cursos online do tenant.

### Multi-Tenancy
- Cada tenant (instituição de ensino) tem seus próprios cursos
- Estudantes assinam cursos de um tenant específico
- Stripe Account é do tenant

### Tabelas
```
Product (Curso)
  ├── tenant_id (instituição dona do curso)
  ├── stripe_product_id (produto no Stripe do tenant)
  └── slug (único por tenant)

ProductPrice
  ├── tenant_id (instituição)
  ├── stripe_price_id (preço no Stripe do tenant)
  └── product_id (curso)

UserSubscription
  ├── tenant_id (instituição)
  ├── user_id (estudante)
  ├── product_id (curso assinado)
  └── stripe_subscription_id (assinatura no Stripe do tenant)
```

### Fluxo
```
1. Tenant A cria curso no Stripe do Tenant A
2. Tenant A sincroniza curso no banco (INSERT com tenant_id)
3. Estudante acessa site do Tenant A
4. Estudante assina curso do Tenant A
5. Pagamento vai para Stripe do Tenant A
6. Webhook notifica backend com tenant_id
7. Backend cria UserSubscription vinculada ao Tenant A
8. Estudante acessa conteúdo do Tenant A
```

### Webhook
- **URL**: `/api/webhooks/b2c/stripe`
- **Secret**: Por tenant (usa Stripe Account do tenant)
- **Eventos**: checkout.session.completed, customer.subscription.*, invoice.*
- **Metadata**: Deve incluir `tenant_id` para identificar o tenant

---

## 🔑 Configuração do Stripe por Tenant

### Modelo: TenantBillingConfig

```prisma
model TenantBillingConfig {
  id                        String   @id
  tenant_id                 String   @unique
  
  // Stripe API Keys do tenant
  stripe_secret_key         String?  // Criptografado
  stripe_publishable_key    String?
  
  // Webhook Secrets do tenant
  stripe_webhook_secret     String?  // Sistema Interno
  stripe_webhook_secret_b2b String?  // B2B Payments
  stripe_webhook_secret_b2c String?  // B2C Subscriptions
  
  // Configurações
  billing_email             String?
  tax_id                    String?
  
  created_at                DateTime
  updated_at                DateTime
  
  tenant                    Tenant   @relation(...)
}
```

### Como Funciona

1. **Cada tenant configura suas próprias credenciais Stripe**:
   ```typescript
   // Admin do Tenant A configura
   await prisma.tenantBillingConfig.upsert({
     where: { tenant_id: tenantA.id },
     update: {
       stripe_secret_key: encrypt('sk_live_tenantA_xxxxx'),
       stripe_webhook_secret_b2b: 'whsec_tenantA_b2b_xxxxx',
       stripe_webhook_secret_b2c: 'whsec_tenantA_b2c_xxxxx',
     },
   });
   ```

2. **Backend usa credenciais do tenant correto**:
   ```typescript
   // Ao criar checkout B2B
   const config = await getTenantBillingConfig(tenantId);
   const stripe = new Stripe(decrypt(config.stripe_secret_key));
   
   const session = await stripe.checkout.sessions.create({
     // ... configuração do checkout
     metadata: {
       tenant_id: tenantId, // IMPORTANTE!
       product_id: productId,
     },
   });
   ```

3. **Webhook valida assinatura do tenant correto**:
   ```typescript
   // Webhook B2B
   const signature = req.headers['stripe-signature'];
   const tenantId = extractTenantFromEvent(rawBody); // Do metadata
   
   const config = await getTenantBillingConfig(tenantId);
   const event = stripe.webhooks.constructEvent(
     rawBody,
     signature,
     config.stripe_webhook_secret_b2b // Secret do tenant
   );
   ```

---

## 🛡️ Segurança Multi-Tenant

### Guards

Todos os endpoints verificam que o admin pertence ao tenant:

```typescript
@UseGuards(AdminJwtGuard, TenantGuard)
@Get('b2b/payments/products')
async listProducts(@CurrentTenant() tenant: Tenant) {
  // Retorna apenas produtos do tenant do admin
  return this.listProductsUseCase.execute(tenant.id);
}
```

### Queries

Todas as queries filtram por `tenant_id`:

```typescript
// ❌ ERRADO - Retorna produtos de todos os tenants
const products = await prisma.b2BProduct.findMany({
  where: { active: true },
});

// ✅ CORRETO - Retorna apenas produtos do tenant
const products = await prisma.b2BProduct.findMany({
  where: {
    tenant_id: tenantId,
    active: true,
  },
});
```

### Webhooks

Webhooks devem sempre extrair `tenant_id` do metadata:

```typescript
// Webhook B2B
const event = stripe.webhooks.constructEvent(...);

if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const tenantId = session.metadata.tenant_id; // OBRIGATÓRIO
  
  if (!tenantId) {
    throw new Error('Missing tenant_id in metadata');
  }
  
  // Processar apenas para este tenant
  await processPurchase(tenantId, session);
}
```

---

## 📋 Checklist de Implementação Multi-Tenant

### Para cada novo endpoint:
- [ ] Adicionar `@UseGuards(AdminJwtGuard, TenantGuard)`
- [ ] Injetar `@CurrentTenant()` no controller
- [ ] Passar `tenant.id` para o use case
- [ ] Filtrar queries por `tenant_id`
- [ ] Validar que recursos pertencem ao tenant

### Para cada webhook:
- [ ] Extrair `tenant_id` do metadata
- [ ] Buscar `TenantBillingConfig` do tenant
- [ ] Usar webhook secret do tenant
- [ ] Filtrar/criar recursos com `tenant_id`
- [ ] Validar que tenant existe e está ativo

### Para cada criação de checkout:
- [ ] Buscar `TenantBillingConfig` do tenant
- [ ] Usar Stripe API key do tenant
- [ ] Incluir `tenant_id` no metadata
- [ ] Incluir outros IDs necessários (product_id, user_id, etc)

---

## 🚀 Exemplo Completo: Criar Link B2B

### 1. Admin cria link

```typescript
// Controller
@Post('b2b/payments/create-link')
@UseGuards(AdminJwtGuard, TenantGuard)
async createLink(
  @CurrentTenant() tenant: Tenant,
  @Body() dto: CreatePaymentLinkDTO,
) {
  return this.createPaymentLinkUseCase.execute({
    tenantId: tenant.id,
    ...dto,
  });
}
```

### 2. Use Case cria checkout

```typescript
// Use Case
async execute(input: CreatePaymentLinkInput) {
  // 1. Buscar produto (validar que pertence ao tenant)
  const product = await this.productRepo.findById(input.productId);
  if (product.tenantId !== input.tenantId) {
    throw new ForbiddenException();
  }
  
  // 2. Buscar config Stripe do tenant
  const config = await this.getTenantBillingConfig(input.tenantId);
  const stripe = new Stripe(decrypt(config.stripe_secret_key));
  
  // 3. Criar purchase no banco
  const purchase = await this.purchaseRepo.create({
    tenant_id: input.tenantId,
    product_id: input.productId,
    customer_email: input.customerEmail,
    status: 'pending',
    amount: product.price,
  });
  
  // 4. Criar checkout no Stripe
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: product.stripePriceId, quantity: 1 }],
    customer_email: input.customerEmail,
    metadata: {
      tenant_id: input.tenantId, // IMPORTANTE!
      purchase_id: purchase.id,
      product_id: product.id,
    },
    success_url: `${config.frontend_url}/b2b/success`,
    cancel_url: `${config.frontend_url}/b2b/cancel`,
  });
  
  return { checkoutUrl: session.url, purchaseId: purchase.id };
}
```

### 3. Webhook processa pagamento

```typescript
// Webhook Controller
@Post('webhooks/b2b/stripe')
async handleWebhook(@Req() req: Request) {
  const signature = req.headers['stripe-signature'];
  const rawBody = (req as any).rawBody;
  
  // 1. Extrair tenant_id do evento (antes de validar)
  const tempEvent = JSON.parse(rawBody.toString());
  const tenantId = tempEvent.data.object.metadata?.tenant_id;
  
  if (!tenantId) {
    throw new BadRequestException('Missing tenant_id');
  }
  
  // 2. Buscar config do tenant
  const config = await this.getTenantBillingConfig(tenantId);
  
  // 3. Validar assinatura com secret do tenant
  const stripe = new Stripe(decrypt(config.stripe_secret_key));
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    config.stripe_webhook_secret_b2b
  );
  
  // 4. Processar evento para este tenant
  await this.processWebhookUseCase.execute({
    tenantId,
    event,
  });
  
  return { received: true };
}
```

---

## 🎯 Resumo

| Aspecto | Implementação |
|---------|---------------|
| **Isolamento** | Todas as tabelas têm `tenant_id` |
| **Stripe** | Cada tenant tem suas próprias credenciais |
| **Webhooks** | Cada tenant tem seus próprios secrets |
| **Segurança** | Guards validam tenant do admin |
| **Queries** | Sempre filtrar por `tenant_id` |
| **Metadata** | Sempre incluir `tenant_id` em checkouts |

---

## ⚠️ Erros Comuns

### ❌ Esquecer tenant_id no metadata
```typescript
// ERRADO
const session = await stripe.checkout.sessions.create({
  metadata: {
    product_id: productId, // Falta tenant_id!
  },
});
```

### ❌ Não filtrar por tenant_id
```typescript
// ERRADO - Retorna produtos de todos os tenants
const products = await prisma.b2BProduct.findMany();
```

### ❌ Usar secret global no webhook
```typescript
// ERRADO - Usa secret global
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET // Global!
);
```

### ✅ Correto
```typescript
// CORRETO
const config = await getTenantBillingConfig(tenantId);
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  config.stripe_webhook_secret_b2b // Do tenant!
);
```
