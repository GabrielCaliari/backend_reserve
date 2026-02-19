# Swagger Documentation - Superadmin API

Esta documentação descreve a API REST completa para gerenciamento de superadmin, incluindo todos os endpoints, schemas de request/response e exemplos.

## Acesso à Documentação Interativa

Após iniciar o servidor, acesse:
```
http://localhost:3000/api/docs
```

## Autenticação

Todas as rotas protegidas requerem:
- Header: `Authorization: Bearer <token>`
- Role: `super_admin` (exceto onde indicado)

### Obter Token de Autenticação

```http
POST /api/admin/authenticate
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "Str0ng!Pass"
}
```

**Response 200:**
```json
{
  "session_id": 1,
  "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "details": {
    "name": "John Doe",
    "email": "admin@company.com",
    "role": "super_admin"
  }
}
```

---

## Admin Management

### 1. Create Admin

```http
POST /api/admin/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "Str0ng!Pass",
  "role": "manager"
}
```

**Roles disponíveis:**
- `super_admin` - Acesso total ao sistema
- `owner` - Proprietário de tenant
- `manager` - Gerente de tenant
- `editor` - Editor de conteúdo
- `viewer` - Apenas visualização

**Response 201:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@company.com",
  "role": "manager"
}
```

### 2. List All Admins

```http
GET /api/admin/list
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@company.com",
    "role": "manager",
    "active": true,
    "tenants": [
      {
        "id": 1,
        "name": "Acme Corp",
        "slug": "acme-corp"
      }
    ],
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### 3. Get Admin by ID

```http
GET /api/admin/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@company.com",
  "role": "manager",
  "active": true,
  "tenants": [
    {
      "id": 1,
      "name": "Acme Corp",
      "slug": "acme-corp",
      "domain": "admin.acme.com",
      "role": "manager"
    }
  ],
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### 4. Update Admin

```http
PATCH /api/admin/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe Updated",
  "email": "john.new@company.com"
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "John Doe Updated",
  "email": "john.new@company.com"
}
```

### 5. Update Admin Role

```http
PATCH /api/admin/:id/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "owner"
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "John Doe",
  "role": "owner"
}
```

### 6. Activate Admin

```http
PATCH /api/admin/:id/activate
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "active": true
}
```

### 7. Deactivate Admin

```http
PATCH /api/admin/:id/deactivate
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "active": false
}
```

### 8. Delete Admin

```http
DELETE /api/admin/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "deleted": true
}
```

---

## Tenant Management

### 1. Create Tenant

```http
POST /api/tenants
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "domain": "admin.acme.com"
}
```

**Regras para slug:**
- Apenas letras minúsculas, números e hífens
- Deve ser único no sistema
- Exemplo: `acme-corp`, `my-company-123`

**Response 201:**
```json
{
  "id": 1,
  "name": "Acme Corp",
  "slug": "acme-corp",
  "domain": "admin.acme.com",
  "active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 2. List All Tenants

```http
GET /api/tenants
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Acme Corp",
    "slug": "acme-corp",
    "domain": "admin.acme.com",
    "active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "AdminTenant": [
      {
        "Admin": {
          "id": 1,
          "name": "John Doe",
          "email": "john@company.com",
          "role": "manager"
        }
      }
    ]
  }
]
```

### 3. Get Tenant by ID

```http
GET /api/tenants/:id
Authorization: Bearer <token>
```

**Response 200:** (mesmo formato do List All Tenants)

### 4. Update Tenant

```http
PATCH /api/tenants/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corp Updated",
  "slug": "acme-corp-new",
  "domain": "new.acme.com"
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Acme Corp Updated",
  "slug": "acme-corp-new",
  "domain": "new.acme.com",
  "active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-02T00:00:00.000Z"
}
```

### 5. Activate Tenant

```http
PATCH /api/tenants/:id/activate
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "active": true
}
```

### 6. Deactivate Tenant

```http
PATCH /api/tenants/:id/deactivate
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "active": false
}
```

### 7. Delete Tenant

```http
DELETE /api/tenants/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "deleted": true
}
```

### 8. Assign Admin to Tenant

```http
POST /api/tenants/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "admin_id": 1,
  "tenant_id": 1
}
```

**Response 201:**
```json
{
  "id": 1,
  "admin_id": 1,
  "tenant_id": 1,
  "role": "manager",
  "active": true
}
```

### 9. Remove Admin from Tenant

```http
DELETE /api/tenants/:tenantId/admins/:adminId
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "removed": true
}
```

### 10. List Admins of Tenant

```http
GET /api/tenants/:tenantId/admins
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@company.com",
    "role": "manager",
    "active": true
  }
]
```

### 11. Update Admin Role in Tenant

```http
PATCH /api/tenants/:tenantId/admins/:adminId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "editor"
}
```

**Response 200:**
```json
{
  "id": 1,
  "admin_id": 1,
  "tenant_id": 1,
  "role": "editor",
  "active": true
}
```

---

## User Management

### 1. List Users (Paginated)

```http
GET /api/admin/users?page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)

**Response 200:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone_number": "5511999999999",
      "cpf": "12345678901",
      "plan_id": 1,
      "date_expires_in": "2025-12-31T00:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2. Get User by ID

```http
GET /api/admin/users/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone_number": "5511999999999",
  "cpf": "12345678901",
  "sex": 1,
  "date_of_birth": "1990-01-01T00:00:00.000Z",
  "date_expires_in": "2025-12-31T00:00:00.000Z",
  "plan_id": 1,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 3. Update User

```http
PATCH /api/admin/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe Updated",
  "email": "jane.new@example.com",
  "phone_number": "5511888888888"
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Jane Doe Updated",
  "email": "jane.new@example.com",
  "phone_number": "5511888888888"
}
```

### 4. Deactivate User

```http
PATCH /api/admin/users/:id/deactivate
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "date_expires_in": "2024-01-01T00:00:00.000Z"
}
```

### 5. Delete User

```http
DELETE /api/admin/users/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "deleted": true
}
```

---

## Error Responses

Todas as rotas podem retornar os seguintes erros:

### 400 Bad Request
```json
{
  "code": "400:ERROR_CODE",
  "message": "Detailed error message"
}
```

**Códigos comuns:**
- `ADMIN_EMAIL_ALREADY_EXISTS` - Email de admin já cadastrado
- `TENANT_SLUG_ALREADY_EXISTS` - Slug de tenant já existe
- `USER_EMAIL_ALREADY_EXISTS` - Email de usuário já cadastrado
- `CANNOT_DEACTIVATE_SELF` - Não pode desativar a si mesmo
- `CANNOT_DELETE_SELF` - Não pode deletar a si mesmo

### 401 Unauthorized
```json
{
  "code": "401:ADMIN_TOKEN_IN",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "code": "403:INSUFFICIENT_PERMISSIONS",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "code": "404:ADMIN_NOT_FOUND",
  "message": "Admin not found"
}
```

**Códigos comuns:**
- `ADMIN_NOT_FOUND` - Admin não encontrado
- `TENANT_NOT_FOUND` - Tenant não encontrado
- `USER_NOT_FOUND` - Usuário não encontrado
- `ADMIN_NOT_IN_TENANT` - Admin não está associado ao tenant

### 500 Internal Server Error
```json
{
  "code": "500:ERROR_CODE",
  "message": "Internal server error"
}
```

---

## Schemas de Dados

### EAdminRole (Enum)
```typescript
enum EAdminRole {
  super_admin = 'super_admin',
  owner = 'owner',
  manager = 'manager',
  editor = 'editor',
  viewer = 'viewer',
  company_admin = 'company_admin' // DEPRECATED
}
```

### Admin
```typescript
{
  id: number;
  name: string;
  email: string;
  role: EAdminRole;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Tenant
```typescript
{
  id: number;
  name: string;
  slug: string;
  domain?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### User
```typescript
{
  id: number;
  name: string;
  email: string;
  phone_number: string;
  cpf: string;
  sex?: number;
  date_of_birth?: Date;
  date_expires_in?: Date;
  plan_id: number;
  created_at: Date;
  updated_at: Date;
}
```

---

## Testando a API

### Usando cURL

```bash
# 1. Autenticar
curl -X POST http://localhost:3000/api/admin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Str0ng!Pass"}'

# 2. Listar admins (use o token retornado)
curl -X GET http://localhost:3000/api/admin/list \
  -H "Authorization: Bearer <seu-token>"

# 3. Criar tenant
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer <seu-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","slug":"acme-corp","domain":"admin.acme.com"}'
```

### Usando Postman

1. Importe a collection do Swagger: `http://localhost:3000/api/docs-json`
2. Configure a variável de ambiente `{{baseUrl}}` = `http://localhost:3000`
3. Configure a variável `{{token}}` após autenticar
4. Use `Bearer {{token}}` no header Authorization

---

## Notas Importantes

1. **Permissões**: Apenas `super_admin` pode acessar essas rotas
2. **Validação**: Todos os campos são validados com `class-validator`
3. **Transações**: Operações críticas usam transações do Prisma
4. **Soft Delete**: Desativação não remove dados, apenas marca como inativo
5. **Hard Delete**: Deleção permanente remove todos os dados relacionados
6. **Paginação**: Limite máximo recomendado de 100 itens por página
7. **Rate Limiting**: Considere implementar rate limiting em produção
