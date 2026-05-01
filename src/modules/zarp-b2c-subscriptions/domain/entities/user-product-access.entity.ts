export interface UserProductAccess {
  id: string;
  tenant_id: string;
  user_id: string;
  product_id: string;
  product_price_id: string;
  
  // Stripe identifiers
  stripe_subscription_id?: string;
  stripe_customer_id: string;
  stripe_price_id: string;
  stripe_payment_intent_id?: string;
  
  // Access control
  access_type: string;  // subscription | lifetime | temporary
  status: string;       // active | expired | canceled | past_due
  
  // Subscription fields (for unlimited/limited)
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  trial_start?: Date;
  trial_end?: Date;
  
  // One-time payment fields
  access_granted_at: Date;
  access_expires_at?: Date;
  
  // Billing cycle tracking (for limited)
  max_billing_cycles?: number;
  completed_billing_cycles: number;
  
  // Financial
  amount: number;
  currency: string;
  
  created_at: Date;
  updated_at: Date;
}
