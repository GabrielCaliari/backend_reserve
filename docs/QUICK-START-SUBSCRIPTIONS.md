# Quick Start: Stripe Subscriptions

Guia rápido para começar a usar o módulo de subscriptions do Stripe.

## 1. Instalar Dependência

```bash
pnpm add stripe
```

## 2. Configurar .env

Copie o `.env.example` e adicione suas chaves do Stripe:

```env
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3001
```

## 3. Executar Migration

```bash
pnpm exec prisma migrate dev --name add_stripe_subscriptions
pnpm exec prisma generate
```

## 4. Iniciar Servidor

```bash
pnpm start:dev
```

## 5. Testar com Stripe CLI (Opcional)

### Instalar Stripe CLI

**Windows:**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

### Autenticar e Encaminhar Webhooks

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copie o webhook secret exibido e adicione no `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Trigger Eventos de Teste

```bash
stripe trigger customer.subscription.created
stripe trigger invoice.paid
```

## 6. Criar Preços no Stripe Dashboard

1. Acesse https://dashboard.stripe.com/test/products
2. Clique em "Add product"
3. Preencha:
   - Name: "Plano Básico"
   - Price: R$ 49,90
   - Billing: Recurring - Monthly
   - Trial: 7 days (opcional)
4. Salve e copie o **Price ID** (ex: `price_1ABC...`)

## 7. Testar Endpoints

### Criar Checkout Session

```bash
curl -X POST http://localhost:3000/api/subscriptions/checkout \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "cuid_do_tenant",
    "priceId": "price_1ABC...",
    "successUrl": "http://localhost:3001/success",
    "cancelUrl": "http://localhost:3001/cancel"
  }'
```

### Buscar Subscription

```bash
curl -X GET http://localhost:3000/api/subscriptions/tenant/cuid_do_tenant \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

## 8. Acessar Swagger

Abra http://localhost:3000/api/docs para ver a documentação interativa.

## 9. Configurar Webhook em Produção

Quando for para produção:

1. Acesse https://dashboard.stripe.com/webhooks
2. Adicione endpoint: `https://api.zarp.com/api/webhooks/stripe`
3. Selecione eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copie o signing secret e atualize no `.env` de produção

## Troubleshooting

### Erro: "STRIPE_SECRET_KEY environment variable is required"

Verifique se o `.env` está configurado e reinicie o servidor.

### Erro: "Invalid webhook signature"

Certifique-se de que:
- `STRIPE_WEBHOOK_SECRET` está correto
- O raw body está configurado no `main.ts` (já está configurado)
- Você está usando o Stripe CLI para testes locais

### Erro: "Tenant already has an active subscription"

Isso é esperado. Cancele a subscription existente antes de criar uma nova.

## Próximos Passos

- Integre o frontend para chamar os endpoints
- Configure o webhook em produção
- Adicione lógica de controle de acesso baseado em subscription
- Implemente notificações por email

## Documentação Completa

- **Especificação**: `docs/stripe-subscriptions-spec.md`
- **Setup Detalhado**: `docs/stripe-subscriptions-setup.md`
- **Resumo**: `docs/stripe-subscriptions-summary.md`
- **README do Módulo**: `src/modules/zarp-subscriptions/README.md`

## Suporte

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
