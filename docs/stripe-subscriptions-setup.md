# Guia de Instalação: Stripe Subscriptions

Este guia detalha os passos necessários para configurar o módulo de subscriptions do Stripe no backend ZARP.

## 1. Instalar Dependências

```bash
pnpm add stripe
pnpm add -D @types/stripe
```

## 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL (para success/cancel redirects)
FRONTEND_URL=https://app.zarp.com
```

### Como obter as chaves:

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Developers > API keys**
3. Copie:
   - **Secret key** → `STRIPE_SECRET_KEY`
   - **Publishable key** → `STRIPE_PUBLISHABLE_KEY`

### Como obter o Webhook Secret:

1. Vá em **Developers > Webhooks**
2. Clique em **Add endpoint**
3. URL: `https://api.zarp.com/api/webhooks/stripe`
4. Selecione os eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Clique em **Add endpoint**
6. Copie o **Signing secret** → `STRIPE_WEBHOOK_SECRET`

## 3. Executar Migration do Prisma

```bash
# Gerar migration
pnpm exec prisma migrate dev --name add_stripe_subscriptions

# Gerar Prisma Client
pnpm exec prisma generate
```

Isso criará as tabelas:
- `stripe_subscriptions`
- `stripe_webhook_events`

## 4. Configurar Raw Body no main.ts

O webhook do Stripe precisa do raw body da requisição. Adicione no `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // IMPORTANTE: Raw body para webhook do Stripe
  // Deve vir ANTES do app.use(json())
  app.use(
    '/api/webhooks/stripe',
    json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Swagger
  // ... configuração do Swagger

  await app.listen(3000);
}
bootstrap();
```

## 5. Registrar Módulo no AppModule

Adicione o módulo no `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ZarpSubscriptionsModule } from './modules/zarp-subscriptions/zarp-subscriptions.module';

@Module({
  imports: [
    // ... outros módulos
    ZarpSubscriptionsModule,
  ],
})
export class AppModule {}
```

## 6. Criar Preços no Stripe Dashboard

Antes de usar o sistema, você precisa criar os preços (prices) no Stripe:

### Passo a passo:

1. Acesse [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Clique em **Add product**
3. Preencha:
   - **Name**: Nome do plano (ex: "Plano Básico")
   - **Description**: Descrição do plano
4. Em **Pricing**:
   - **Pricing model**: Standard pricing
   - **Price**: Valor (ex: R$ 49,90)
   - **Billing period**: Recurring
   - **Interval**: Monthly (ou Year, Week, etc.)
5. (Opcional) Em **Additional options**:
   - **Free trial**: Marque e defina dias (ex: 7 days)
6. Clique em **Save product**
7. **Copie o Price ID** (ex: `price_1ABC...`) - você usará isso no frontend

### Exemplo de preços:

| Plano | Price ID | Valor | Intervalo | Trial |
|-------|----------|-------|-----------|-------|
| Básico | `price_1ABC...` | R$ 49,90 | Mensal | 7 dias |
| Profissional | `price_1DEF...` | R$ 99,90 | Mensal | 7 dias |
| Premium | `price_1GHI...` | R$ 199,90 | Mensal | 7 dias |

## 7. Testar Localmente com Stripe CLI

### Instalar Stripe CLI:

**Windows (via Scoop):**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**macOS (via Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.0/stripe_1.19.0_linux_x86_64.tar.gz
tar -xvf stripe_1.19.0_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

### Autenticar:

```bash
stripe login
```

### Encaminhar webhooks para localhost:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Isso exibirá um webhook secret temporário. Copie e adicione no `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Trigger eventos de teste:

```bash
# Criar subscription
stripe trigger customer.subscription.created

# Pagamento bem-sucedido
stripe trigger invoice.paid

# Cancelar subscription
stripe trigger customer.subscription.deleted

# Pagamento falhou
stripe trigger invoice.payment_failed
```

## 8. Testar Endpoints

### 8.1. Criar Checkout Session

```bash
curl -X POST http://localhost:3000/api/subscriptions/checkout \
  -H "Authorization: Bearer {seu_jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "cuid_do_tenant",
    "priceId": "price_1ABC...",
    "successUrl": "http://localhost:3001/success",
    "cancelUrl": "http://localhost:3001/cancel"
  }'
```

**Response esperado:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

### 8.2. Buscar Subscription

```bash
curl -X GET http://localhost:3000/api/subscriptions/tenant/{tenantId} \
  -H "Authorization: Bearer {seu_jwt_token}"
```

### 8.3. Cancelar Subscription

```bash
curl -X POST http://localhost:3000/api/subscriptions/{subscriptionId}/cancel \
  -H "Authorization: Bearer {seu_jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "cancelImmediately": false
  }'
```

## 9. Verificar Logs

Monitore os logs do backend para ver os eventos sendo processados:

```bash
pnpm start:dev
```

Você verá logs como:

```
[StripeProvider] Stripe provider initialized
[ProcessStripeWebhookUseCase] Received Stripe event: customer.subscription.created (evt_...)
[ProcessStripeWebhookUseCase] Created subscription sub_...
```

## 10. Configurar Webhook em Produção

Quando for para produção:

1. Acesse [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Adicione um novo endpoint com a URL de produção:
   - URL: `https://api.zarp.com/api/webhooks/stripe`
3. Copie o novo **Signing secret** e atualize no `.env` de produção
4. Certifique-se de que a URL está acessível publicamente (HTTPS obrigatório)

## 11. Checklist de Verificação

- [ ] Dependências instaladas (`stripe`)
- [ ] Variáveis de ambiente configuradas
- [ ] Migration executada
- [ ] Raw body configurado no `main.ts`
- [ ] Módulo registrado no `AppModule`
- [ ] Preços criados no Stripe Dashboard
- [ ] Webhook configurado no Stripe Dashboard
- [ ] Testes locais com Stripe CLI funcionando
- [ ] Endpoints testados com sucesso

## 12. Troubleshooting

### Erro: "STRIPE_SECRET_KEY environment variable is required"

**Solução:** Verifique se o `.env` está configurado corretamente e se o servidor foi reiniciado.

### Erro: "Invalid webhook signature"

**Solução:** 
- Verifique se `STRIPE_WEBHOOK_SECRET` está correto
- Certifique-se de que o raw body está configurado no `main.ts`
- Use o Stripe CLI para testar localmente

### Erro: "Tenant already has an active subscription"

**Solução:** Isso é esperado. Cada tenant pode ter apenas uma subscription ativa. Cancele a existente antes de criar uma nova.

### Webhook não está sendo recebido

**Solução:**
- Verifique se a URL do webhook está correta no Stripe Dashboard
- Certifique-se de que a URL é acessível publicamente (use ngrok para testes)
- Verifique os logs do Stripe Dashboard para ver se há erros

## 13. Próximos Passos

Após a configuração, você pode:

1. Integrar o frontend para chamar os endpoints
2. Adicionar lógica de controle de acesso baseado em subscription
3. Implementar notificações por email
4. Criar dashboard de métricas

## Referências

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
