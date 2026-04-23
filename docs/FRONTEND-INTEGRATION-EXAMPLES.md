# Exemplos de Integração Frontend

Exemplos de código para integrar o frontend com o módulo de subscriptions.

## 1. Configuração do Cliente HTTP

### Axios (Recomendado)

```typescript
// src/lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Fetch (Alternativa)

```typescript
// src/lib/api/client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}
```

## 2. Tipos TypeScript

```typescript
// src/types/subscription.ts
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

export interface Subscription {
  id: string;
  tenantId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  stripeProductId?: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  canceledAt?: string;
  cancelAtPeriodEnd: boolean;
  amount: number;
  formattedAmount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  daysRemaining: number;
  isActive: boolean;
  isInTrial: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutSessionRequest {
  tenantId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface CancelSubscriptionRequest {
  cancelImmediately?: boolean;
}

export interface CancelSubscriptionResponse {
  message: string;
  cancelAtPeriodEnd: boolean;
  accessUntil?: string;
}
```

## 3. Serviço de Subscriptions

```typescript
// src/services/subscriptions.service.ts
import apiClient from '@/lib/api/client';
import type {
  Subscription,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
} from '@/types/subscription';

export class SubscriptionsService {
  /**
   * Criar sessão de checkout do Stripe
   */
  static async createCheckoutSession(
    data: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    const response = await apiClient.post<CreateCheckoutSessionResponse>(
      '/subscriptions/checkout',
      data
    );
    return response.data;
  }

  /**
   * Buscar subscription ativa do tenant
   */
  static async getTenantSubscription(
    tenantId: string
  ): Promise<Subscription | null> {
    try {
      const response = await apiClient.get<Subscription>(
        `/subscriptions/tenant/${tenantId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Cancelar subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    data: CancelSubscriptionRequest = {}
  ): Promise<CancelSubscriptionResponse> {
    const response = await apiClient.post<CancelSubscriptionResponse>(
      `/subscriptions/${subscriptionId}/cancel`,
      data
    );
    return response.data;
  }
}
```

## 4. React Hooks

### Hook: useSubscription

```typescript
// src/hooks/useSubscription.ts
import { useState, useEffect } from 'react';
import { SubscriptionsService } from '@/services/subscriptions.service';
import type { Subscription } from '@/types/subscription';

export function useSubscription(tenantId: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        setLoading(true);
        const data = await SubscriptionsService.getTenantSubscription(tenantId);
        setSubscription(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      fetchSubscription();
    }
  }, [tenantId]);

  const refetch = async () => {
    setLoading(true);
    try {
      const data = await SubscriptionsService.getTenantSubscription(tenantId);
      setSubscription(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { subscription, loading, error, refetch };
}
```

### Hook: useCreateCheckout

```typescript
// src/hooks/useCreateCheckout.ts
import { useState } from 'react';
import { SubscriptionsService } from '@/services/subscriptions.service';
import type { CreateCheckoutSessionRequest } from '@/types/subscription';

export function useCreateCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCheckout = async (data: CreateCheckoutSessionRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await SubscriptionsService.createCheckoutSession(data);
      
      // Redirecionar para Stripe Checkout
      window.location.href = response.checkoutUrl;
      
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createCheckout, loading, error };
}
```

## 5. Componentes React

### Componente: PricingCard

```typescript
// src/components/PricingCard.tsx
import { useCreateCheckout } from '@/hooks/useCreateCheckout';

interface PricingCardProps {
  title: string;
  price: number;
  priceId: string;
  interval: 'month' | 'year';
  features: string[];
  tenantId: string;
  trialDays?: number;
}

export function PricingCard({
  title,
  price,
  priceId,
  interval,
  features,
  tenantId,
  trialDays,
}: PricingCardProps) {
  const { createCheckout, loading } = useCreateCheckout();

  const handleSubscribe = async () => {
    await createCheckout({
      tenantId,
      priceId,
      successUrl: `${window.location.origin}/subscription/success`,
      cancelUrl: `${window.location.origin}/subscription/cancel`,
      trialPeriodDays: trialDays,
    });
  };

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-2xl font-bold">{title}</h3>
      <div className="mt-4">
        <span className="text-4xl font-bold">R$ {price}</span>
        <span className="text-gray-600">/{interval === 'month' ? 'mês' : 'ano'}</span>
      </div>
      
      {trialDays && (
        <p className="mt-2 text-sm text-green-600">
          {trialDays} dias de teste grátis
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <span className="mr-2">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Carregando...' : 'Assinar Agora'}
      </button>
    </div>
  );
}
```

### Componente: SubscriptionStatus

```typescript
// src/components/SubscriptionStatus.tsx
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionStatusProps {
  tenantId: string;
}

export function SubscriptionStatus({ tenantId }: SubscriptionStatusProps) {
  const { subscription, loading, error } = useSubscription(tenantId);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar subscription</div>;
  if (!subscription) return <div>Nenhuma subscription ativa</div>;

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-bold">Sua Assinatura</h3>
      
      <div className="mt-4 space-y-2">
        <div>
          <span className="font-semibold">Status:</span>{' '}
          <span className={subscription.isActive ? 'text-green-600' : 'text-red-600'}>
            {subscription.status}
          </span>
        </div>

        <div>
          <span className="font-semibold">Valor:</span>{' '}
          R$ {subscription.formattedAmount}/{subscription.interval}
        </div>

        <div>
          <span className="font-semibold">Próxima cobrança:</span>{' '}
          {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
        </div>

        <div>
          <span className="font-semibold">Dias restantes:</span>{' '}
          {subscription.daysRemaining}
        </div>

        {subscription.isInTrial && (
          <div className="text-green-600">
            ✓ Período de teste ativo
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="text-orange-600">
            ⚠ Assinatura será cancelada em{' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Componente: CancelSubscriptionButton

```typescript
// src/components/CancelSubscriptionButton.tsx
import { useState } from 'react';
import { SubscriptionsService } from '@/services/subscriptions.service';

interface CancelSubscriptionButtonProps {
  subscriptionId: string;
  onSuccess?: () => void;
}

export function CancelSubscriptionButton({
  subscriptionId,
  onSuccess,
}: CancelSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCancel = async (immediately: boolean) => {
    try {
      setLoading(true);
      await SubscriptionsService.cancelSubscription(subscriptionId, {
        cancelImmediately: immediately,
      });
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao cancelar subscription:', error);
      alert('Erro ao cancelar subscription');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="border rounded-lg p-4 bg-red-50">
        <p className="mb-4">Tem certeza que deseja cancelar?</p>
        <div className="space-x-2">
          <button
            onClick={() => handleCancel(false)}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Cancelar no fim do período
          </button>
          <button
            onClick={() => handleCancel(true)}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancelar imediatamente
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Cancelar Assinatura
    </button>
  );
}
```

## 6. Páginas Next.js

### Página: Pricing

```typescript
// src/app/pricing/page.tsx
import { PricingCard } from '@/components/PricingCard';

const plans = [
  {
    title: 'Básico',
    price: 49.90,
    priceId: 'price_1ABC...',
    interval: 'month' as const,
    trialDays: 7,
    features: [
      '100 créditos/mês',
      '1 usuário',
      'Suporte por email',
    ],
  },
  {
    title: 'Profissional',
    price: 99.90,
    priceId: 'price_1DEF...',
    interval: 'month' as const,
    trialDays: 7,
    features: [
      '300 créditos/mês',
      '3 usuários',
      'Suporte prioritário',
    ],
  },
];

export default function PricingPage() {
  const tenantId = 'cuid_do_tenant'; // Obter do contexto/auth

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-12">
        Escolha seu Plano
      </h1>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <PricingCard
            key={plan.priceId}
            {...plan}
            tenantId={tenantId}
          />
        ))}
      </div>
    </div>
  );
}
```

### Página: Success

```typescript
// src/app/subscription/success/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Opcional: Verificar status da subscription
    // Redirecionar após alguns segundos
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="container mx-auto py-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-3xl font-bold mb-4">
          Assinatura Confirmada!
        </h1>
        <p className="text-gray-600 mb-8">
          Sua assinatura foi ativada com sucesso.
          Você será redirecionado em instantes...
        </p>
        {sessionId && (
          <p className="text-sm text-gray-400">
            Session ID: {sessionId}
          </p>
        )}
      </div>
    </div>
  );
}
```

### Página: Cancel

```typescript
// src/app/subscription/cancel/page.tsx
'use client';

import Link from 'next/link';

export default function SubscriptionCancelPage() {
  return (
    <div className="container mx-auto py-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="text-6xl mb-4">✗</div>
        <h1 className="text-3xl font-bold mb-4">
          Assinatura Cancelada
        </h1>
        <p className="text-gray-600 mb-8">
          Você cancelou o processo de assinatura.
          Nenhuma cobrança foi realizada.
        </p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Voltar para Planos
        </Link>
      </div>
    </div>
  );
}
```

## 7. Variáveis de Ambiente (Frontend)

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 8. Exemplo Completo de Fluxo

```typescript
// src/app/dashboard/page.tsx
'use client';

import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { CancelSubscriptionButton } from '@/components/CancelSubscriptionButton';
import { useSubscription } from '@/hooks/useSubscription';

export default function DashboardPage() {
  const tenantId = 'cuid_do_tenant'; // Obter do contexto/auth
  const { subscription, refetch } = useSubscription(tenantId);

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <SubscriptionStatus tenantId={tenantId} />
        
        {subscription && subscription.isActive && (
          <div>
            <h3 className="text-xl font-bold mb-4">Gerenciar Assinatura</h3>
            <CancelSubscriptionButton
              subscriptionId={subscription.id}
              onSuccess={refetch}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

## Referências

- [Next.js Documentation](https://nextjs.org/docs)
- [React Hooks](https://react.dev/reference/react)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [Stripe.js Documentation](https://stripe.com/docs/js)
