# 🔧 Fix: Subscription não aparece no painel

## 📋 Problema

Você criou uma subscription no Stripe Dashboard, ela aparece lá, mas não aparece no seu painel. Os logs mostram:

```
No subscriptions found for customer cus_UPkdZdYclJA5Qa
```

## 🎯 Causa

O tenant no banco de dados está configurado com um `stripe_customer_id` diferente do customer que realmente tem a subscription no Stripe.

## ✅ Solução

### Passo 1: Encontrar o Customer ID correto

1. Abra o **Stripe Dashboard**
2. Vá em **Customers** (menu lateral)
3. Encontre o customer que tem a subscription que você acabou de criar
4. Clique no customer
5. Copie o **Customer ID** (começa com `cus_`, exemplo: `cus_ABC123xyz`)

### Passo 2: Atualizar o banco de dados

Execute este SQL no seu banco de dados (substitua `<CUSTOMER_ID_CORRETO>` pelo ID que você copiou):

```sql
UPDATE "Tenant" 
SET stripe_customer_id = '<CUSTOMER_ID_CORRETO>'
WHERE id = 'cmodat4pt000030kg41fb255o';
```

**Exemplo:**
```sql
UPDATE "Tenant" 
SET stripe_customer_id = 'cus_ABC123xyz'
WHERE id = 'cmodat4pt000030kg41fb255o';
```

### Passo 3: Verificar

1. Recarregue a página do painel
2. A subscription deve aparecer agora!

## 🔍 Como executar o SQL

### Opção 1: Prisma Studio
```bash
pnpm exec prisma studio
```
- Abra a tabela `Tenant`
- Encontre o tenant `cmodat4pt000030kg41fb255o`
- Edite o campo `stripe_customer_id`
- Salve

### Opção 2: psql (PostgreSQL CLI)
```bash
psql $DATABASE_URL
```
Depois execute o UPDATE acima.

### Opção 3: DBeaver / pgAdmin
Use qualquer cliente SQL que você preferir.

## 📝 Verificação

Após atualizar, verifique se está correto:

```sql
SELECT id, name, slug, stripe_customer_id 
FROM "Tenant" 
WHERE id = 'cmodat4pt000030kg41fb255o';
```

O `stripe_customer_id` deve ser o mesmo que você viu no Stripe Dashboard.

## 🎉 Pronto!

Agora quando você recarregar o painel, a subscription deve aparecer corretamente!

## 🤔 Por que isso aconteceu?

Quando você cria uma subscription manualmente no Stripe Dashboard, você escolhe (ou o Stripe cria) um customer. Se esse customer for diferente do que está salvo no banco de dados do tenant, o backend não vai encontrar a subscription.

A solução é garantir que o `stripe_customer_id` no banco seja o mesmo customer que tem as subscriptions no Stripe.
