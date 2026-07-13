/**
 * Controllers whose success responses are not yet typed in the OpenAPI
 * document. Every entry here is dividend, not a TODO: the codegen (Fase 4)
 * gets `any` for these until they are typed and removed from this list.
 *
 * RULE: this list only shrinks. Adding a new controller with an untyped
 * response is not allowed — type it before merging. Removing an entry means
 * that controller now has at least one @Api(Ok|Created)Response with a
 * concrete `type`/`schema` on every handler that returns JSON.
 *
 * reserve-notifications is deliberately ABSENT — it was the first module
 * fully typed by this phase (Task 21) and acts as the worked example, along
 * with the tenant-capabilities and reserve-settings controllers (Tasks 18/20).
 *
 * This is the actual repo audit taken at the time Task 21 landed (ago/2026) —
 * it may differ from earlier drafts of this plan if controllers were added,
 * renamed or migrated in the meantime.
 */
export const UNTYPED_RESPONSE_CONTROLLERS = [
  'app.controller.ts',
  'modules/reserve-auth/infrastructure/controllers/admin.controller.ts',
  'modules/reserve-auth/infrastructure/controllers/admin-email.controller.ts',
  'modules/reserve-auth/infrastructure/controllers/admin-post.controller.ts',
  'modules/reserve-auth/infrastructure/controllers/admin-user.controller.ts',
  'modules/reserve-auth/infrastructure/controllers/tenant.controller.ts',
  'modules/reserve-auth/infrastructure/controllers/user.controller.ts',
  'modules/reserve-b2b-payments/infrastructure/controllers/admin-b2b-fees.controller.ts',
  'modules/reserve-b2b-payments/infrastructure/controllers/b2b-payments.controller.ts',
  'modules/reserve-b2b-payments/infrastructure/controllers/b2b-webhook.controller.ts',
  'modules/reserve-b2b-payments/infrastructure/controllers/public-b2b-products.controller.ts',
  'modules/reserve-b2c-products/infrastructure/controllers/admin-fee-config.controller.ts',
  'modules/reserve-b2c-products/infrastructure/controllers/admin-products.controller.ts',
  'modules/reserve-b2c-products/infrastructure/controllers/products.controller.ts',
  'modules/reserve-b2c-products/infrastructure/controllers/public-b2c-products.controller.ts',
  'modules/reserve-b2c-products/infrastructure/controllers/public-unified-checkout.controller.ts',
  'modules/reserve-b2c-subscriptions/infrastructure/controllers/b2c-stripe-webhook.controller.ts',
  'modules/reserve-b2c-subscriptions/infrastructure/controllers/b2c-subscriptions.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/admin-hotel-client.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/admin-hotel-metrics.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/admin-reservations.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/booking-webhook.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/client-portal.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/guest-crm.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/report.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/whatsapp.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/whatsapp-redirect.controller.ts',
  'modules/reserve-client-portal/infrastructure/controllers/whatsapp-tracking.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/article.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/article-image.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/blog.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/media-asset.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/media-collection.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/media-relation.controller.ts',
  'modules/reserve-cms/infrastructure/controllers/public-blog.controller.ts',
  'modules/reserve-coupons/infrastructure/controllers/admin-coupons.controller.ts',
  'modules/reserve-coupons/infrastructure/controllers/public-coupons.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/admin-appointment.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/admin-appointment-schedule-config.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/admin-blocked-period.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/lead.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/lead-capture.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/lead-collection.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/public-appointment.controller.ts',
  'modules/reserve-leads/infrastructure/controllers/public-lead.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/config.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/email-campaign.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/email-campaign-batch.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/event-notification.controller.ts',
  'modules/reserve-mailer/infrastructure/controllers/lead.controller.ts',
  'modules/reserve-reports/infrastructure/controllers/analytics-report.controller.ts',
  'modules/reserve-reports/infrastructure/controllers/public-analytics-report.controller.ts',
  'modules/reserve-stats/infrastructure/controllers/stats-dashboard.controller.ts',
  'modules/reserve-stats/infrastructure/controllers/stats-integration.controller.ts',
  'modules/reserve-subscriptions/infrastructure/controllers/stripe-plans.controller.ts',
  'modules/reserve-subscriptions/infrastructure/controllers/stripe-webhook.controller.ts',
  'modules/reserve-subscriptions/infrastructure/controllers/subscriptions.controller.ts',
  'modules/reserve-subscriptions/infrastructure/controllers/tenant-billing-config.controller.ts',
  'modules/reserve-unified-webhooks/infrastructure/controllers/unified-stripe-webhook.controller.ts',
] as const;
