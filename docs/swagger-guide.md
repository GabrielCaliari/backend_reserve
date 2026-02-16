# Guia Swagger - API v2

## Acesso à Documentação

Após iniciar o servidor, a documentação Swagger está disponível em:

```
http://localhost:{PORT}/api/docs
```

Exemplo: `http://localhost:3000/api/docs`

---

## Recursos Disponíveis

### Interface Interativa

A documentação Swagger oferece:

1. **Listagem de Endpoints**: Todos os endpoints organizados por módulo/tag
2. **Testes Interativos**: Execute requisições diretamente da interface
3. **Schemas**: Visualização de estruturas de dados (DTOs)
4. **Autenticação**: Teste com JWT Bearer Token

---

## Como Usar

### 1. Autenticação

Muitos endpoints requerem autenticação JWT:

1. Clique no botão **"Authorize"** no topo da página
2. Insira seu token JWT no formato: `Bearer seu_token_aqui`
3. Clique em **"Authorize"** e depois **"Close"**
4. Agora você pode testar endpoints protegidos

### 2. Testar um Endpoint

1. Clique no endpoint desejado para expandir
2. Clique no botão **"Try it out"**
3. Preencha os parâmetros necessários
4. Clique em **"Execute"**
5. Veja a resposta na seção **"Response"**

### 3. Visualizar Schemas

- Clique em **"Schemas"** no final da página
- Explore os modelos de dados (DTOs) disponíveis
- Veja exemplos de valores para cada campo

---

## Módulos da API v2

### 🔔 Event Notification (SMS)

**Funcionalidades:**
- Criar notificações SMS
- Listar notificações
- Enviar SMS via webhook
- Rastrear eventos de envio

**Endpoints principais:**
- `POST /v2/sms/create` - Criar notificação
- `GET /v2/sms` - Listar notificações
- `POST /v2/sms/webhook/:uuid` - Enviar SMS

### 👥 Lead Management

**Funcionalidades:**
- Criar leads
- Listar leads com paginação
- Gerenciar origem e dados dos leads

**Endpoints principais:**
- `POST /v2/lead/` - Criar lead
- `GET /v2/lead/` - Listar leads

### 📧 Email Campaign

**Funcionalidades:**
- Criar campanhas de email
- Upload de leads via CSV
- Configurar variações de copy
- Gerenciar batches de envio
- Finalizar setup de campanha

**Endpoints principais:**
- `POST /v2/email-campaign/` - Criar campanha
- `GET /v2/email-campaign/` - Listar campanhas
- `POST /v2/email-campaign/upload-leads/:id` - Upload CSV
- `POST /v2/email-campaign/primary-copy-variant/create/:id` - Criar copy

### ⚙️ Config (SMTP Server)

**Funcionalidades:**
- Configurar servidores SMTP
- Listar provedores configurados
- Definir servidor padrão

**Endpoints principais:**
- `POST /v2/config/smtp-server` - Criar servidor SMTP
- `GET /v2/config/smtp-server` - Listar servidores

---

## Exemplos de Uso

### Criar Lead

```json
POST /v2/lead/
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone_number": "11999999999",
  "origin": 6,
  "description": "Interessado em plano empresarial",
  "data": {
    "interesse": "plano-premium"
  }
}
```

### Enviar SMS via Webhook

```json
POST /v2/sms/webhook/{uuid}
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

### Criar Campanha de Email

```json
POST /v2/email-campaign/
{
  "name": "Campanha Black Friday 2026"
}
```

### Upload de Leads (CSV)

```
POST /v2/email-campaign/upload-leads/{id}
Content-Type: multipart/form-data

file: [arquivo.csv]
```

---

## Validações e Erros

### Validações Automáticas

Os DTOs possuem validações automáticas:

- **Email**: Formato válido de email
- **UUID**: Formato UUID v4
- **Enum**: Valores dentro do enum permitido
- **Number**: Valores numéricos positivos
- **Min/Max**: Valores dentro do range especificado
- **XSS**: Validação contra scripts maliciosos em HTML/MD

### Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200    | Sucesso |
| 201    | Criado com sucesso |
| 400    | Requisição inválida (validação falhou) |
| 404    | Recurso não encontrado |
| 500    | Erro interno do servidor |

### Formato de Erro

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro",
    "details": "Detalhes adicionais"
  }
}
```

---

## Paginação

Endpoints de listagem suportam paginação:

**Query Parameters:**
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 30)

**Exemplo:**
```
GET /v2/lead/?page=2&limit=50
```

**Resposta:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

---

## Tipos de Dados (Enums)

### EOriginLead (Origem do Lead)

```typescript
seo_tool = 1       // Ferramenta SEO
seo_archive = 2    // Arquivo SEO
email = 3          // Email
facebook_ads = 4   // Facebook Ads
google_ads = 5     // Google Ads
page = 6           // Página do site
```

### ESMTPProvider (Provedor SMTP)

```typescript
smtp = 1    // SMTP genérico
amazon = 2  // Amazon SES
```

### ECopyVariationType (Tipo de Variação de Copy)

```typescript
ai = 1      // Gerado por IA
manual = 2  // Manual
```

### EEmailCampaignStatus (Status da Campanha)

```typescript
draft = 0      // Rascunho
pending = 1    // Pendente
scheduled = 2  // Agendada
sent = 3       // Enviada
failed = 4     // Falhou
archived = 5   // Arquivada
paused = 8     // Pausada
```

---

## Segurança

### Proteção XSS

Os campos HTML e Markdown são validados contra:
- Tags `<script>`
- Atributos de event handlers (`onclick`, `onload`, etc.)
- Protocolo `javascript:` em links

### Autenticação JWT

- Token deve ser válido e não expirado
- Deve ter permissões de administrador
- Incluir no header: `Authorization: Bearer {token}`

---

## Dicas

### 1. Explore os Schemas

Antes de fazer requisições, explore os schemas para entender a estrutura dos dados.

### 2. Use Exemplos

Cada campo possui um exemplo de valor que pode ser usado como base.

### 3. Validação em Tempo Real

A interface Swagger valida os dados antes de enviar, economizando tempo.

### 4. Copie como cURL

Você pode copiar qualquer requisição como comando cURL clicando em "Copy as cURL".

### 5. Download da Especificação

Baixe a especificação OpenAPI clicando no link no topo da página.

---

## Troubleshooting

### Erro 401 (Unauthorized)

- Verifique se o token JWT está correto
- Verifique se o token não expirou
- Certifique-se de estar usando o formato correto: `Bearer {token}`

### Erro 400 (Bad Request)

- Verifique se todos os campos obrigatórios estão preenchidos
- Verifique se os tipos de dados estão corretos
- Verifique se os valores enum são válidos

### Erro 404 (Not Found)

- Verifique se o ID/UUID está correto
- Verifique se o recurso existe no banco de dados

### Erro 500 (Internal Server Error)

- Verifique os logs do servidor
- Pode ser um erro de configuração ou banco de dados

---

## Recursos Adicionais

- **Documentação Markdown**: [/docs/api-v2.md](./api-v2.md)
- **Módulos**: [/docs/modules/](./modules/)
- **Dependências**: [/docs/dependencies.md](./dependencies.md)

---

## Contato e Suporte

Para questões técnicas ou bugs, consulte a documentação no repositório ou entre em contato com a equipe de desenvolvimento.

---

**Última atualização:** 15 de fevereiro de 2026
**Versão da API:** v2.0.0
