# Rotas de Gerenciamento de Superadmin

Este documento lista todas as rotas disponíveis para superadmins gerenciarem tenants, admins e usuários.

## Autenticação

Todas as rotas requerem:
- Header: `Authorization: Bearer <token>`
- Role: `super_admin`

## Admin Management (`/api/admin`)

### Autenticação
- `POST /api/admin/authenticate` - Autenticar admin
- `GET /api/admin/me` - Dados do admin autenticado

### CRUD de Admins
- `POST /api/admin/register` - Criar novo admin (super_admin only)
- `GET /api/admin/list` - Listar todos os admins (super_admin only)
- `GET /api/admin/:id` - Buscar admin por ID (super_admin only) ✨ NOVO
- `PATCH /api/admin/:id` - Atualizar dados do admin (super_admin only) ✨ NOVO
- `PATCH /api/admin/:id/role` - Atualizar role do admin (super_admin only)
- `PATCH /api/admin/:id/activate` - Ativar admin (super_admin only) ✨ NOVO
- `PATCH /api/admin/:id/deactivate` - Desativar admin (super_admin only)
- `DELETE /api/admin/:id` - Deletar admin permanentemente (super_admin only) ✨ NOVO

## Tenant Management (`/api/tenants`)

### CRUD de Tenants
- `POST /api/tenants` - Criar tenant (super_admin only)
- `GET /api/tenants` - Listar todos os tenants (super_admin only)
- `GET /api/tenants/my-tenants` - Listar tenants do admin autenticado
- `GET /api/tenants/:id` - Buscar tenant por ID (super_admin only)
- `PATCH /api/tenants/:id` - Atualizar tenant (super_admin only)
- `PATCH /api/tenants/:id/activate` - Ativar tenant (super_admin only) ✨ NOVO
- `PATCH /api/tenants/:id/deactivate` - Desativar tenant (super_admin only) ✨ NOVO
- `DELETE /api/tenants/:id` - Deletar tenant permanentemente (super_admin only) ✨ NOVO

### Gerenciamento de Admins em Tenants
- `POST /api/tenants/assign` - Atribuir admin a tenant (super_admin only)
- `DELETE /api/tenants/:tenantId/admins/:adminId` - Remover admin de tenant (super_admin only)
- `GET /api/tenants/:tenantId/admins` - Listar admins de um tenant (super_admin only)
- `PATCH /api/tenants/:tenantId/admins/:adminId/role` - Atualizar role do admin no tenant (super_admin only) ✨ NOVO

## User Management (`/api/admin/users`)

### CRUD de Usuários (para superadmin)
- `GET /api/admin/users` - Listar todos os usuários com paginação (super_admin only) ✨ NOVO
  - Query params: `?page=1&limit=20`
- `GET /api/admin/users/:id` - Buscar usuário por ID (super_admin only) ✨ NOVO
- `PATCH /api/admin/users/:id` - Atualizar dados do usuário (super_admin only) ✨ NOVO
- `PATCH /api/admin/users/:id/deactivate` - Desativar usuário (super_admin only) ✨ NOVO
- `DELETE /api/admin/users/:id` - Deletar usuário permanentemente (super_admin only) ✨ NOVO

## Estrutura de Resposta

### Sucesso
```json
{
  "status": 200,
  "data": { ... }
}
```

### Erro
```json
{
  "status": 400,
  "data": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

## Códigos de Erro Comuns

- `401:ADMIN_TOKEN_IN` - Token inválido ou expirado
- `403:INSUFFICIENT_PERMISSIONS` - Permissões insuficientes
- `404:ADMIN_NOT_FOUND` - Admin não encontrado
- `404:TENANT_NOT_FOUND` - Tenant não encontrado
- `404:USER_NOT_FOUND` - Usuário não encontrado
- `400:ADMIN_EMAIL_ALREADY_EXISTS` - Email de admin já existe
- `400:TENANT_SLUG_ALREADY_EXISTS` - Slug de tenant já existe
- `400:CANNOT_DEACTIVATE_SELF` - Não pode desativar a si mesmo
- `400:CANNOT_DELETE_SELF` - Não pode deletar a si mesmo

## Exemplos de Uso

### Criar Admin
```bash
POST /api/admin/register
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "Str0ng!Pass",
  "role": "manager"
}
```

### Criar Tenant
```bash
POST /api/tenants
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "domain": "admin.acme.com"
}
```

### Atribuir Admin a Tenant
```bash
POST /api/tenants/assign
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "admin_id": 1,
  "tenant_id": 1
}
```

### Listar Usuários com Paginação
```bash
GET /api/admin/users?page=1&limit=20
Authorization: Bearer <super_admin_token>
```

## Notas Importantes

1. Apenas usuários com role `super_admin` podem acessar essas rotas
2. Superadmins não podem desativar ou deletar a si mesmos
3. Ao deletar um tenant, todos os relacionamentos com admins são removidos
4. Ao deletar um admin, todos os relacionamentos com tenants são removidos
5. Desativar um usuário define `date_expires_in` para a data atual
6. A paginação de usuários retorna 20 itens por página por padrão
