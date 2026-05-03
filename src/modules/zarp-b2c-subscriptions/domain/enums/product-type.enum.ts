export enum EBillingMode {
  UNLIMITED = 'unlimited',           // Recorrente ilimitado
  LIMITED = 'limited',               // Recorrente limitado (N cobranças)
  ONE_TIME = 'one_time',             // Pagamento único vitalício
  ONE_TIME_EXP = 'one_time_exp',     // Pagamento único com expiração
}

export enum EAccessType {
  SUBSCRIPTION = 'subscription',     // Acesso via subscription (unlimited/limited)
  LIFETIME = 'lifetime',             // Acesso vitalício (one_time)
  TEMPORARY = 'temporary',           // Acesso temporário (one_time_exp)
}
