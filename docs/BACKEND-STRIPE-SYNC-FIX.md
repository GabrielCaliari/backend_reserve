# CORREÇÃO URGENTE: Backend deve buscar dados do Stripe, não do banco local

## ❌ Problema Atual

O backend está retornando apenas dados salvos no banco de dados local, ignorando os dados que já existem no Stripe.

**Impacto:**
- Products/Plans criados diretamente no Stripe → NÃO aparecem no painel
- Subscriptions criadas no Stripe → NÃO aparecem no painel
- Sistema parece "desconectado" do Stripe

## ✅ Solução

O backend deve buscar dados **diretamente do Stripe** via API, não do banco local.

---

## 1. Endpoint: GET /api/plans/admin/list

### ❌ Implementação Atual (ERRADA)

```typescript
async listPlans() {
  // Busca apenas do banco local
  return await this.prisma.stripePlan.findMany({
    where: { tenant_id: tenantId }
  });
}
```

### ✅ Implementação Correta

```typescript
import Stripe from 'stripe';

async listPlans(tenantId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // 1. Buscar TODOS os produtos do Stripe
  const products = await stripe.products.list({
    limit: 100,
    active: true, // ou remover para pegar inativos também
  });

  // 2. Para cada produto, buscar seus prices
  const plansWithPrices = await Promise.all(
    products.data.map(async (product) => {
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      // Pegar o price principal (ou todos)
      const mainPrice = prices.data[0];

      return {
        id: product.id, // usar o ID do Stripe
        slug: product.metadata?.slug || product.id,
        plan_name: product.name,
        description: product.description,
        stripe_product_id: product.id,
        stripe_price_id: mainPrice?.id,
        billing_interval: this.mapStripeToBillingInterval(mainPrice?.recurring),
        unit_amount: mainPrice?.unit_amount || 0,
        currency: mainPrice?.currency || 'brl',
        active: product.active,
        // Metadados do produto
        released_credits: parseInt(product.metadata?.released_credits || '0'),
        credits_released_trial_period: parseInt(product.metadata?.credits_released_trial_period || '0'),
        guest_limit: parseInt(product.metadata?.guest_limit || '0'),
        trial_days: parseInt(product.metadata?.trial_days || '0'),
        created_at: new Date(product.created * 1000).toISOString(),
        updated_at: new Date(product.updated * 1000).toISOString(),
      };
    })
  );

  return plansWithPrices;
}

private mapStripeToBillingInterval(recurring: any): number {
  if (!recurring) return 2; // default monthly
  
  if (recurring.interval === 'week') return 1;
  if (recurring.interval === 'month' && recurring.interval_count === 1) return 2;
  if (recurring.interval === 'month' && recurring.interval_count === 3) return 3;
  if (recurring.interval === 'year') return 4;
  
  return 2; // default
}
```

**Importante:**
- Use `product.metadata` para armazenar dados customizados (credits, guest_limit, etc)
- Quando criar produtos via painel, salve esses metadados no Stripe
- O banco local pode ser usado como cache, mas o Stripe é a fonte da verdade

---

## 2. Endpoint: GET /api/subscriptions/tenant/:tenantId

### ❌ Implementação Atual (ERRADA)

```typescript
async getSubscription(tenantId: string) {
  // Busca apenas do banco local
  return await this.prisma.subscription.findFirst({
    where: { tenant_id: tenantId }
  });
}
```

### ✅ Implementação Correta

```typescript
async getSubscription(tenantId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // 1. Buscar o customer do tenant
  // Você pode ter salvo o stripe_customer_id no banco
  const tenant = await this.prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripe_customer_id: true, email: true }
  });

  let customerId = tenant?.stripe_customer_id;

  // Se não tiver customer_id salvo, buscar no Stripe por email
  if (!customerId && tenant?.email) {
    const customers = await stripe.customers.list({
      email: tenant.email,
      limit: 1,
    });
    customerId = customers.data[0]?.id;
  }

  if (!customerId) {
    return { subscription: null };
  }

  // 2. Buscar subscriptions do customer no Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all', // ou 'active' para apenas ativas
    limit: 10,
  });

  if (subscriptions.data.length === 0) {
    return { subscription: null };
  }

  // 3. Pegar a subscription mais recente
  const stripeSubscription = subscriptions.data[0];
  const price = stripeSubscription.items.data[0]?.price;

  // 4. Mapear para o formato esperado pelo frontend
  return {
    subscription: {
      id: stripeSubscription.id,
      tenantId: tenantId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      stripePriceId: price?.id,
      stripeProductId: price?.product as string,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      trialStart: stripeSubscription.trial_start 
        ? new Date(stripeSubscription.trial_start * 1000).toISOString() 
        : null,
      trialEnd: stripeSubscription.trial_end 
        ? new Date(stripeSubscription.trial_end * 1000).toISOString() 
        : null,
      canceledAt: stripeSubscription.canceled_at 
        ? new Date(stripeSubscription.canceled_at * 1000).toISOString() 
        : null,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      amount: price?.unit_amount || 0,
      formattedAmount: (price?.unit_amount || 0) / 100,
      currency: price?.currency || 'brl',
      interval: price?.recurring?.interval || 'month',
      intervalCount: price?.recurring?.interval_count || 1,
      daysRemaining: Math.ceil(
        (stripeSubscription.current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      isActive: ['active', 'trialing'].includes(stripeSubscription.status),
      isInTrial: stripeSubscription.status === 'trialing',
      metadata: stripeSubscription.metadata,
      createdAt: new Date(stripeSubscription.created * 1000).toISOString(),
      updatedAt: new Date(stripeSubscription.created * 1000).toISOString(),
    }
  };
}
```

---

## 3. Endpoint: POST /api/plans/admin/create

### ✅ Implementação Correta (com metadados)

Quando criar um produto via painel, salve os metadados customizados no Stripe:

```typescript
async createPlan(data: CreateStripePlanDto) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // 1. Criar produto no Stripe COM metadados
  const product = await stripe.products.create({
    name: data.plan_name,
    description: data.description,
    metadata: {
      slug: data.slug,
      tenant_id: data.tenant_id,
      released_credits: data.released_credits.toString(),
      credits_released_trial_period: data.credits_released_trial_period?.toString() || '0',
      guest_limit: data.guest_limit.toString(),
      trial_days: data.trial_days?.toString() || '0',
    },
  });

  // 2. Criar price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: data.unit_amount,
    currency: data.currency,
    recurring: {
      interval: this.mapBillingIntervalToStripe(data.billing_interval),
      interval_count: data.billing_interval === 3 ? 3 : 1,
    },
  });

  // 3. (Opcional) Salvar no banco local como cache
  await this.prisma.stripePlan.create({
    data: {
      tenant_id: data.tenant_id,
      slug: data.slug,
      plan_name: data.plan_name,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      // ... outros campos
    },
  });

  return {
    id: product.id,
    stripe_product_id: product.id,
    stripe_price_id: price.id,
    // ... retornar dados completos
  };
}
```

---

## 4. Webhook: Sincronização (Opcional mas Recomendado)

Para manter o banco local sincronizado, processe os webhooks:

```typescript
@Post('/webhooks/stripe')
async handleWebhook(@Req() req: Request) {
  const sig = req.headers['stripe-signature'];
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await this.syncSubscriptionToDatabase(event.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await this.deleteSubscriptionFromDatabase(event.data.object.id);
      break;
      
    case 'product.created':
    case 'product.updated':
      await this.syncProductToDatabase(event.data.object);
      break;
      
    case 'product.deleted':
      await this.deleteProductFromDatabase(event.data.object.id);
      break;
  }

  return { received: true };
}
```

---

## 5. Variáveis de Ambiente Necessárias

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_... ou sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... ou pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 6. Checklist de Implementação

- [ ] Atualizar `GET /api/plans/admin/list` para buscar do Stripe
- [ ] Atualizar `GET /api/subscriptions/tenant/:tenantId` para buscar do Stripe
- [ ] Adicionar metadados ao criar produtos no Stripe
- [ ] Salvar `stripe_customer_id` no tenant ao criar customer
- [ ] Configurar webhook no Stripe Dashboard
- [ ] Implementar handlers de webhook para sincronização
- [ ] Testar com produtos existentes no Stripe
- [ ] Testar com subscriptions existentes no Stripe

---

## 7. Teste

Após implementar:

1. **Criar produtos diretamente no Stripe Dashboard**
2. **Acessar o painel** → Products
3. **Verificar se os produtos aparecem**
4. **Criar subscription no Stripe Dashboard**
5. **Acessar o painel** → Subscriptions
6. **Verificar se a subscription aparece**

---

## Referências

- [Stripe API - Products](https://stripe.com/docs/api/products)
- [Stripe API - Prices](https://stripe.com/docs/api/prices)
- [Stripe API - Subscriptions](https://stripe.com/docs/api/subscriptions)
- [Stripe API - Customers](https://stripe.com/docs/api/customers)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
