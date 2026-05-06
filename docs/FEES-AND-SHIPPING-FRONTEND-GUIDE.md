# Guia de Integração — Taxas e Frete (Frontend)

## Visão Geral

O sistema de taxas funciona em 3 níveis de prioridade:

```
1. Override do produto  →  chip_cost_override / shipping_fee_override
2. Taxa da categoria    →  chip_cost_percent / shipping_fee
3. Taxa global          →  B2CFeeConfig (chip_cost_percent / shipping_fee)
```

Se nenhum nível estiver configurado, a taxa é 0.

- **chip_cost_percent**: percentual (%) aplicado sobre o preço base do produto
- **shipping_fee**: valor fixo em centavos cobrado uma vez por pedido (só para produtos físicos)

---

## Endpoints Disponíveis

Base URL: `/api/b2c/fees`  
Auth: `Bearer <admin_token>` + header `x-tenant-id`

---

## 1. Taxa Global do Tenant

### GET `/api/b2c/fees/global`
Busca a taxa global configurada para o tenant.

**Response:**
```json
{
  "id": "cfg_abc123",
  "tenantId": "ten_xyz",
  "chipCostPercent": 2.5,
  "shippingFee": 1500,
  "createdAt": "2026-05-06T00:00:00.000Z",
  "updatedAt": "2026-05-06T00:00:00.000Z"
}
```
> Retorna `null` se ainda não configurado.

---

### PUT `/api/b2c/fees/global`
Cria ou atualiza a taxa global. Usar no botão **"Configurar Taxas Globais"** do painel.

**Body:**
```json
{
  "chipCostPercent": 2.5,
  "shippingFee": 1500
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `chipCostPercent` | `number` | % sobre o preço (ex: `2.5` = 2,5%). Use `0` para desativar. |
| `shippingFee` | `integer` | Frete em centavos (ex: `1500` = R$15,00). Use `0` para desativar. |

**Response:** mesmo formato do GET.

---

## 2. Categorias de Produto

### GET `/api/b2c/fees/categories`
Lista todas as categorias com suas taxas.

**Response:**
```json
[
  {
    "id": "cat_books",
    "tenantId": "ten_xyz",
    "name": "Books",
    "slug": "books",
    "chipCostPercent": 3.0,
    "shippingFee": 2000,
    "active": true
  },
  {
    "id": "cat_courses",
    "tenantId": "ten_xyz",
    "name": "Courses",
    "slug": "courses",
    "chipCostPercent": null,
    "shippingFee": null,
    "active": true
  }
]
```
> `null` = herda da taxa global do tenant.

---

### POST `/api/b2c/fees/categories`
Cria uma nova categoria.

**Body:**
```json
{
  "name": "Books",
  "slug": "books",
  "chipCostPercent": 3.0,
  "shippingFee": 2000
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | `string` | ✅ | Nome exibido (ex: "Books") |
| `slug` | `string` | ✅ | Identificador único (ex: "books") |
| `chipCostPercent` | `number \| null` | ❌ | % taxa. `null` = herda do global |
| `shippingFee` | `integer \| null` | ❌ | Frete em centavos. `null` = herda do global |

---

### PATCH `/api/b2c/fees/categories/:id`
Atualiza uma categoria existente.

**Body (todos opcionais):**
```json
{
  "name": "Books & Tabs",
  "chipCostPercent": 2.0,
  "shippingFee": null,
  "active": true
}
```
> Enviar `null` em `chipCostPercent` ou `shippingFee` remove o valor e passa a herdar do global.

---

### DELETE `/api/b2c/fees/categories/:id`
Remove uma categoria. Produtos associados ficam com `category_id = null` (herdam taxa global).

**Response:** `204 No Content`

---

### GET `/api/b2c/fees/categories/:id/products`
Lista os produtos de uma categoria. Usar para o **filtro por categoria** no painel.

**Response:**
```json
[
  {
    "id": "prod_abc",
    "name": "Florida Building Code 2023",
    "slug": "florida-building-code-2023",
    "categoryId": "cat_books",
    "requiresShipping": true,
    "chipCostOverride": null,
    "shippingFeeOverride": null,
    "prices": [...]
  }
]
```

---

## 3. Override por Produto

### PATCH `/api/b2c/fees/products/:productId`
Configura taxas específicas para um produto individual.  
Usar no modal de edição de cada produto.

**Body (todos opcionais):**
```json
{
  "categoryId": "cat_books",
  "chipCostOverride": 5.0,
  "shippingFeeOverride": 2500,
  "requiresShipping": true
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `categoryId` | `string \| null` | Associa o produto a uma categoria. `null` = sem categoria |
| `chipCostOverride` | `number \| null` | % override. `null` = remove override (herda da categoria/global) |
| `shippingFeeOverride` | `integer \| null` | Frete override em centavos. `null` = remove override |
| `requiresShipping` | `boolean` | `true` para produtos físicos (books, tabs) |

---

## 4. Calcular Custo do Pedido (Frontend do Aluno)

### POST `/api/products/:id/calculate-cost`
Retorna o breakdown completo de custo para exibir no checkout.

**Body:**
```json
{
  "priceId": "price_abc123"
}
```
> `priceId` é opcional — se não informado, usa o primeiro preço ativo.

**Response:**
```json
{
  "basePrice": 6500,
  "chipCostAmount": 162,
  "shippingFee": 1500,
  "total": 8162,
  "currency": "brl",
  "chipCostPercent": 2.5,
  "chipCostSource": "category",
  "shippingFeeSource": "global",
  "requiresShipping": true
}
```

| Campo | Descrição |
|-------|-----------|
| `basePrice` | Preço base em centavos |
| `chipCostAmount` | Valor do chip cost em centavos (`basePrice × chipCostPercent / 100`) |
| `shippingFee` | Frete em centavos (0 para produtos digitais) |
| `total` | Total final = `basePrice + chipCostAmount + shippingFee` |
| `chipCostSource` | De onde veio a taxa: `"product"` / `"category"` / `"global"` / `"none"` |
| `shippingFeeSource` | De onde veio o frete: `"product"` / `"category"` / `"global"` / `"none"` |

---

## Fluxo no Painel (Payments > Products)

### Tela de listagem de produtos
- Adicionar coluna **"Taxa"** mostrando o chip cost % efetivo
- Adicionar coluna **"Frete"** mostrando o shipping fee efetivo
- Botão **"⚙ Taxas Globais"** → abre modal com `GET/PUT /api/b2c/fees/global`
- Dropdown de filtro **"Categoria"** → chama `GET /api/b2c/fees/categories` para popular, depois `GET /api/b2c/fees/categories/:id/products` para filtrar

### Modal de edição de produto
- Select **"Categoria"** → lista de `GET /api/b2c/fees/categories`
- Toggle **"Produto físico (requer envio)"** → `requiresShipping`
- Campo **"Chip Cost Override %"** → `chipCostOverride` (deixar vazio = herda)
- Campo **"Frete Override (R$)"** → `shippingFeeOverride` (deixar vazio = herda)
- Salvar → `PATCH /api/b2c/fees/products/:productId`

### Tela de Categorias (aba ou seção dentro de Payments > Configuration)
- Listagem com `GET /api/b2c/fees/categories`
- Criar com `POST /api/b2c/fees/categories`
- Editar inline com `PATCH /api/b2c/fees/categories/:id`
- Deletar com `DELETE /api/b2c/fees/categories/:id`

---

## Conversão de Valores

Todos os valores monetários são em **centavos** (integer):

```
R$ 15,00  →  1500
R$ 2,50   →  250
R$ 65,00  →  6500
```

Para exibir no frontend:
```js
const display = (cents) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
```

Para enviar ao backend:
```js
const toCents = (reais) => Math.round(parseFloat(reais) * 100)
```
