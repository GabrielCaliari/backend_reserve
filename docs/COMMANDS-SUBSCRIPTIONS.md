# Comandos: Stripe Subscriptions

Lista de comandos úteis para trabalhar com o módulo de subscriptions.

## Instalação

```bash
# Instalar dependência do Stripe
pnpm add stripe

# Instalar tipos (opcional, já incluído)
pnpm add -D @types/stripe
```

## Database

```bash
# Gerar migration
pnpm exec prisma migrate dev --name add_stripe_subscriptions

# Aplicar migration em produção
pnpm exec prisma migrate deploy

# Gerar Prisma Client
pnpm exec prisma generate

# Abrir Prisma Studio (visualizar dados)
pnpm exec prisma studio

# Reset database (CUIDADO: apaga todos os dados)
pnpm exec prisma migrate reset
```

## Desenvolvimento

```bash
# Iniciar servidor em modo desenvolvimento
pnpm start:dev

# Iniciar servidor em modo debug
pnpm start:debug

# Build para produção
pnpm build

# Iniciar servidor de produção
pnpm start:prod
```

## Testes

```bash
# Executar todos os testes
pnpm test

# Executar testes em modo watch
pnpm test:watch

# Executar testes E2E
pnpm test:e2e

# Gerar coverage
pnpm test:cov
```

## Stripe CLI

```bash
# Instalar Stripe CLI (Windows - Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Instalar Stripe CLI (macOS - Homebrew)
brew install stripe/stripe-cli/stripe

# Autenticar
stripe login

# Encaminhar webhooks para localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Encaminhar apenas eventos específicos
stripe listen \
  --events customer.subscription.created,customer.subscription.updated,invoice.paid \
  --forward-to localhost:3000/api/webhooks/stripe

# Trigger eventos de teste
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.paid
stripe trigger invoice.payment_failed

# Ver logs de eventos
stripe logs tail

# Listar webhooks configurados
stripe webhooks list

# Testar webhook específico
stripe webhooks test --endpoint-id we_xxx
```

## Curl - Testar Endpoints

### Criar Checkout Session

```bash
curl -X POST http://localhost:3000/api/subscriptions/checkout \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "cuid_do_tenant",
    "priceId": "price_1ABC...",
    "successUrl": "http://localhost:3001/success",
    "cancelUrl": "http://localhost:3001/cancel",
    "trialPeriodDays": 7
  }'
```

### Buscar Subscription por Tenant

```bash
curl -X GET http://localhost:3000/api/subscriptions/tenant/cuid_do_tenant \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### Cancelar Subscription (no fim do período)

```bash
curl -X POST http://localhost:3000/api/subscriptions/cuid_da_subscription/cancel \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cancelImmediately": false
  }'
```

### Cancelar Subscription (imediatamente)

```bash
curl -X POST http://localhost:3000/api/subscriptions/cuid_da_subscription/cancel \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cancelImmediately": true
  }'
```

## Database Queries (Prisma Studio ou SQL)

### Ver todas as subscriptions

```sql
SELECT * FROM stripe_subscriptions;
```

### Ver subscriptions ativas

```sql
SELECT * FROM stripe_subscriptions 
WHERE status IN ('active', 'trialing');
```

### Ver subscription de um tenant específico

```sql
SELECT * FROM stripe_subscriptions 
WHERE tenant_id = 'cuid_do_tenant';
```

### Ver eventos do webhook

```sql
SELECT * FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;
```

### Ver eventos não processados

```sql
SELECT * FROM stripe_webhook_events 
WHERE processed = false;
```

### Ver eventos com erro

```sql
SELECT * FROM stripe_webhook_events 
WHERE error_message IS NOT NULL;
```

## Logs e Debug

```bash
# Ver logs do servidor
pnpm start:dev

# Ver logs do Stripe CLI
stripe logs tail

# Ver logs de um evento específico
stripe events retrieve evt_xxx

# Ver detalhes de uma subscription
stripe subscriptions retrieve sub_xxx

# Ver detalhes de um customer
stripe customers retrieve cus_xxx
```

## Limpeza

```bash
# Remover node_modules
rm -rf node_modules

# Reinstalar dependências
pnpm install

# Limpar cache do Prisma
pnpm exec prisma generate

# Limpar build
rm -rf dist
```

## Produção

```bash
# Build
pnpm build

# Executar migration em produção
pnpm exec prisma migrate deploy

# Iniciar servidor
pnpm start:prod

# PM2 (gerenciador de processos)
pm2 start dist/main.js --name zarp-api
pm2 logs zarp-api
pm2 restart zarp-api
pm2 stop zarp-api
```

## Variáveis de Ambiente

```bash
# Copiar exemplo
cp .env.example .env

# Editar variáveis
nano .env

# Verificar variáveis carregadas (Node.js)
node -e "require('dotenv').config(); console.log(process.env.STRIPE_SECRET_KEY)"
```

## Swagger

```bash
# Acessar documentação
open http://localhost:3000/api/docs

# Ou no navegador
http://localhost:3000/api/docs
```

## Git

```bash
# Adicionar arquivos
git add .

# Commit
git commit -m "feat: add stripe subscriptions module"

# Push
git push origin main
```

## Úteis

```bash
# Ver versão do Node
node -v

# Ver versão do pnpm
pnpm -v

# Ver versão do Stripe CLI
stripe -v

# Ver porta em uso (Windows)
netstat -ano | findstr :3000

# Ver porta em uso (macOS/Linux)
lsof -i :3000

# Matar processo na porta 3000 (Windows)
taskkill /PID <PID> /F

# Matar processo na porta 3000 (macOS/Linux)
kill -9 <PID>
```

## Troubleshooting

```bash
# Verificar se Stripe está configurado
echo $STRIPE_SECRET_KEY

# Testar conexão com Stripe
stripe customers list --limit 1

# Verificar se webhook está funcionando
stripe listen --print-json

# Ver logs detalhados do NestJS
DEBUG=* pnpm start:dev

# Verificar conexão com banco
pnpm exec prisma db pull
```

## Referências Rápidas

- Stripe Dashboard: https://dashboard.stripe.com/
- Stripe Docs: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe Testing: https://stripe.com/docs/testing
- Prisma Docs: https://www.prisma.io/docs
- NestJS Docs: https://docs.nestjs.com/
