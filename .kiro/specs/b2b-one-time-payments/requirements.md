# Requirements: B2B One-Time Payments

## Overview

Sistema de pagamentos únicos (one-time) para vendas B2B de produtos e serviços. O dono da empresa cria links de pagamento personalizados e envia para clientes. O sistema rastreia todo o funil de checkout (iniciado, completado, abandonado).

## Business Context

- **Modelo de negócio**: Pagamento único (não recorrente)
- **Fluxo de venda**: Dono cria link → Envia para cliente → Cliente paga → Sistema registra
- **Tracking**: Monitorar quem chegou no checkout, quem pagou, quem abandonou
- **Integração**: Stripe Checkout + Webhooks

## Functional Requirements

### 1. Gerenciamento de Produtos B2B

**FR-1.1**: Sistema deve permitir cadastro de produtos B2B com preço único
- Nome do produto
- Descrição
- Preço em centavos (BRL)
- Stripe Product ID
- Status ativo/inativo

**FR-1.2**: Sistema deve listar todos os produtos B2B ativos

**FR-1.3**: Sistema deve permitir buscar produto por ID

### 2. Criação de Links de Pagamento

**FR-2.1**: Admin deve poder criar link de pagamento para um produto
- Selecionar produto
- Informar email do cliente
- Opcionalmente: nome e telefone do cliente
- Sistema gera URL do Stripe Checkout

**FR-2.2**: Link de pagamento deve incluir metadata
- Product ID
- Customer email
- Timestamp de criação

**FR-2.3**: Sistema deve registrar quando checkout é iniciado
- Salvar `checkout_started_at`
- Status inicial: `pending`

### 3. Processamento de Pagamentos

**FR-3.1**: Sistema deve processar webhook `checkout.session.completed`
- Atualizar status para `completed`
- Registrar `checkout_completed_at`
- Criar ou atualizar registro do User com email do cliente
- Vincular purchase ao user_id

**FR-3.2**: Sistema deve processar webhook `checkout.session.expired`
- Atualizar status para `abandoned`
- Registrar `checkout_abandoned_at`

**FR-3.3**: Sistema deve processar webhook `payment_intent.succeeded`
- Confirmar pagamento bem-sucedido
- Atualizar amount e currency

**FR-3.4**: Sistema deve processar webhook `charge.refunded`
- Atualizar status para `refunded`
- Registrar data do reembolso

### 4. Tracking de Checkout

**FR-4.1**: Sistema deve rastrear funil completo de checkout
- Checkouts iniciados (pending)
- Checkouts completados (completed)
- Checkouts abandonados (abandoned)
- Checkouts reembolsados (refunded)

**FR-4.2**: Dashboard deve exibir métricas
- Total de checkouts iniciados
- Taxa de conversão (completados / iniciados)
- Taxa de abandono
- Valor total de vendas
- Valor médio por venda

**FR-4.3**: Sistema deve listar todas as purchases com filtros
- Filtrar por status
- Filtrar por período
- Filtrar por produto
- Ordenar por data

### 5. Gestão de Compradores

**FR-5.1**: Sistema deve criar User automaticamente após pagamento
- Se email não existir, criar novo User
- Se email existir, vincular purchase ao User existente
- Salvar dados do comprador (nome, telefone)

**FR-5.2**: Sistema deve listar compradores
- Nome, email, telefone
- Produtos comprados
- Data da compra
- Valor pago

### 6. Webhook Idempotency

**FR-6.1**: Sistema deve garantir idempotência de webhooks
- Registrar stripe_event_id
- Ignorar eventos duplicados
- Retornar 200 OK mesmo para duplicatas

## Non-Functional Requirements

### Security

**NFR-1**: Webhook deve validar assinatura do Stripe
- Verificar header `stripe-signature`
- Usar `STRIPE_WEBHOOK_SECRET_B2B`
- Rejeitar requisições inválidas

**NFR-2**: Endpoints de admin devem exigir autenticação
- Usar `AdminJwtGuard`
- Apenas admins podem criar links e visualizar purchases

### Performance

**NFR-3**: Webhook deve responder em menos de 3 segundos
- Processar de forma assíncrona se necessário
- Retornar 200 OK rapidamente

**NFR-4**: Listagem de purchases deve suportar paginação
- Limite padrão: 50 itens
- Suportar offset/limit

### Data Integrity

**NFR-5**: Stripe IDs devem ser únicos
- `stripe_checkout_id` único
- `stripe_payment_intent` único
- Prevenir duplicatas

**NFR-6**: Transações devem ser atômicas
- Criar User + Purchase em transação única
- Rollback em caso de erro

## API Endpoints

### Admin Endpoints (Autenticados)

```
POST   /api/b2b/payments/create-link       - Criar link de pagamento
GET    /api/b2b/payments/purchases         - Listar todas as purchases
GET    /api/b2b/payments/purchases/:id     - Obter detalhes de uma purchase
GET    /api/b2b/payments/products          - Listar produtos B2B
GET    /api/b2b/payments/metrics           - Obter métricas do funil
```

### Webhook Endpoint (Público)

```
POST   /api/webhooks/b2b/stripe            - Receber eventos do Stripe
```

## Data Models

### B2BProduct
- id (UUID)
- stripe_product_id (String, unique)
- stripe_price_id (String, unique)
- name (String)
- description (String, optional)
- price (Int, centavos)
- currency (String, default: "brl")
- active (Boolean)
- created_at, updated_at

### B2BPurchase
- id (UUID)
- user_id (UUID, optional, FK to User)
- product_id (UUID, FK to B2BProduct)
- stripe_checkout_id (String, unique, optional)
- stripe_payment_intent (String, unique, optional)
- checkout_started_at (DateTime, optional)
- checkout_completed_at (DateTime, optional)
- checkout_abandoned_at (DateTime, optional)
- status (Enum: pending, completed, abandoned, refunded)
- amount (Int, centavos)
- currency (String)
- customer_email (String)
- customer_name (String, optional)
- customer_phone (String, optional)
- metadata (JSON, optional)
- created_at, updated_at

### User (extensão)
- Adicionar relação: `b2b_purchases B2BPurchase[]`

## Success Criteria

1. Admin consegue criar link de pagamento em menos de 5 segundos
2. Cliente consegue completar pagamento no Stripe
3. Webhook processa evento em menos de 3 segundos
4. User é criado automaticamente após pagamento
5. Dashboard exibe métricas corretas de conversão
6. Sistema identifica checkouts abandonados corretamente
7. Não há duplicação de purchases por eventos duplicados
8. Taxa de erro de webhook < 1%

## Out of Scope (Fase 1)

- Cupons de desconto
- Parcelamento
- Múltiplas moedas (apenas BRL)
- Notificações por email automáticas
- Integração com CRM externo
- Relatórios avançados
- Exportação de dados
