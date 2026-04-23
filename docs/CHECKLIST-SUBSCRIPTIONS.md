# Checklist: Implementação Stripe Subscriptions

Use este checklist para garantir que tudo está configurado corretamente.

## ✅ Pré-requisitos

- [ ] Node.js instalado (v18+)
- [ ] pnpm instalado
- [ ] PostgreSQL rodando
- [ ] Conta no Stripe criada
- [ ] Stripe CLI instalado (opcional, para testes)

## ✅ Instalação

- [ ] Dependência `stripe` instalada (`pnpm add stripe`)
- [ ] Arquivo `.env` criado e configurado
- [ ] Variáveis do Stripe adicionadas no `.env`:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `FRONTEND_URL`

## ✅ Database

- [ ] Migration executada (`pnpm exec prisma migrate dev`)
- [ ] Prisma Client gerado (`pnpm exec prisma generate`)
- [ ] Tabelas criadas no banco:
  - [ ] `stripe_subscriptions`
  - [ ] `stripe_webhook_events`
- [ ] Relação com `Tenant` funcionando

## ✅ Código

- [ ] Módulo `ZarpSubscriptionsModule` criado
- [ ] Módulo registrado no `AppModule`
- [ ] Raw body configurado no `main.ts`
- [ ] Swagger atualizado com tags de Subscriptions
- [ ] Todos os arquivos TypeScript compilando sem erros

## ✅ Stripe Dashboard

- [ ] Produtos criados no Stripe
- [ ] Preços (prices) criados e IDs copiados
- [ ] Webhook endpoint configurado:
  - [ ] URL: `https://api.zarp.com/api/webhooks/stripe`
  - [ ] Eventos selecionados:
    - [ ] `customer.subscription.created`
    - [ ] `customer.subscription.updated`
    - [ ] `customer.subscription.deleted`
    - [ ] `invoice.paid`
    - [ ] `invoice.payment_failed`
  - [ ] Signing secret copiado

## ✅ Testes Locais

- [ ] Servidor iniciado sem erros (`pnpm start:dev`)
- [ ] Swagger acessível em `http://localhost:3000/api/docs`
- [ ] Stripe CLI conectado (`stripe listen`)
- [ ] Webhook local funcionando
- [ ] Eventos de teste processados com sucesso:
  - [ ] `customer.subscription.created`
  - [ ] `invoice.paid`
  - [ ] `customer.subscription.deleted`

## ✅ Endpoints Testados

- [ ] `POST /api/subscriptions/checkout` - Retorna checkout URL
- [ ] `GET /api/subscriptions/tenant/:tenantId` - Retorna subscription
- [ ] `POST /api/subscriptions/:id/cancel` - Cancela subscription
- [ ] `POST /api/webhooks/stripe` - Processa webhook

## ✅ Fluxo Completo

- [ ] Criar checkout session via API
- [ ] Redirecionar para Stripe Checkout
- [ ] Completar pagamento no Stripe
- [ ] Webhook recebido e processado
- [ ] Subscription criada no banco
- [ ] Subscription visível via API

## ✅ Segurança

- [ ] Validação de assinatura do webhook funcionando
- [ ] Autenticação JWT nos endpoints protegidos
- [ ] Variáveis sensíveis no `.env` (não commitadas)
- [ ] `.env.example` atualizado (sem valores reais)

## ✅ Documentação

- [ ] README do módulo criado
- [ ] Especificação técnica documentada
- [ ] Guia de setup criado
- [ ] Quick start disponível
- [ ] Comandos úteis documentados

## ✅ Produção (quando aplicável)

- [ ] Variáveis de ambiente configuradas no servidor
- [ ] Webhook configurado com URL de produção
- [ ] HTTPS habilitado
- [ ] Logs configurados
- [ ] Monitoramento ativo
- [ ] Backup do banco configurado

## ✅ Integração Frontend

- [ ] Frontend pode chamar `POST /subscriptions/checkout`
- [ ] Frontend redireciona para `checkoutUrl`
- [ ] Frontend trata success/cancel URLs
- [ ] Frontend pode buscar subscription ativa
- [ ] Frontend pode cancelar subscription

## ✅ Regras de Negócio

- [ ] Um tenant = uma subscription (constraint funcionando)
- [ ] Idempotência de webhooks funcionando
- [ ] Cancelamento imediato funcionando
- [ ] Cancelamento no fim do período funcionando
- [ ] Trial period funcionando (se configurado)

## ✅ Monitoramento

- [ ] Logs do backend funcionando
- [ ] Logs do Stripe CLI funcionando (dev)
- [ ] Eventos do webhook sendo registrados no banco
- [ ] Erros sendo capturados e logados

## ✅ Testes Automatizados (opcional)

- [ ] Testes unitários dos use cases
- [ ] Testes de integração dos repositórios
- [ ] Testes E2E dos endpoints
- [ ] Coverage acima de 80%

## ✅ Performance

- [ ] Queries do Prisma otimizadas
- [ ] Índices criados nas tabelas
- [ ] Webhook respondendo em < 5 segundos
- [ ] Sem memory leaks

## ✅ Erros Comuns Resolvidos

- [ ] "STRIPE_SECRET_KEY environment variable is required" → `.env` configurado
- [ ] "Invalid webhook signature" → `STRIPE_WEBHOOK_SECRET` correto
- [ ] "Tenant already has an active subscription" → Comportamento esperado
- [ ] "Raw body not available" → `main.ts` configurado
- [ ] Webhook não recebido → URL pública e HTTPS

## 🎯 Próximos Passos

Após completar este checklist:

1. [ ] Integrar com frontend
2. [ ] Adicionar controle de acesso baseado em subscription
3. [ ] Implementar notificações por email
4. [ ] Criar dashboard de métricas
5. [ ] Adicionar upgrade/downgrade de planos
6. [ ] Implementar cupons de desconto
7. [ ] Adicionar histórico de faturas

## 📊 Status Geral

- **Total de itens**: 70+
- **Completados**: ___
- **Pendentes**: ___
- **Bloqueadores**: ___

## 📝 Notas

Use este espaço para anotar problemas encontrados ou decisões tomadas:

```
[Data] - [Descrição]
```

---

**Última atualização**: 22/04/2026
