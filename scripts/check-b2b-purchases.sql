SELECT 
  p.id,
  p.tenant_id,
  p.status,
  p.customer_email,
  p.customer_name,
  p.amount,
  p.currency,
  p.stripe_checkout_id,
  p.stripe_payment_intent,
  p.checkout_started_at,
  p.checkout_completed_at,
  pr.name AS product_name,
  p.created_at
FROM b2b_purchases p
LEFT JOIN b2b_products pr ON p.product_id = pr.id
ORDER BY p.created_at DESC
LIMIT 20;
