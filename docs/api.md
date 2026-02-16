# API - Documentação Completa

## Visão Geral

A API do backend ZARP Admin é uma evolução, focada em funcionalidades de notificações por SMS, gestão de leads e campanhas de email marketing.

**Base URL:** `/`

**Autenticação:** A maioria dos endpoints requer autenticação via JWT usando o guard `AdminValidateJwtTokenGuard`.

---

## Índice

1. [Event Notification (SMS)](#1-event-notification-sms)
2. [Lead Management](#2-lead-management)
3. [Email Campaign](#3-email-campaign)
4. [Config (SMTP Server)](#4-config-smtp-server)
5. [Modelos de Dados](#5-modelos-de-dados)

---

## 1. Event Notification (SMS)

Módulo responsável pela gestão de notificações SMS e eventos relacionados.

### 1.1 Criar Notificação SMS

**Endpoint:** `POST /sms/create`

**Autenticação:** Requerida

**Descrição:** Cria uma nova notificação SMS e retorna um webhook UUID único.

**Request Body:**
```json
{
  "name": "string (obrigatório)"
}
```

**Response (200):**
```json
{
  "id": "number",
  "name": "string",
  "webhook": "string (UUID)"
}
```

**Códigos de Erro:**
- `500`: Erro ao criar notificação SMS

---

### 1.2 Listar Notificações SMS

**Endpoint:** `GET /sms`

**Autenticação:** Requerida

**Descrição:** Retorna todas as notificações SMS cadastradas.

**Response (200):**
```json
[
  {
    "id": "number",
    "name": "string",
    "webhook": "string (UUID)",
    "total_notifications": "number"
  }
]
```

---

### 1.3 Buscar Notificação SMS por ID

**Endpoint:** `GET /sms/:id`

**Autenticação:** Requerida

**Parâmetros de URL:**
- `id` (string numérica): ID da notificação SMS

**Response (200):**
```json
{
  "id": "number",
  "name": "string",
  "webhook": "string (UUID)",
  "total_notifications": "number"
}
```

**Códigos de Erro:**
- `404`: Notificação SMS não encontrada
- `500`: Erro ao buscar notificação

---

### 1.4 Enviar Evento SMS (Webhook)

**Endpoint:** `POST /sms/webhook/:uuid`

**Autenticação:** Requerida

**Descrição:** Envia um SMS através do webhook da notificação. Suporta templates com parâmetros dinâmicos.

**Parâmetros de URL:**
- `uuid` (UUID string): Webhook UUID da notificação

**Request Body:**
```json
{
  "message": "string (obrigatório) - Template da mensagem",
  "destination_number": "string numérica (obrigatório)",
  "sender_number": "string numérica (obrigatório)",
  "message_params": "object - Parâmetros do template"
}
```

**Exemplo de Request:**
```json
{
  "message": "Olá {{name}}, seu código é {{code}}",
  "destination_number": "5511999999999",
  "sender_number": "5511888888888",
  "message_params": {
    "name": "João",
    "code": "1234"
  }
}
```

**Response (200):**
```json
{
  "id": "number",
  "status": "pending | sent | failed",
  "message": "string",
  "created_at": "datetime"
}
```

**Códigos de Erro:**
- `404`: Webhook não encontrado
- `500`: Erro ao enviar SMS

---

### 1.5 Listar Eventos por Notificação

**Endpoint:** `GET /sms/webhook/:id_notification`

**Autenticação:** Requerida

**Parâmetros de URL:**
- `id_notification` (string numérica): ID da notificação SMS

**Response (200):**
```json
[
  {
    "id": "number",
    "destination_number": "string",
    "sender_number": "string",
    "message": "string",
    "status": "string",
    "sms_provider": "string",
    "created_at": "datetime"
  }
]
```

---

## 2. Lead Management

Módulo para gestão de leads e prospects.

### 2.1 Listar Leads

**Endpoint:** `GET /lead/`

**Autenticação:** Não requerida (comentada)

**Parâmetros de Query:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 30)

**Response (200):**
```json
{
  "data": [
    {
      "id": "number",
      "name": "string | null",
      "email": "string | null",
      "phone_number": "string | null",
      "origin": "number | null",
      "origin_font": "string | null",
      "description": "string | null",
      "data": "object | null",
      "status": "number",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```

---

### 2.2 Criar Lead

**Endpoint:** `POST /lead/`

**Autenticação:** Não requerida (comentada)

**Request Body:**
```json
{
  "name": "string (opcional)",
  "email": "string email válido (opcional)",
  "phone_number": "string (opcional)",
  "origin": "enum EOriginLead (opcional)",
  "origin_font": "string (opcional)",
  "description": "string (opcional)",
  "data": "object (obrigatório)"
}
```

**Valores de origin (EOriginLead):**
- Consulte o arquivo de tipos para valores válidos

**Response (201):**
```json
{
  "id": "number",
  "name": "string",
  "email": "string",
  "created_at": "datetime"
}
```

---

## 3. Email Campaign

Módulo completo para gestão de campanhas de email marketing com suporte a segmentação, variações de copy e upload de leads.

### 3.1 Criar Campanha

**Endpoint:** `POST /email-campaign/`

**Autenticação:** Não especificada

**Request Body:**
```json
{
  "name": "string (obrigatório)"
}
```

**Response (201):**
```json
{
  "id": "number",
  "name": "string",
  "status": "number",
  "created_at": "datetime"
}
```

---

### 3.2 Listar Campanhas

**Endpoint:** `GET /email-campaign/`

**Autenticação:** Não especificada

**Parâmetros de Query:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 30)

**Response (200):**
```json
{
  "data": [
    {
      "id": "number",
      "name": "string",
      "total_leads": "number",
      "open_rate": "number",
      "click_rate": "number",
      "campaign_batch_size": "number | null",
      "uploaded_leads": "boolean",
      "status": "number",
      "started_at": "datetime | null",
      "finished_at": "datetime | null",
      "created_at": "datetime"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```

---

### 3.3 Buscar Campanha por ID

**Endpoint:** `GET /email-campaign/:id`

**Parâmetros de URL:**
- `id` (string): ID da campanha

**Response (200):**
```json
{
  "id": "number",
  "name": "string",
  "total_leads": "number",
  "open_rate": "number",
  "click_rate": "number",
  "campaign_batch_size": "number | null",
  "copy_variation_type": "number | null",
  "status": "number",
  "smtp_server": {
    "id": "number",
    "name": "string",
    "email": "string"
  },
  "created_at": "datetime"
}
```

---

### 3.4 Buscar Batches da Campanha

**Endpoint:** `GET /email-campaign/segment-group/:id`

**Parâmetros de URL:**
- `id` (string): ID da campanha

**Response (200):**
```json
[
  {
    "id": "number",
    "name": "string",
    "total_leads": "number",
    "status": "number",
    "created_at": "datetime"
  }
]
```

---

### 3.5 Upload de Leads (CSV)

**Endpoint:** `POST /email-campaign/upload-leads/:id`

**Autenticação:** Não especificada

**Content-Type:** `multipart/form-data`

**Parâmetros de URL:**
- `id` (string): ID da campanha

**Form Data:**
- `file`: Arquivo CSV (máx 20MB)
  - Tipos aceitos: `text/csv`, `application/vnd.ms-excel`

**Response (200):**
```json
{
  "uploaded": "boolean",
  "total_leads": "number",
  "file_info": {
    "original_name": "string",
    "file_name": "string",
    "size": "number"
  }
}
```

**Códigos de Erro:**
- `400`: Arquivo não enviado ou inválido
- `500`: Erro ao processar arquivo

---

### 3.6 Criar Variação Principal de Copy

**Endpoint:** `POST /email-campaign/primary-copy-variant/create/:id`

**Parâmetros de URL:**
- `id` (string): ID da campanha

**Request Body:**
```json
{
  "html": "string (obrigatório) - Validação XSS",
  "md": "string (obrigatório) - Validação XSS",
  "subject": "string (obrigatório)",
  "from_name": "string (obrigatório)",
  "pre_header": "string (opcional)",
  "use_header": "boolean (obrigatório)",
  "use_footer": "boolean (obrigatório)"
}
```

**Validações:**
- XSS Prevention: HTML e MD são validados contra scripts maliciosos
- Detecta `<script>` tags, atributos `on*`, e `javascript:` protocols

**Response (201):**
```json
{
  "id": "number",
  "html_content": "string",
  "md_content": "string",
  "subject": "string",
  "from_name": "string",
  "use_header": "boolean",
  "use_footer": "boolean"
}
```

---

### 3.7 Buscar Variação Principal de Copy

**Endpoint:** `GET /email-campaign/primary-copy-variant/:id`

**Parâmetros de URL:**
- `id` (string): ID da campanha

**Response (200):**
```json
{
  "id": "number",
  "html_content": "string",
  "md_content": "string",
  "subject": "string",
  "from_name": "string",
  "pre_header": "string | null",
  "use_header": "boolean",
  "use_footer": "boolean",
  "created_at": "datetime"
}
```

---

### 3.8 Atualizar Tipo de Variação de Copy

**Endpoint:** `PUT /email-campaign/update/copy-variant/:id`

**Parâmetros de URL:**
- `id` (string): ID da campanha

**Request Body:**
```json
{
  "copy_variation_type": "enum ECopyVariationType (obrigatório)"
}
```

**Valores de copy_variation_type:**
- Consulte o arquivo de tipos `@Email-campaign` para valores válidos

**Response (200):**
```json
{
  "updated": "boolean",
  "copy_variation_type": "number"
}
```

---

### 3.9 Atualizar Tamanho do Batch

**Endpoint:** `PUT /email-campaign/update/campaign-batch-size/:id`

**Parâmetros de URL:**
- `id` (string): ID da campanha

**Request Body:**
```json
{
  "campaign_batch_size": "number (obrigatório, mínimo: 100)"
}
```

**Validações:**
- Deve ser um número positivo
- Mínimo: 100

**Response (200):**
```json
{
  "updated": "boolean",
  "campaign_batch_size": "number"
}
```

---

### 3.10 Finalizar Setup da Campanha

**Endpoint:** `POST /email-campaign/close-setup/:id`

**Parâmetros de URL:**
- `id` (string): ID da campanha

**Descrição:** Finaliza a configuração inicial da campanha e a prepara para execução.

**Response (200):**
```json
{
  "setup_closed": "boolean",
  "status": "number",
  "message": "string"
}
```

---

## 4. Config (SMTP Server)

Módulo de configuração para servidores SMTP e provedores de email.

### 4.1 Criar Servidor SMTP

**Endpoint:** `POST /config/smtp-server`

**Autenticação:** Não especificada

**Request Body:**
```json
{
  "name": "string (obrigatório)",
  "email": "string email válido (obrigatório)",
  "provider": "enum ESMTPProvider (obrigatório)",
  "default": "boolean (opcional)",
  "smtp": {
    "host": "string",
    "port": "string",
    "username": "string",
    "password": "string"
  },
  "api": {
    "access_token": "string",
    "private_token": "string",
    "region": "string (opcional)"
  }
}
```

**Observações:**
- `smtp` ou `api` devem ser fornecidos dependendo do provider
- Se `default` for `true`, este servidor se tornará o padrão para novas campanhas

**Valores de provider (ESMTPProvider):**
- Consulte o arquivo de tipos `@smtp-server` para valores válidos

**Response (201):**
```json
{
  "id": "number",
  "name": "string",
  "email": "string",
  "provider": "number",
  "default": "boolean",
  "created_at": "datetime"
}
```

---

### 4.2 Listar Servidores SMTP

**Endpoint:** `GET /config/smtp-server`

**Autenticação:** Não especificada

**Response (200):**
```json
[
  {
    "id": "number",
    "name": "string",
    "email": "string",
    "domain": "string",
    "provider": "number",
    "default": "boolean",
    "created_at": "datetime"
  }
]
```

---

## 5. Modelos de Dados

### 5.1 Lead

```typescript
{
  id: number;
  name?: string;
  email?: string;
  phone_number?: string;
  origin?: number; // EOriginLead enum
  origin_font?: string;
  description?: string;
  data?: object;
  status?: number;
  created_at: Date;
  updated_at: Date;
}
```

---

### 5.2 EmailCampaign

```typescript
{
  id: number;
  name: string;
  total_leads: number;
  open_rate: number;
  click_rate: number;
  campaign_batch_size?: number;
  uploaded_leads: boolean;
  copy_variation_type?: number; // ECopyVariationType enum
  funnel_campaign: boolean;
  main_email_id?: number;
  status: number;
  started_at?: Date;
  finished_at?: Date;
  smtp_server_id: number;
  created_at: Date;
  updated_at: Date;
}
```

---

### 5.3 Email (Primary Copy Variant)

```typescript
{
  id: number;
  type: number;
  name: string;
  html_content: string;
  md_content: string;
  used_ai: boolean;
  from_name: string;
  edited: boolean;
  subject: string;
  pre_header?: string;
  use_header: boolean;
  use_footer: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

### 5.4 SMTPServer

```typescript
{
  id: number;
  name: string;
  email: string;
  domain: string;
  host?: string;
  port?: string;
  username?: string;
  hash_password?: string;
  hash_access_token?: string;
  hash_private_token?: string;
  region?: string;
  provider: number; // ESMTPProvider enum
  default: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

### 5.5 SMSNotification

```typescript
{
  id: number;
  name: string;
  webhook: string; // UUID
  total_notifications: number;
  created_at: Date;
  updated_at: Date;
}
```

---

### 5.6 SMSNotificationEvent

```typescript
{
  id: number;
  sms_notification_id: number;
  destination_number: string;
  sender_number: string;
  destination_country: string;
  message: string;
  sms_provider: string; // ESMSProvider enum
  status: string; // ESMSNotificationEventStatus enum
  created_at: Date;
  updated_at: Date;
}
```

---

## 6. Enums e Constantes

### 6.1 EOriginLead

Define as possíveis origens de um lead:

```typescript
enum EOriginLead {
  // Consulte src/core/classes/models/Lead para valores
}
```

---

### 6.2 ECopyVariationType

Define os tipos de variação de copy para campanhas:

```typescript
enum ECopyVariationType {
  // Consulte src/@types/@Email-campaign para valores
}
```

---

### 6.3 ESMTPProvider

Define os provedores SMTP suportados:

```typescript
enum ESMTPProvider {
  // Consulte src/@types/@smtp-server para valores
}
```

---

### 6.4 ESMSProvider

Define os provedores de SMS suportados:

```typescript
enum ESMSProvider {
  awsSNS = 'awsSNS',
  // Outros provedores
}
```

---

### 6.5 ESMSNotificationEventStatus

Define os status possíveis de um evento SMS:

```typescript
enum ESMSNotificationEventStatus {
  pending = 'pending',
  sent = 'sent',
  failed = 'failed',
  // Outros status
}
```

---

## 7. Códigos de Status HTTP

| Código | Descrição                      |
|--------|--------------------------------|
| 200    | Sucesso                        |
| 201    | Criado com sucesso             |
| 400    | Requisição inválida            |
| 404    | Recurso não encontrado         |
| 500    | Erro interno do servidor       |

---

## 8. Segurança e Validações

### 8.1 Autenticação

A maioria dos endpoints utiliza o guard `AdminValidateJwtTokenGuard` que valida:
- Token JWT válido no header `Authorization`
- Token não expirado
- Permissões de administrador

### 8.2 Validações de Input

Todos os DTOs utilizam class-validator com as seguintes validações:
- `@IsString()`: Valida strings
- `@IsNotEmpty()`: Campo obrigatório
- `@IsEmail()`: Email válido
- `@IsUUID()`: UUID válido
- `@IsNumberString()`: String numérica
- `@IsEnum()`: Valor dentro do enum especificado
- `@IsNumber()`, `@IsPositive()`, `@Min()`: Validações numéricas
- `@NoXSS()`: Validação customizada contra XSS attacks

### 8.3 Proteção XSS

A validação customizada `@NoXSS()` detecta:
- Tags `<script>`
- Atributos de event handlers (`onclick`, `onload`, etc.)
- Protocolo `javascript:` em links
- Outros padrões maliciosos

---

## 9. Estrutura de Erros

### Formato de Resposta de Erro

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "any (opcional)"
  }
}
```

### Constantes de Erro

- `ERROR_CREATE_SMS_NOTIFICATION`: Erro ao criar notificação SMS
- `ERROR_FIND_SMS_NOTIFICATION`: Erro ao buscar notificações
- `ERROR_FIND_BY_ID_SMS_NOTIFICATION`: Erro ao buscar notificação por ID
- `ERROR_CREATE_SMS_NOTIFICATION_EVENT_NOTIFICATION_NOT_FOUND`: Webhook não encontrado
- `ERROR_FIND_BY_ID_NOTIFICATION_SMS_NOTIFICATION`: Erro ao buscar eventos

---

## 10. Providers Externos

### 10.1 AWS SNS (SMS)

Utilizado para envio de SMS através do serviço AWS Simple Notification Service.

**Configuração necessária:**
- AWS Access Key ID
- AWS Secret Access Key
- Região AWS

### 10.2 SMTP Providers

Suporta diversos provedores SMTP configuráveis através do módulo Config.

---

## 11. Background Jobs e Processamento

### 11.1 Email Campaign Process

A classe `EmailCampaignProcess` gerencia:
- Processamento assíncrono de envios de email
- Divisão de campanhas em batches
- Retry logic para falhas
- Tracking de métricas (open rate, click rate)

---

## 12. Paginação

Endpoints que retornam listas suportam paginação via query parameters:

```
?page=1&limit=30
```

**Valores padrão:**
- `page`: 1
- `limit`: 30

**Formato de resposta com paginação:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 150,
    "total_pages": 5
  }
}
```

---

## 13. Rate Limiting

Atualmente não há rate limiting implementado na API v2. Recomenda-se implementar para ambientes de produção.

---

## 14. Versionamento

A API v2 é versionada através do prefixo de rota `/v2`. Mudanças breaking changes devem resultar em uma nova versão (v3).

---

## 15. Notas de Desenvolvimento

### 15.1 Guards Comentados

Alguns endpoints têm guards comentados (`// @UseGuards(AdminValidateJwtTokenGuard)`), indicando que estão em desenvolvimento ou teste. **NÃO devem ir para produção sem autenticação adequada.**

### 15.2 Path do Upload

Arquivos CSV são salvos temporariamente em `./temp/leads-upload`. Certifique-se de que:
- O diretório existe
- Há permissões adequadas
- Há limpeza periódica de arquivos antigos

### 15.3 Providers AWS

A integração com AWS SNS requer credenciais configuradas. Verifique as variáveis de ambiente necessárias.

---

## 16. Endpoints por Módulo

### Resumo de Endpoints

| Método | Endpoint                                       | Módulo             | Auth | Descrição                          |
|--------|------------------------------------------------|--------------------|------|------------------------------------|
| POST   | /v2/sms/create                                 | Event Notification | ✓    | Cria notificação SMS               |
| GET    | /v2/sms                                        | Event Notification | ✓    | Lista notificações SMS             |
| GET    | /v2/sms/:id                                    | Event Notification | ✓    | Busca notificação por ID           |
| POST   | /v2/sms/webhook/:uuid                          | Event Notification | ✓    | Envia SMS via webhook              |
| GET    | /v2/sms/webhook/:id_notification               | Event Notification | ✓    | Lista eventos por notificação      |
| GET    | /v2/lead/                                      | Lead               | ✗    | Lista leads                        |
| POST   | /v2/lead/                                      | Lead               | ✗    | Cria lead                          |
| POST   | /v2/email-campaign/                            | Email Campaign     | ✗    | Cria campanha                      |
| GET    | /v2/email-campaign/                            | Email Campaign     | ✗    | Lista campanhas                    |
| GET    | /v2/email-campaign/:id                         | Email Campaign     | ✗    | Busca campanha por ID              |
| GET    | /v2/email-campaign/segment-group/:id           | Email Campaign     | ✗    | Busca batches da campanha          |
| PUT    | /v2/email-campaign/update/copy-variant/:id     | Email Campaign     | ✗    | Atualiza tipo de variação          |
| PUT    | /v2/email-campaign/update/campaign-batch-size/:id | Email Campaign  | ✗    | Atualiza tamanho do batch          |
| POST   | /v2/email-campaign/upload-leads/:id            | Email Campaign     | ✗    | Upload de leads CSV                |
| POST   | /v2/email-campaign/primary-copy-variant/create/:id | Email Campaign | ✗    | Cria variação principal            |
| GET    | /v2/email-campaign/primary-copy-variant/:id    | Email Campaign     | ✗    | Busca variação principal           |
| POST   | /v2/email-campaign/close-setup/:id             | Email Campaign     | ✗    | Finaliza setup da campanha         |
| POST   | /v2/config/smtp-server                         | Config             | ✗    | Cria servidor SMTP                 |
| GET    | /v2/config/smtp-server                         | Config             | ✗    | Lista servidores SMTP              |

---

## 17. Changelog

### v2.0.0 (Data de Release)
- Lançamento inicial da API v2
- Módulos: Event Notification, Lead, Email Campaign, Config
- Suporte a SMS via AWS SNS
- Sistema de campanhas de email com batches
- Upload de leads via CSV
- Gestão de servidores SMTP

---

## 18. Roadmap

Funcionalidades planejadas para próximas versões:
- [ ] Rate limiting
- [ ] Webhooks para eventos de campanha
- [ ] Analytics avançado de campanhas
- [ ] A/B testing de variações de copy
- [ ] Integração com mais provedores SMS
- [ ] API de relatórios
- [ ] Filtros avançados para listagens
- [ ] Exportação de dados

---

## 19. Suporte

Para questões sobre a API v2, consulte:
- Repositório: [backend_api_zarp-admin]
- Documentação de módulos específicos: `/docs/modules/`
- Dependências: `/docs/dependencies.md`

---

**Última atualização:** 15 de fevereiro de 2026
**Versão da API:** v2.0.0
