# Implementação da Correção: Sincronização com Stripe (Multi-Tenant)

## ✅ Problema Resolvido

O backend estava retornando apenas dados salvos no banco de dados local, ignorando produtos, planos e subscriptions criados diretamente no Stripe Dashboard. Isso causava uma desconexão entre o que existia no Stripe e o que aparecia no painel administrativo.

**Importante:** Este sistema é **multi-tenant**, onde cada tenant tem suas próprias chaves do Stripe armazenadas de forma criptografada na tabela `TenantBillingConfig`.

## 🔧 Mudanças Implementadas

### 1. Novo Repositório: `StripeApiPlanRepository`

**Arquivo:** `src/modules/reserve-subscriptions/infrastructure/repositories/stripe-api-plan.repository.ts`

Este repositório substitui o `PrismaStripePlanRepository` e busca dados **diretamente da API do Stripe** ao invés do banco local.

**Principais funcionalidades:**
- `findAll(includeInactive, tenantId)` - Busca todos os produtos do Stripe via API usando as chaves do tenant
- `findById()` - Busca produto específico por ID do Stripe
- `findBySlug()` - Busca produto por slug armazenado nos metadados
- `mapProductToEntity()` - Converte produtos do Stripe para entidades do domínio
- `getTenantStripeKey()` - Busca e descriptografa a chave do Stripe do tenant
- Extrai metadados customizados (credits, guest_limit, trial_days) dos produtos

**Chaves do Stripe por Tenant:**
As chaves do Stripe são armazenadas criptografadas na tabela `TenantBillingConfig`:
- `stripe_secret_key_hash` - Chave secreta criptografada com AES-256-GCM
- `stripe_publishable_key` - Chave pública (não criptografada)
- `stripe_webhook_secret_hash` - Secret do webhook criptografado

**Metadados suportados:**
```typescript
{
  slug: string,
  released_credits: string,
  credits_released_trial_period: string,
  guest_limit: string,
  trial_days: string,
}
```

### 2. Novo Use Case: `GetTenantSubscriptionFromStripeUseCase`

**Arquivo:** `src/modules/reserve-subscriptions/application/use-cases/get-tenant-subscription-from-stripe.use-case.ts`

Este use case busca subscriptions **diretamente da API do Stripe** ao invés do banco local.

**Fluxo de execução:**
1. Busca o tenant no banco para obter `stripe_customer_id`
2. Busca a configuração de billing do tenant (`TenantBillingConfig`)
3. Descriptografa a `stripe_secret_key_hash` usando `ENCRYPT_PRIVATE_KEY`
4. Se não houver customer_id, cria um novo customer no Stripe usando a chave do tenant
5. Busca todas as subscriptions do customer no Stripe usando a chave do tenant
6. Retorna a subscription ativa ou a mais recente
7. Mapeia os dados do Stripe para o DTO de resposta

**Benefícios:**
- Subscriptions criadas no Stripe Dashboard aparecem automaticamente
- Dados sempre sincronizados com o Stripe
- Não depende de webhooks para atualização
- Cada tenant usa suas próprias chaves do Stripe

### 3. Métodos Adicionados ao `StripeProvider`

**Arquivo:** `src/modules/reserve-subscriptions/infrastructure/providers/stripe.provider.ts`

Novos métodos para suportar as operações:

```typescript
// Lista todos os produtos (incluindo inativos)
listAllProducts(includeInactive?: boolean): Promise<Stripe.Product[]>

// Lista todos os prices
listAllPrices(active?: boolean): Promise<Stripe.Price[]>

// Lista subscriptions de um customer
listCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]>
```

### 4. Atualização do Módulo

**Arquivo:** `src/modules/reserve-subscriptions/reserve-subscriptions.module.ts`

**Mudança crítica:**
```typescript
{
  provide: STRIPE_PLAN_REPOSITORY,
  useClass: StripeApiPlanRepository, // ANTES: PrismaStripePlanRepository
}
```

Agora o repositório de plans usa a API do Stripe como fonte da verdade.

### 5. Atualização do Controller

**Arquivo:** `src/modules/reserve-subscriptions/infrastructure/controllers/subscriptions.controller.ts`

O endpoint `GET /api/subscriptions/tenant/:tenantId` agora usa o novo use case:

```typescript
async getTenantSubscription(@Param('tenantId') tenantId: string) {
  // ANTES: getTenantSubscriptionUseCase.execute(tenantId)
  // AGORA: getTenantSubscriptionFromStripeUseCase.execute(tenantId)
  const subscription = await this.getTenantSubscriptionFromStripeUseCase.execute(tenantId);
  // ...
}
```

## 📊 Endpoints Corrigidos

### 1. `GET /api/plans/admin/list`
- **Antes:** Retornava apenas plans do banco local
- **Agora:** Busca todos os produtos do Stripe via API
- **Resultado:** Products criados no Stripe Dashboard aparecem automaticamente

### 2. `GET /api/subscriptions/tenant/:tenantId`
- **Antes:** Retornava apenas subscriptions do banco local
- **Agora:** Busca subscriptions do Stripe via API
- **Resultado:** Subscriptions criadas no Stripe Dashboard aparecem automaticamente

## 🎯 Como Testar

### Teste 1: Products/Plans

1. Acesse o Stripe Dashboard
2. Crie um novo produto com price recorrente
3. Adicione metadados customizados:
   - `slug`: identificador único
   - `released_credits`: quantidade de créditos
   - `guest_limit`: limite de convidados
   - `trial_days`: dias de trial
4. Acesse `GET /api/plans/admin/list`
5. **Resultado esperado:** O produto criado deve aparecer na lista

### Teste 2: Subscriptions

1. Acesse o Stripe Dashboard
2. Crie uma subscription para um customer existente
3. Acesse `GET /api/subscriptions/tenant/:tenantId`
4. **Resultado esperado:** A subscription criada deve aparecer

### Teste 3: Customer Auto-criação

1. Acesse `GET /api/subscriptions/tenant/:tenantId` para um tenant sem `stripe_customer_id`
2. **Resultado esperado:** 
   - Um customer é criado automaticamente no Stripe
   - O `stripe_customer_id` é salvo no banco
   - Retorna `null` se não houver subscriptions

## 🔄 Sincronização com Banco Local

O banco local ainda é usado para:
- Cache de dados (opcional)
- Operações de escrita (criar plans via painel)
- Armazenar `stripe_customer_id` do tenant

**Importante:** O Stripe é a **fonte da verdade**. O banco local é apenas um cache.

## 📝 Próximos Passos (Opcional)

Para manter o banco local sincronizado automaticamente, implemente webhooks:

```typescript
// Eventos a processar:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- product.created
- product.updated
- product.deleted
```

Isso permitirá:
- Queries mais rápidas (sem chamar API do Stripe)
- Histórico local de mudanças
- Fallback se a API do Stripe estiver indisponível

## ⚠️ Considerações

1. **Performance:** Cada request faz chamadas à API do Stripe. Para alta carga, considere implementar cache.

2. **Rate Limits:** A API do Stripe tem rate limits. Para muitos requests simultâneos, implemente cache local.

3. **Metadados:** Ao criar produtos via painel, sempre adicione os metadados necessários no Stripe.

4. **Customer ID:** O `stripe_customer_id` é salvo no tenant para evitar criar customers duplicados.

## 🎉 Resultado Final

✅ Products criados no Stripe Dashboard aparecem no painel
✅ Subscriptions criadas no Stripe Dashboard aparecem no painel
✅ Sistema sempre sincronizado com o Stripe
✅ Não depende de webhooks para leitura
✅ Banco local usado apenas como cache opcional

---

**Data da Implementação:** 27/04/2026
**Desenvolvedor:** Kiro AI Assistant
**Status:** ✅ Implementado e Testado
