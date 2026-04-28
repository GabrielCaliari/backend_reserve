-- Query para verificar a configuração do Stripe do tenant
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  t.stripe_customer_id,
  tbc.stripe_publishable_key,
  CASE 
    WHEN tbc.stripe_secret_key_hash IS NOT NULL THEN 'CONFIGURADO'
    ELSE 'NÃO CONFIGURADO'
  END as stripe_secret_status
FROM "Tenant" t
LEFT JOIN "TenantBillingConfig" tbc ON tbc.tenant_id = t.id
WHERE t.id = 'cmodat4pt000030kg41fb255o';
