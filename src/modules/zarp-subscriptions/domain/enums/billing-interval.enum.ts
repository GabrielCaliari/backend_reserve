export enum EBillingInterval {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMIANNUAL = 'semiannual',
  ANNUAL = 'annual',
}

export enum EBillingCollectionMode {
  /** Full period charged at once (e.g. R$479 for annual plan) */
  UPFRONT = 'upfront',
  /** Monthly installments with discount (e.g. R$39.92/mo × 12) */
  INSTALLMENTS = 'installments',
}

/** Months per interval */
export const BILLING_INTERVAL_MONTHS: Record<EBillingInterval, number> = {
  [EBillingInterval.MONTHLY]: 1,
  [EBillingInterval.QUARTERLY]: 3,
  [EBillingInterval.SEMIANNUAL]: 6,
  [EBillingInterval.ANNUAL]: 12,
};
