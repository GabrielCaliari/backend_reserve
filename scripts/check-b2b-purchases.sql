SELECT id, tenant_id, stripe_checkout_id, status, customer_email, amount, created_at
FROM b2b_purchases
ORDER BY created_at DESC
LIMIT 20;

SELECT COUNT(*) as total FROM b2b_purchases;
