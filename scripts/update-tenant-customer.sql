-- Script para atualizar o stripe_customer_id do tenant
-- 
-- INSTRUÇÕES:
-- 1. Vá no Stripe Dashboard → Customers
-- 2. Encontre o customer que tem a subscription que você criou
-- 3. Copie o customer ID (começa com cus_)
-- 4. Substitua '<CUSTOMER_ID_CORRETO>' abaixo pelo ID copiado
-- 5. Execute este SQL no seu banco de dados

UPDATE "Tenant" 
SET stripe_customer_id = '<CUSTOMER_ID_CORRETO>'
WHERE id = 'cmodat4pt000030kg41fb255o';

-- Verificar se atualizou corretamente:
SELECT id, name, slug, stripe_customer_id 
FROM "Tenant" 
WHERE id = 'cmodat4pt000030kg41fb255o';
