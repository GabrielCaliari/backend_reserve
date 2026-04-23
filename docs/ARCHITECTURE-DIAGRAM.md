# Diagrama de Arquitetura: Stripe Subscriptions

Visualização da arquitetura e fluxos do módulo de subscriptions.

## 1. Arquitetura em Camadas (DDD)

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Next.js)                │
│  - PricingCard                                              │
│  - SubscriptionStatus                                       │
│  - useSubscription hook                                     │
│  - useCreateCheckout hook                                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         │ JWT Auth
┌────────────────────────▼────────────────────────────────────┐
│              INFRASTRUCTURE LAYER (NestJS)                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Controllers (HTTP Endpoints)              │   │
│  │  - SubscriptionsController                          │   │
│  │  - StripeWebhookController                          │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │           Repositories (Prisma)                     │   │
│  │  - PrismaStripeSubscriptionRepository               │   │
│  │  - PrismaStripeWebhookEventRepository               │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │           Providers (External APIs)                 │   │
│  │  - StripeProvider (Stripe SDK)                      │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ Implements
┌────────────────────────▼────────────────────────────────────┐
│              APPLICATION LAYER (Pure TypeScript)            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Use Cases (Business Logic)             │   │
│  │  - CreateCheckoutSessionUseCase                     │   │
│  │  - GetTenantSubscriptionUseCase                     │   │
│  │  - CancelSubscriptionUseCase                        │   │
│  │  - ProcessStripeWebhookUseCase                      │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │              DTOs (Data Transfer)                   │   │
│  │  - CreateCheckoutSessionDTO                         │   │
│  │  - CancelSubscriptionDTO                            │   │
│  │  - SubscriptionResponseDTO                          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ Uses
┌────────────────────────▼────────────────────────────────────┐
│              DOMAIN LAYER (Pure TypeScript)                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Entities (Business Objects)            │   │
│  │  - StripeSubscriptionEntity                         │   │
│  │    • isActive()                                     │   │
│  │    • isInTrial()                                    │   │
│  │    • getDaysRemaining()                             │   │
│  │    • cancelAtPeriodEndAction()                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Interfaces (Contracts/Ports)           │   │
│  │  - IStripeSubscriptionRepository                    │   │
│  │  - IStripeWebhookEventRepository                    │   │
│  │  - IStripeProvider                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Enums (Domain Values)                  │   │
│  │  - ESubscriptionStatus                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. Fluxo de Criação de Subscription

```
┌──────────┐                                                    
│ Frontend │                                                    
└────┬─────┘                                                    
     │                                                          
     │ 1. POST /subscriptions/checkout                         
     │    { tenantId, priceId, successUrl, cancelUrl }         
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ SubscriptionsController             │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 2. Execute use case                                     
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ CreateCheckoutSessionUseCase        │                        
│  • Check existing subscription      │                        
│  • Create checkout session          │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 3. Call Stripe API                                      
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ StripeProvider                      │                        
│  • stripe.checkout.sessions.create()│                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 4. Return checkout URL                                  
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ Frontend                            │                        
│  • Redirect to Stripe Checkout      │                        
└─────────────────────────────────────┘                        
                                                                
     User pays on Stripe                                       
                                                                
┌─────────────────────────────────────┐                        
│ Stripe                              │                        
│  • Process payment                  │                        
│  • Send webhook                     │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 5. POST /webhooks/stripe                                
     │    { event: subscription.created }                      
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ StripeWebhookController             │                        
│  • Verify signature                 │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 6. Process webhook                                      
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ ProcessStripeWebhookUseCase         │                        
│  • Check idempotency                │                        
│  • Create subscription in DB        │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 7. Save to database                                     
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ PrismaStripeSubscriptionRepository  │                        
│  • INSERT INTO stripe_subscriptions │                        
└─────────────────────────────────────┘                        
                                                                
     Stripe redirects user to success_url                      
```

## 3. Fluxo de Webhook

```
┌────────┐                                                      
│ Stripe │                                                      
└───┬────┘                                                      
    │                                                           
    │ 1. Event occurs (payment, cancellation, etc.)            
    │                                                           
    │ 2. POST /webhooks/stripe                                 
    │    Headers: stripe-signature                             
    │    Body: { id, type, data }                              
    │                                                           
    ▼                                                           
┌─────────────────────────────────────┐                        
│ StripeWebhookController             │                        
│  • Get raw body                     │                        
│  • Get signature from header        │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 3. Verify signature                                     
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ StripeProvider                      │                        
│  • stripe.webhooks.constructEvent() │                        
│  • Validate signature               │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 4. Process event                                        
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ ProcessStripeWebhookUseCase         │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 5. Check if already processed                           
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ StripeWebhookEventRepository        │                        
│  • Check stripe_event_id exists     │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ If exists: Return 200 OK (idempotency)                  
     │ If not: Continue processing                             
     │                                                          
     │ 6. Log event                                            
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ StripeWebhookEventRepository        │                        
│  • INSERT INTO stripe_webhook_events│                        
└─────────────────────────────────────┘                        
     │                                                          
     │ 7. Handle event type                                    
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ Event Handlers                      │                        
│  • subscription.created             │                        
│  • subscription.updated             │                        
│  • subscription.deleted             │                        
│  • invoice.paid                     │                        
│  • invoice.payment_failed           │                        
└────┬────────────────────────────────┘                        
     │                                                          
     │ 8. Update subscription                                  
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ StripeSubscriptionRepository        │                        
│  • CREATE or UPDATE subscription    │                        
└─────────────────────────────────────┘                        
     │                                                          
     │ 9. Mark as processed                                    
     │                                                          
     ▼                                                          
┌─────────────────────────────────────┐                        
│ StripeWebhookEventRepository        │                        
│  • UPDATE processed = true          │                        
└─────────────────────────────────────┘                        
     │                                                          
     │ 10. Return 200 OK                                       
     │                                                          
     ▼                                                          
┌────────┐                                                      
│ Stripe │                                                      
└────────┘                                                      
```

## 4. Estrutura do Banco de Dados

```
┌─────────────────────────────────────┐
│ Tenant                              │
│ ─────────────────────────────────── │
│ id (PK)                             │
│ name                                │
│ slug                                │
│ active                              │
│ ...                                 │
└────┬────────────────────────────────┘
     │ 1:1
     │
     ▼
┌─────────────────────────────────────┐
│ StripeSubscription                  │
│ ─────────────────────────────────── │
│ id (PK)                             │
│ tenant_id (FK, UNIQUE)              │
│ stripe_subscription_id (UNIQUE)     │
│ stripe_customer_id                  │
│ stripe_price_id                     │
│ status                              │
│ current_period_start                │
│ current_period_end                  │
│ amount                              │
│ currency                            │
│ interval                            │
│ ...                                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ StripeWebhookEvent                  │
│ ─────────────────────────────────── │
│ id (PK)                             │
│ stripe_event_id (UNIQUE)            │
│ event_type                          │
│ payload (JSON)                      │
│ processed                           │
│ error_message                       │
│ processing_attempts                 │
│ created_at                          │
│ ...                                 │
└─────────────────────────────────────┘
```

## 5. Dependency Injection

```
┌─────────────────────────────────────┐
│ ZarpSubscriptionsModule             │
└────┬────────────────────────────────┘
     │
     ├─► Controllers
     │   ├─► SubscriptionsController
     │   └─► StripeWebhookController
     │
     ├─► Use Cases
     │   ├─► CreateCheckoutSessionUseCase
     │   ├─► GetTenantSubscriptionUseCase
     │   ├─► CancelSubscriptionUseCase
     │   └─► ProcessStripeWebhookUseCase
     │
     ├─► Repositories (via DI tokens)
     │   ├─► STRIPE_SUBSCRIPTION_REPOSITORY
     │   │   └─► PrismaStripeSubscriptionRepository
     │   └─► STRIPE_WEBHOOK_EVENT_REPOSITORY
     │       └─► PrismaStripeWebhookEventRepository
     │
     └─► Providers (via DI tokens)
         └─► STRIPE_PROVIDER
             └─► StripeProvider
```

## 6. Eventos do Stripe Processados

```
┌────────────────────────────────────────────────────────┐
│                    Stripe Events                       │
└────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Subscription  │  │    Invoice    │  │   Customer    │
│    Events     │  │    Events     │  │    Events     │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        ├─► created        ├─► paid           └─► (future)
        ├─► updated        └─► payment_failed
        └─► deleted
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────────┐              ┌───────────────────┐
│ Create/Update     │              │ Update Status     │
│ Subscription      │              │ to active/past_due│
└───────────────────┘              └───────────────────┘
```

## 7. Estados da Subscription

```
┌─────────────┐
│  incomplete │ ◄─── Checkout criado, aguardando pagamento
└──────┬──────┘
       │ Payment succeeds
       ▼
┌─────────────┐
│  trialing   │ ◄─── Trial period ativo
└──────┬──────┘
       │ Trial ends
       ▼
┌─────────────┐
│   active    │ ◄─── Subscription ativa e paga
└──────┬──────┘
       │
       ├─► Payment fails ──► past_due
       │
       ├─► User cancels ──► canceled
       │
       └─► Subscription ends ──► canceled
```

## 8. Segurança do Webhook

```
┌────────────────────────────────────────────────────────┐
│                  Webhook Request                       │
│  POST /webhooks/stripe                                 │
│  Headers:                                              │
│    stripe-signature: t=xxx,v1=yyy                      │
│  Body: { id, type, data }                              │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ 1. Extract signature from header                       │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ 2. Get raw body (configured in main.ts)                │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ 3. Verify signature using STRIPE_WEBHOOK_SECRET        │
│    stripe.webhooks.constructEvent(body, sig, secret)   │
└────────────────────┬───────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│ Valid         │         │ Invalid       │
│ ✓ Process     │         │ ✗ Reject 400  │
└───────────────┘         └───────────────┘
```

## 9. Idempotência

```
┌────────────────────────────────────────────────────────┐
│ Webhook Event Received                                 │
│ stripe_event_id: evt_123                               │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ Check if event already exists in database              │
│ SELECT * FROM stripe_webhook_events                    │
│ WHERE stripe_event_id = 'evt_123'                      │
└────────────────────┬───────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│ Exists        │         │ Not Exists    │
│ ✓ Return 200  │         │ ✓ Process     │
│   (skip)      │         │   event       │
└───────────────┘         └───────┬───────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │ Insert event  │
                          │ Process logic │
                          │ Mark processed│
                          └───────────────┘
```

---

## Legenda

- **PK**: Primary Key
- **FK**: Foreign Key
- **DI**: Dependency Injection
- **DTO**: Data Transfer Object
- **→**: Fluxo de dados
- **▼**: Próximo passo
- **◄**: Origem/Causa

---

**Nota**: Estes diagramas são representações simplificadas. Consulte o código-fonte para detalhes completos da implementação.
