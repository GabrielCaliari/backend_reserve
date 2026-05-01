# Guia do Painel Admin - Criar Produtos B2C

## 🔍 B2B vs B2C - Qual a Diferença?

| Aspecto | B2B (Pagamentos Avulsos) | B2C (Assinaturas) |
|---------|--------------------------|-------------------|
| **Público** | Empresas/Clientes corporativos | Estudantes/Usuários finais |
| **Tipo** | Pagamento único (one-time) | Recorrente OU único |
| **Endpoint** | `POST /api/b2b/payments/products` | `POST /api/b2c/products` |
| **Vinculação User** | ✅ Já vincula (campo `user_id`) | ✅ Sempre vincula |
| **Mudanças Recentes** | ❌ Nenhuma | ✅ Refatorado (4 modos) |
| **Status** | ✅ Funcionando | ⚠️ Precisa atualização |

**Resumo**: B2B já está pronto e não mudou. B2C foi refatorado e precisa de atualização.

---

## ⚠️ IMPORTANTE: DTO Atual NÃO Suporta Novos Modos

O endpoint atual `POST /api/b2c/products` **só cria produtos recorrentes ilimitados**.

Para suportar os 4 modos de cobrança, o DTO precisa ser atualizado.

---

## 📋 DTO Atual (Apenas Recorrente Ilimitado)

```typescript
POST /api/b2c/products
Headers: {
  "Authorization": "Bearer <admin_token>",
  "x-tenant-id": "<tenant_id>"
}

Body: {
  "name": "Curso de JavaScript",
  "description": "Do zero ao avançado",
  "slug": "javascript-avancado",
  "interval": "month",        // month | year | week | quarter
  "intervalCount": 1,
  "unitAmount": 4990,         // centavos (R$ 49,90)
  "currency": "brl"           // opcional, padrão: brl
}
```

**Limitação**: Sempre cria como `billing_mode: "unlimited"` (recorrente ilimitado).

---

## 🎯 DTO Necessário (4 Modos de Cobrança)

Para suportar todos os modos, o painel precisa enviar:

```typescript
POST /api/b2c/products
Body: {
  "name": "Curso de JavaScript",
  "description": "Do zero ao avançado",
  "slug": "javascript-avancado",
  
  // NOVO: Nome do preço (exibido no checkout)
  "priceName": "Mensal",
  
  // NOVO: Modo de cobrança
  "billingMode": "unlimited",  // unlimited | limited | one_time | one_time_exp
  
  // Para unlimited e limited
  "interval": "month",         // month | year | week (null para one_time)
  "intervalCount": 1,
  
  // Para limited: quantas cobranças antes de cancelar
  "maxBillingCycles": 12,      // opcional, só para limited
  
  // Para one_time_exp: quantos dias de acesso
  "accessDurationDays": 30,    // opcional, só para one_time_exp
  
  "unitAmount": 4990,
  "currency": "brl"
}
```

---

## 📊 Exemplos por Modo

### 1. Recorrente Ilimitado (unlimited)
```json
{
  "name": "Curso React",
  "slug": "react-avancado",
  "priceName": "Mensal",
  "billingMode": "unlimited",
  "interval": "month",
  "intervalCount": 1,
  "unitAmount": 4990
}
```
✅ **Funciona com DTO atual** (padrão)

---

### 2. Recorrente Limitado (limited)
```json
{
  "name": "Curso React",
  "slug": "react-avancado",
  "priceName": "12 Meses",
  "billingMode": "limited",
  "interval": "month",
  "intervalCount": 1,
  "maxBillingCycles": 12,
  "unitAmount": 4990
}
```
❌ **NÃO funciona** - precisa atualizar DTO

---

### 3. Pagamento Único Vitalício (one_time)
```json
{
  "name": "Curso React",
  "slug": "react-avancado",
  "priceName": "Vitalício",
  "billingMode": "one_time",
  "interval": null,
  "unitAmount": 49990
}
```
❌ **NÃO funciona** - precisa atualizar DTO

---

### 4. Pagamento Único com Expiração (one_time_exp)
```json
{
  "name": "Curso React",
  "slug": "react-avancado",
  "priceName": "30 Dias",
  "billingMode": "one_time_exp",
  "interval": null,
  "accessDurationDays": 30,
  "unitAmount": 1990
}
```
❌ **NÃO funciona** - precisa atualizar DTO

---

## 🔧 O Que Precisa Ser Feito

### Backend (Este Projeto)
1. ✅ Schema atualizado (já feito)
2. ✅ Migration criada (já feito)
3. ❌ **DTO precisa ser atualizado** (`CreateB2CProductDTO`)
4. ❌ **Use case precisa ser atualizado** (`CreateB2CProductUseCase`)
5. ❌ **Stripe provider precisa criar prices com `mode: payment`** para one_time

### Painel Admin (Frontend)
1. ❌ Adicionar campo "Modo de Cobrança" (select)
2. ❌ Adicionar campo "Nome do Preço" (input)
3. ❌ Mostrar/ocultar campos condicionalmente:
   - `interval` e `intervalCount`: só para unlimited/limited
   - `maxBillingCycles`: só para limited
   - `accessDurationDays`: só para one_time_exp
4. ❌ Atualizar validação do formulário

---

## 🎨 UI Sugerida para o Painel

```tsx
// Formulário de Criar Produto
<Form>
  <Input label="Nome do Produto" name="name" required />
  <Textarea label="Descrição" name="description" />
  <Input label="Slug" name="slug" required />
  
  {/* NOVO */}
  <Select label="Modo de Cobrança" name="billingMode" required>
    <option value="unlimited">Recorrente Ilimitado</option>
    <option value="limited">Recorrente Limitado (N cobranças)</option>
    <option value="one_time">Pagamento Único Vitalício</option>
    <option value="one_time_exp">Pagamento Único com Expiração</option>
  </Select>
  
  {/* NOVO */}
  <Input label="Nome do Preço" name="priceName" required 
         placeholder="Ex: Mensal, Anual, Vitalício" />
  
  {/* Mostrar só se unlimited ou limited */}
  {(billingMode === 'unlimited' || billingMode === 'limited') && (
    <>
      <Select label="Intervalo" name="interval" required>
        <option value="month">Mensal</option>
        <option value="year">Anual</option>
        <option value="week">Semanal</option>
        <option value="quarter">Trimestral</option>
      </Select>
      <Input label="Quantidade de Intervalos" name="intervalCount" type="number" />
    </>
  )}
  
  {/* Mostrar só se limited */}
  {billingMode === 'limited' && (
    <Input label="Máximo de Cobranças" name="maxBillingCycles" type="number" required 
           placeholder="Ex: 12 para 12 meses" />
  )}
  
  {/* Mostrar só se one_time_exp */}
  {billingMode === 'one_time_exp' && (
    <Input label="Dias de Acesso" name="accessDurationDays" type="number" required 
           placeholder="Ex: 30 para 30 dias" />
  )}
  
  <Input label="Preço (centavos)" name="unitAmount" type="number" required 
         placeholder="Ex: 4990 = R$ 49,90" />
  
  <Select label="Moeda" name="currency">
    <option value="brl">BRL (Real)</option>
    <option value="usd">USD (Dólar)</option>
  </Select>
  
  <Button type="submit">Criar Produto</Button>
</Form>
```

---

## 🚨 Status Atual

| Componente | Status | Ação Necessária |
|------------|--------|-----------------|
| **Schema Prisma** | ✅ Pronto | Nenhuma |
| **Migration** | ✅ Aplicada | Nenhuma |
| **DTO Backend** | ❌ Desatualizado | Adicionar novos campos |
| **Use Case Backend** | ❌ Desatualizado | Suportar 4 modos |
| **Stripe Provider** | ❌ Incompleto | Criar prices com `mode: payment` |
| **Painel Admin** | ❌ Desatualizado | Adicionar novos campos no form |

---

## 📞 Próximos Passos

1. **Backend**: Atualizar DTO e use case (este projeto)
2. **Painel**: Atualizar formulário de criar produto
3. **Testar**: Criar produtos nos 4 modos e verificar Stripe

---

**Última atualização**: 01/05/2026
