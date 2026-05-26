# Setup Completo de Produtos B2C

Guia passo a passo para configurar produtos B2C no sistema.

## Arquivos Gerados

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `b2c-fee-config.json` | Configuração de taxas e frete | Editar para ajustar taxas globais |
| `b2c-categories.json` | Categorias de produtos | Gerado automaticamente do CSV |
| `b2c-products.json` | Lista de produtos | Gerado automaticamente do CSV |

## Fluxo Completo

### 1. Preparar CSV

Certifique-se de que o CSV está no formato correto:

```csv
Category,Product Name,Slug,Cost Price ($),Final Price ($),Product Type,Tax,Description,Obs.
Air A,Air A Book Tabs,air-a-book-tabs,$105,$65.00,book-tabs,6.50%,,
```

**Campos importantes:**
- `Category`: Nome da categoria (ex: "Air A", "Individual Books")
- `Product Name`: Nome do produto
- `Slug`: URL-friendly identifier
- `Final Price ($)`: Preço final em dólares
- `Product Type`: Tipo do produto (ver tipos abaixo)
- `Tax`: Taxa percentual (ex: "6.50%")
- `Description`: Descrição do produto
- `Obs.`: Observações especiais

### 2. Configurar Taxas (Opcional)

Edite `scripts/b2c-fee-config.json` para ajustar taxas globais ou por tipo:

```json
{
  "globalFees": {
    "chipCostPercent": 4.5,
    "shippingFee": 1200
  },
  "categoryFees": {
    "individual-books": {
      "chipCostPercent": 6.5,
      "shippingFee": 1500
    }
  }
}
```

### 3. Converter CSV para JSON

```bash
pnpm run csv:convert
```

Este comando:
- Lê o CSV
- Aplica regras de taxas do `b2c-fee-config.json`
- Gera `b2c-categories.json` e `b2c-products.json`

**Output esperado:**
```
✅ Successfully parsed 14 categories!
✅ Successfully parsed 110 products!
📊 Statistics:
   - Total categories: 14
   - Total products: 110
   - Products with shipping: 65
   - Digital products: 45
```

### 4. Seed de Categorias

```bash
pnpm run seed:b2c:categories
```

Este comando:
- Cria/atualiza categorias no banco
- Configura taxas globais do tenant
- Vincula taxas específicas por categoria

### 5. Seed de Produtos

```bash
pnpm run seed:b2c:products
```

Este comando:
- Cria produtos no Stripe
- Cria produtos no banco vinculados às categorias
- Cria preços no Stripe e banco
- Configura billing_mode apropriado

### 6. Executar Tudo de Uma Vez

```bash
pnpm run seed:b2c:all
```

Este comando executa os 3 passos anteriores em sequência.

## Tipos de Produtos

### Produtos Físicos (com frete)

| Tipo | Descrição | Frete Padrão |
|------|-----------|--------------|
| `individual-book` | Livros individuais | $15.00 |
| `book-tabs` | Tabs para livros | $8.00 |
| `bundle-book` | Conjunto de livros | $20.00 |
| `bundle-course-book-tabs` | Curso + livros + tabs | $25.00 |
| `bundle-course-book-tabs-in-person` | Curso + livros + tabs + presencial | $25.00 |

### Produtos Digitais (sem frete)

| Tipo | Descrição | Taxa |
|------|-----------|------|
| `complete-course` | Cursos online | 0% |
| `complete-course-in-person` | Cursos presenciais | 0% |
| `practice-exam` | Exames práticos | 0% |
| `practice-exam-bundle` | Conjunto de exames | 0% |

## Billing Modes

O sistema determina automaticamente o `billing_mode` baseado no tipo:

| Billing Mode | Quando Usar | Exemplo |
|--------------|-------------|---------|
| `unlimited` | Assinaturas recorrentes ilimitadas | Cursos com mensalidade |
| `limited` | Assinaturas com N cobranças | Planos de 12 meses |
| `one_time` | Pagamento único vitalício | Livros, tabs, exames |
| `one_time_exp` | Pagamento único com expiração | Cursos com acesso de 1 ano |

## Estrutura de Dados

### Categoria

```json
{
  "name": "Air A",
  "slug": "air-a",
  "chipCostPercent": 6.5,
  "shippingFee": 800,
  "productTypes": ["book-tabs", "bundle-book", "complete-course"]
}
```

### Produto

```json
{
  "categorySlug": "air-a",
  "name": "Air A Book Tabs",
  "slug": "air-a-book-tabs",
  "priceInCents": 6500,
  "type": "book-tabs",
  "chipCostOverride": 6.5,
  "requiresShipping": true,
  "description": null,
  "notes": null
}
```

## Variáveis de Ambiente

Certifique-se de configurar no `.env`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=postgresql://...
```

## Troubleshooting

### Erro: "No active tenant found"

**Solução:** Execute o seed de tenants primeiro:
```bash
pnpm exec ts-node prisma/seeds/reserve-auth/tenants.seed.ts
```

### Erro: "STRIPE_SECRET_KEY not found"

**Solução:** Configure a chave do Stripe no `.env`:
```env
STRIPE_SECRET_KEY=sk_test_51...
```

### Erro: "Category not found"

**Solução:** Execute o seed de categorias antes do seed de produtos:
```bash
pnpm run seed:b2c:categories
pnpm run seed:b2c:products
```

### Produtos duplicados

O seed é idempotente. Produtos existentes são pulados automaticamente.

Para recriar produtos:
1. Delete produtos existentes no banco
2. Delete produtos no Stripe (opcional)
3. Execute o seed novamente

### Taxas incorretas

1. Verifique `b2c-fee-config.json`
2. Reconverta o CSV: `pnpm run csv:convert`
3. Execute o seed de categorias: `pnpm run seed:b2c:categories`

## Manutenção

### Adicionar Novos Produtos

1. Adicione linhas ao CSV
2. Execute: `pnpm run csv:convert`
3. Execute: `pnpm run seed:b2c:products`

### Atualizar Taxas Globais

1. Edite `scripts/b2c-fee-config.json`
2. Execute: `pnpm run seed:b2c:categories`

### Atualizar Preços

1. Atualize o CSV
2. Execute: `pnpm run csv:convert`
3. Delete produtos existentes (se necessário)
4. Execute: `pnpm run seed:b2c:products`

## Próximos Passos

Após o seed completo:

1. **Verificar no Stripe Dashboard**
   - Produtos criados
   - Preços configurados

2. **Testar no Admin Panel**
   - Listar produtos
   - Criar checkout
   - Processar pagamento

3. **Configurar Webhooks**
   - Stripe webhooks para sincronização
   - Eventos de pagamento

4. **Documentar API**
   - Endpoints de produtos
   - Endpoints de checkout
   - Endpoints de assinaturas

## Referências

- [Estrutura de Taxas](./B2C-FEE-STRUCTURE.md)
- [Seed de Produtos](../prisma/seeds/shared/B2C-PRODUCTS-README.md)
- [Schema Prisma](../prisma/schema.prisma)
- [Stripe Products API](https://stripe.com/docs/api/products)
