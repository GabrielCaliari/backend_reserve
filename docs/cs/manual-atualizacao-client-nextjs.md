# Manual de Atualização do Cliente Next.js para Nova Arquitetura DDD da API

Este guia detalha as mudanças necessárias no cliente Next.js (`frontend_dashboard_zarp-admin`) para compatibilidade com a nova versão da API (`backend_api_zarp-admin`), que foi reestruturada seguindo princípios de Domain-Driven Design (DDD) e arquitetura de Bounded Contexts.

## 1. Visão Geral das Mudanças

A API foi completamente reestruturada de uma arquitetura monolítica para uma arquitetura modular baseada em DDD, com Bounded Contexts bem definidos. As principais mudanças incluem:

- Remoção do versionamento explícito na URL (não há mais `/v1` ou `/v2`)
- Organização por contextos delimitados (Bounded Contexts)
- Sistema de autenticação robusto com validação de sessão dupla
- Suporte a multi-tenancy (múltiplas empresas/unidades por admin)
- Separação clara entre autenticação de Admin e User

**Arquitetura de Módulos (Bounded Contexts):**
- `zarp-auth` - Autenticação e autorização (Admin e User)
- `zarp-brands` - Gestão de marcas e monitoramento INPI
- `zarp-cnpjs` - Dados de empresas brasileiras (CNPJ)
- `zarp-journals` - Processamento de diários oficiais
- `zarp-mailer` - Campanhas de email
- `zarp-pi-bot` - Bot de propriedade intelectual
- `zarp-cms` - Sistema de conteúdo

---

## 2. Configuração de Ambiente

Atualize as variáveis de ambiente no arquivo `.env` ou `.env.local` do projeto frontend.

```env
# Antes (com versionamento)
NEXT_PUBLIC_API_URL=http://localhost:3002/v1

# Agora (sem versionamento, contextos na URL)
NEXT_PUBLIC_API_URL=http://localhost:3002
```

**Porta padrão:** A API roda na porta definida em `process.env.PORT` (geralmente 3002)

**Documentação Swagger:** Disponível em `http://localhost:3002/api/docs`

---

## 3. Autenticação de Administradores

### 3.1. Endpoint de Login

O endpoint de autenticação agora está no contexto `/auth/admin`.

- **URL**: `/auth/admin/authenticate`
- **Método**: `POST`
- **Content-Type**: `application/json`

### 3.2. Payload de Login

```typescript
interface LoginPayload {
  email: string;
  password: string;
}
```

**Exemplo:**
```json
{
  "email": "admin@zarp.com.br",
  "password": "senha123"
}
```

### 3.3. Resposta de Autenticação (CRÍTICO)

A resposta agora retorna **dois valores essenciais** que devem ser armazenados:

```typescript
interface AuthResponse {
  session_id: number;        // ID numérico da sessão
  session_token: string;     // JWT Token
  details: {
    name: string;
    email: string;
    role: 'super_admin' | 'company_admin' | 'tenant_admin';
  };
}
```

**Exemplo de resposta:**
```json
{
  "session_id": 123,
  "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "details": {
    "name": "João Silva",
    "email": "joao@zarp.com.br",
    "role": "company_admin"
  }
}
```

### 3.4. Implementação no Frontend

**Exemplo com função de login:**

```typescript
// services/auth.service.ts
interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  session_id: number;
  session_token: string;
  details: {
    name: string;
    email: string;
    role: string;
  };
}

export async function loginAdmin(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error('Falha na autenticação');
  }

  const data = await response.json();
  
  // IMPORTANTE: Armazenar ambos os valores
  localStorage.setItem('auth_token', data.session_token);
  localStorage.setItem('session_id', data.session_id.toString());
  
  return data;
}
```

---

## 4. Requisições Autenticadas (MUDANÇA CRÍTICA)

### 4.1. Headers Obrigatórios

**TODAS as requisições autenticadas agora exigem DOIS headers:**

1. `Authorization`: `Bearer <session_token>`
2. `session-id`: `<session_id>` (número)

**Se o header `session-id` estiver ausente, a API retornará `401 Unauthorized`.**

### 4.2. Implementação com Axios

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Interceptor para adicionar headers de autenticação
api.interceptors.request.use((config) => {
  // Recuperar do storage (localStorage, cookies, ou NextAuth session)
  const token = localStorage.getItem('auth_token');
  const sessionId = localStorage.getItem('session_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (sessionId) {
    config.headers['session-id'] = sessionId;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpar sessão e redirecionar para login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_id');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4.3. Implementação com Fetch

```typescript
// lib/fetcher.ts
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const sessionId = localStorage.getItem('session_id');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (sessionId) {
    headers['session-id'] = sessionId;
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Limpar sessão e redirecionar
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_id');
    window.location.href = '/login';
    throw new Error('Não autorizado');
  }

  return response;
}
```

### 4.4. Implementação com NextAuth + SWR

```typescript
// hooks/useAuthenticatedSWR.ts
import useSWR from 'swr';
import { useSession } from 'next-auth/react';

const fetcher = async (url: string, token: string, sessionId: number) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'session-id': sessionId.toString(),
    },
  });

  if (!res.ok) {
    throw new Error('Erro ao buscar dados');
  }

  return res.json();
};

export function useAuthenticatedSWR(url: string) {
  const { data: session } = useSession();

  return useSWR(
    session ? [url, session.accessToken, session.sessionId] : null,
    ([url, token, sessionId]) => fetcher(url, token, sessionId)
  );
}
```

---

## 5. Perfil do Administrador (`/me`)

### 5.1. Endpoint

- **URL**: `/auth/admin/me`
- **Método**: `GET`
- **Headers**: Requer `Authorization` e `session-id`

### 5.2. Resposta

A resposta agora inclui informações de multi-tenancy:

```typescript
interface AdminProfile {
  name: string;
  email: string;
  role: 'super_admin' | 'company_admin' | 'tenant_admin';
  active: boolean;
  tenants: Array<{
    id: number;
    name: string;
    slug: string;
    domain: string;
  }>;
}
```

**Exemplo de resposta:**
```json
{
  "name": "João Silva",
  "email": "joao@zarp.com.br",
  "role": "company_admin",
  "active": true,
  "tenants": [
    {
      "id": 1,
      "name": "Empresa X",
      "slug": "empresa-x",
      "domain": "empresa-x.com"
    },
    {
      "id": 2,
      "name": "Empresa Y",
      "slug": "empresa-y",
      "domain": "empresa-y.com"
    }
  ]
}
```

### 5.3. Implementação

```typescript
// services/admin.service.ts
import api from '@/lib/api';

export interface AdminProfile {
  name: string;
  email: string;
  role: string;
  active: boolean;
  tenants: Array<{
    id: number;
    name: string;
    slug: string;
    domain: string;
  }>;
}

export async function getAdminProfile(): Promise<AdminProfile> {
  const response = await api.get('/auth/admin/me');
  return response.data;
}
```

**Exemplo de uso em componente:**

```typescript
// components/UserProfile.tsx
import { useEffect, useState } from 'react';
import { getAdminProfile, AdminProfile } from '@/services/admin.service';

export function UserProfile() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    getAdminProfile()
      .then(setProfile)
      .catch(console.error);
  }, []);

  if (!profile) return <div>Carregando...</div>;

  return (
    <div>
      <h2>{profile.name}</h2>
      <p>{profile.email}</p>
      <p>Role: {profile.role}</p>
      
      <h3>Empresas:</h3>
      <ul>
        {profile.tenants.map(tenant => (
          <li key={tenant.id}>{tenant.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 6. Gestão de Tenants (Multi-tenancy)

### 6.1. Listar Tenants do Admin

- **URL**: `/auth/tenants/my-tenants`
- **Método**: `GET`
- **Headers**: Requer `Authorization` e `session-id`

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "Empresa X",
    "slug": "empresa-x",
    "domain": "empresa-x.com",
    "active": true
  }
]
```

### 6.2. Implementação de Seletor de Tenant

```typescript
// components/TenantSelector.tsx
import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Tenant {
  id: number;
  name: string;
  slug: string;
}

export function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);

  useEffect(() => {
    api.get('/auth/tenants/my-tenants')
      .then(res => {
        setTenants(res.data);
        if (res.data.length > 0) {
          setSelectedTenant(res.data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <select 
      value={selectedTenant || ''} 
      onChange={(e) => setSelectedTenant(Number(e.target.value))}
    >
      {tenants.map(tenant => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name}
        </option>
      ))}
    </select>
  );
}
```

---

## 7. Roles e Permissões

### 7.1. Tipos de Roles

```typescript
enum AdminRole {
  super_admin = 'super_admin',      // Acesso total ao sistema
  company_admin = 'company_admin',  // Admin de empresa
  tenant_admin = 'tenant_admin',    // Admin de tenant específico
}
```

### 7.2. Implementação de Verificação de Permissões

```typescript
// hooks/usePermissions.ts
import { useSession } from 'next-auth/react';

export function usePermissions() {
  const { data: session } = useSession();

  const isSuperAdmin = session?.user?.role === 'super_admin';
  const isCompanyAdmin = session?.user?.role === 'company_admin';
  const isTenantAdmin = session?.user?.role === 'tenant_admin';

  const canManageAdmins = isSuperAdmin;
  const canManageTenants = isSuperAdmin;
  const canViewReports = isSuperAdmin || isCompanyAdmin;

  return {
    isSuperAdmin,
    isCompanyAdmin,
    isTenantAdmin,
    canManageAdmins,
    canManageTenants,
    canViewReports,
  };
}
```

**Exemplo de uso:**

```typescript
// pages/admin/users.tsx
import { usePermissions } from '@/hooks/usePermissions';

export default function AdminUsersPage() {
  const { canManageAdmins } = usePermissions();

  if (!canManageAdmins) {
    return <div>Acesso negado</div>;
  }

  return <div>Gerenciar usuários...</div>;
}
```

---

## 8. Autenticação de Usuários Finais (User)

Se o dashboard também gerencia usuários finais (não-admin), os endpoints são:

### 8.1. Login de User

- **URL**: `/auth/user/authenticate`
- **Método**: `POST`
- **Payload**: `{ email, password }`

### 8.2. Perfil de User

- **URL**: `/auth/user/me`
- **Método**: `GET`
- **Headers**: Requer `Authorization` e `session-id`

**Nota:** A autenticação de User segue o mesmo padrão de duplo header (Bearer token + session-id).

---

## 9. Tratamento de Erros

### 9.1. Códigos de Erro Comuns

```typescript
// constants/error-codes.ts
export const ERROR_CODES = {
  // Autenticação
  ADMIN_EMAIL_NOT_FOUND: '401:ADMIN_EMAIL_NOT_FOUND',
  ADMIN_PASSWORD_INVALID: '401:ADMIN_PASSWORD_INVALID',
  ADMIN_TOKEN_INVALID: '401:ADMIN_TOKEN_INVALID',
  ADMIN_ACCOUNT_DEACTIVATED: '403:ADMIN_ACCOUNT_DEACTIVATED',
  
  // Autorização
  INSUFFICIENT_PERMISSIONS: '403:INSUFFICIENT_PERMISSIONS',
  
  // Recursos
  ADMIN_NOT_FOUND: '404:ADMIN_NOT_FOUND',
  TENANT_NOT_FOUND: '404:TENANT_NOT_FOUND',
};
```

### 9.2. Implementação de Tratamento

```typescript
// lib/error-handler.ts
export function handleApiError(error: any) {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Redirecionar para login
        window.location.href = '/login';
        break;
      case 403:
        // Mostrar mensagem de permissão negada
        alert('Você não tem permissão para esta ação');
        break;
      case 404:
        // Recurso não encontrado
        alert('Recurso não encontrado');
        break;
      case 500:
        // Erro interno do servidor
        alert('Erro no servidor. Tente novamente mais tarde.');
        break;
      default:
        alert('Erro desconhecido');
    }
  }
}
```

---

## 10. Migração de Endpoints Existentes

### 10.1. Mapeamento de Rotas

| Endpoint Antigo | Endpoint Novo | Contexto |
|----------------|---------------|----------|
| `/v1/admin/login` | `/auth/admin/authenticate` | Auth |
| `/v1/admin/me` | `/auth/admin/me` | Auth |
| `/v1/brands` | `/brands/*` | Brands |
| `/v1/companies` | `/cnpjs/*` | CNPJs |
| `/v1/journals` | `/journals/*` | Journals |
| `/v1/leads` | `/auth/leads/*` | Auth (Leads) |
| `/v1/campaigns` | `/mailer/*` | Mailer |

### 10.2. Exemplo de Migração

**Antes:**
```typescript
const response = await fetch(`${API_URL}/v1/brands/list`);
```

**Depois:**
```typescript
const response = await authenticatedFetch('/brands/list');
```

---

## 11. TypeScript Types

### 11.1. Tipos Principais

```typescript
// types/auth.types.ts

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  session_id: number;
  session_token: string;
  details: {
    name: string;
    email: string;
    role: AdminRole;
  };
}

export enum AdminRole {
  super_admin = 'super_admin',
  company_admin = 'company_admin',
  tenant_admin = 'tenant_admin',
}

export interface AdminProfile {
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  tenants: Tenant[];
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  domain: string;
}

export interface ApiError {
  code: string;
  message?: string;
}
```

---

## 12. Checklist de Migração

### Configuração
- [ ] Atualizar `NEXT_PUBLIC_API_URL` para remover `/v1`
- [ ] Verificar porta da API (padrão: 3002)
- [ ] Configurar variáveis de ambiente

### Autenticação
- [ ] Atualizar endpoint de login para `/auth/admin/authenticate`
- [ ] Modificar lógica para armazenar `session_id` e `session_token`
- [ ] Atualizar tipos TypeScript da resposta de autenticação

### Requisições
- [ ] Adicionar header `session-id` em todas as requisições autenticadas
- [ ] Manter header `Authorization: Bearer <token>`
- [ ] Implementar interceptor/middleware para headers automáticos
- [ ] Adicionar tratamento de erro 401 para sessão expirada

### Perfil e Dados
- [ ] Atualizar endpoint `/me` para `/auth/admin/me`
- [ ] Adicionar suporte a `tenants` na interface de perfil
- [ ] Implementar seletor de tenant (se aplicável)

### Permissões
- [ ] Implementar verificação de roles
- [ ] Adicionar guards de permissão em rotas protegidas
- [ ] Atualizar UI baseada em permissões do usuário

### Endpoints
- [ ] Mapear todos os endpoints antigos para novos contextos
- [ ] Remover prefixo `/v1` de todas as chamadas
- [ ] Testar cada endpoint migrado

### Testes
- [ ] Testar fluxo completo de login
- [ ] Testar requisições autenticadas
- [ ] Testar expiração de sessão
- [ ] Testar multi-tenancy (se aplicável)
- [ ] Testar diferentes níveis de permissão

---

## 13. Recursos Adicionais

### 13.1. Documentação da API

A API possui documentação Swagger completa disponível em:
```
http://localhost:3002/api/docs
```

### 13.2. Estrutura de Módulos DDD

A API segue arquitetura DDD com a seguinte estrutura por módulo:

```
src/modules/zarp-auth/
├── application/          # Casos de uso e DTOs
│   ├── dtos/
│   └── services/
├── domain/              # Entidades e regras de negócio
│   ├── entities/
│   ├── enums/
│   └── interfaces/
└── infrastructure/      # Implementações técnicas
    ├── controllers/
    ├── repositories/
    └── providers/
```

### 13.3. Suporte

Para dúvidas ou problemas na migração:
- Consulte a documentação Swagger
- Verifique os logs da API para detalhes de erros
- Revise este manual para casos específicos

---

## 14. Exemplo Completo de Integração

```typescript
// lib/api-client.ts
import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        const sessionId = localStorage.getItem('session_id');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (sessionId) {
          config.headers['session-id'] = sessionId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private clearAuth() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_id');
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/admin/authenticate', {
      email,
      password,
    });

    const { session_id, session_token, details } = response.data;

    localStorage.setItem('auth_token', session_token);
    localStorage.setItem('session_id', session_id.toString());

    return { session_id, session_token, details };
  }

  async getProfile() {
    const response = await this.client.get('/auth/admin/me');
    return response.data;
  }

  async getMyTenants() {
    const response = await this.client.get('/auth/tenants/my-tenants');
    return response.data;
  }

  logout() {
    this.clearAuth();
    window.location.href = '/login';
  }

  // Generic methods
  get(url: string, config = {}) {
    return this.client.get(url, config);
  }

  post(url: string, data = {}, config = {}) {
    return this.client.post(url, data, config);
  }

  put(url: string, data = {}, config = {}) {
    return this.client.put(url, data, config);
  }

  patch(url: string, data = {}, config = {}) {
    return this.client.patch(url, data, config);
  }

  delete(url: string, config = {}) {
    return this.client.delete(url, config);
  }
}

export const apiClient = new ApiClient();
```

**Uso:**

```typescript
// pages/login.tsx
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await apiClient.login(email, password);
      console.log('Login successful:', result.details);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login failed:', error);
      alert('Falha no login');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
      />
      <button type="submit">Entrar</button>
    </form>
  );
}
```

---

## Conclusão

Esta migração representa uma evolução significativa na arquitetura da API, trazendo melhor organização, segurança aprimorada e suporte a multi-tenancy. Siga este guia passo a passo para garantir uma transição suave do frontend.

**Pontos-chave para lembrar:**
1. Sempre envie `Authorization` E `session-id` em requisições autenticadas
2. Remova o prefixo `/v1` de todas as URLs
3. Armazene tanto `session_token` quanto `session_id` no login
4. Implemente tratamento adequado de erros 401
5. Aproveite o sistema de multi-tenancy se aplicável ao seu caso de uso
