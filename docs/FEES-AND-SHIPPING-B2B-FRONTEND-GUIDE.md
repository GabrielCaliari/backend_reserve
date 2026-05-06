# Guia de Integração — Taxas e Frete B2B (Frontend)

## Visão Geral

O sistema de taxas B2B funciona **exatamente igual ao B2C** em termos de lógica e prioridade:

```
1. Override do produto  →  chip_cost_override / shipping_fee_override
2. Taxa da categoria    →  chip_cost_percent / shipping_fee
3. Taxa global          →  B2CFeeConfig (chip_cost_percent / shipping_fee)
```

> **Importante:** Categorias e taxa global são **compartilhadas** entre B2B e B2C.
> Uma categoria "Books" criada em `/api/b2c/fees/categories` aparece nos dois.
> Você não precisa criar categorias separadas para B2B.

---

## O que já existe no B2B (não precisa criar)

Os endpoints de **taxa global** e **gerenciamento de categorias** são os mesmos do B2C:

| Ação | Endpoint (já existe) |
|------|----------------------|
| Ver/salvar taxa global | `GET/PUT /api/b2c/fees/global` |
| Listar categorias | `GET /api/b2c/fees/categories` |
| Criar categoria | `POST /api/b2c/fees/categories` |
| Editar categoria | `PATCH /api/b2c/fees/categories/:id` |
| Deletar categoria | `DELETE /api/b2c/fees/categories/:id` |

Esses endpoints já servem para B2B também. **Não duplicar.**

---

## O que é exclusivo do B2B

Base URL: `/api/b2b/fees`
Auth: `Bearer <admin_token>` + header `x-tenant-id`

---

### 1. Listar produtos B2B de uma categoria (filtro)

**GET `/api/b2b/fees/categories/:categoryId/products`**

Retorna todos os produtos B2B associados a uma categoria. Usar no filtro da listagem de produtos B2B.

**Response:**
```json
[
  {
    "id": "prod_b2b_abc",
    "tenantId": "ten_xyz",
    "name": "Florida Building Code 2023",
    "description": "...",
    "categories": ["books"],
    "price": 6500,
    "currency": "brl",
    "active": true,
    "categoryId": "cat_books",
    "chipCostOverride": null,
    "shippingFeeOverride": null,
    "requiresShipping": true
  }
]
```

---

### 2. Configurar taxas de um produto B2B específico

**PATCH `/api/b2b/fees/products/:productId`**

Define categoria, chip cost override e/ou shipping fee override para um produto B2B individual.
Usar no modal de edição de cada produto B2B.

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

**Response:** produto B2B atualizado com os novos campos.

---

### 3. Calcular custo total de um produto B2B

**POST `/api/b2b/fees/products/:productId/calculate-cost`**

Retorna o breakdown completo de custo. Usar para exibir no checkout ou na listagem.

**Body:** vazio `{}`

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

## Fluxo no Painel (Payments > Products > One-time)

### Tela de listagem de produtos B2B

Adicionar as mesmas colunas que no B2C:

- Coluna **"Taxa"** — chip cost % efetivo (buscar via `calculate-cost` ou exibir `chipCostOverride ?? "herda"`)
- Coluna **"Frete"** — shipping fee efetivo
- Coluna **"Físico"** — ícone/badge se `requiresShipping = true`
- Dropdown de filtro **"Categoria"** → popula com `GET /api/b2c/fees/categories` (mesmo endpoint do B2C), filtra com `GET /api/b2b/fees/categories/:id/products`

> O botão **"⚙ Taxas Globais"** e a gestão de categorias são os **mesmos componentes** do B2C — reutilizar.

---

### Modal de edição de produto B2B

Adicionar seção **"Taxas & Envio"** com os mesmos campos do B2C:

```
[ Select: Categoria ]          ← GET /api/b2c/fees/categories
[ Toggle: Produto físico ]     ← requiresShipping
[ Input: Chip Cost Override % ]← chipCostOverride (vazio = herda)
[ Input: Frete Override R$ ]   ← shippingFeeOverride (vazio = herda)
[ Botão: Salvar ]              ← PATCH /api/b2b/fees/products/:id
```

Exibir abaixo dos campos o breakdown calculado em tempo real:
```
Base: R$ 65,00
+ Chip Cost (2,5%): R$ 1,62
+ Frete: R$ 15,00
= Total: R$ 81,62
```
Buscar via `POST /api/b2b/fees/products/:id/calculate-cost`.

---

## Diferenças B2B vs B2C no Frontend

| Aspecto | B2C | B2B |
|---------|-----|-----|
| Taxa global | `GET/PUT /api/b2c/fees/global` | **Mesmo endpoint** |
| Categorias | `GET/POST /api/b2c/fees/categories` | **Mesmo endpoint** |
| Override por produto | `PATCH /api/b2c/fees/products/:id` | `PATCH /api/b2b/fees/products/:id` |
| Calcular custo | `POST /api/products/:id/calculate-cost` | `POST /api/b2b/fees/products/:id/calculate-cost` |
| Filtro por categoria | `GET /api/b2c/fees/categories/:id/products` | `GET /api/b2b/fees/categories/:id/products` |
| Preço do produto | `prices[].unitAmount` (array de preços) | `price` (campo direto) |

---

## Conversão de Valores

Igual ao B2C — todos os valores monetários em **centavos**:

```js
// Exibir
const display = (cents) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`

// Enviar ao backend
const toCents = (reais) => Math.round(parseFloat(reais) * 100)
```
