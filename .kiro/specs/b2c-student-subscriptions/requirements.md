# Requirements Document

## Introduction

This document defines the requirements for the B2C Student Subscriptions feature. The feature introduces a direct-to-consumer subscription system where individual students purchase access to educational products (courses/content) via Stripe Hosted Checkout. Access is granted while a subscription is active and automatically revoked when it expires or is canceled. The system is implemented as two new bounded-context modules — `reserve-b2c-products` and `reserve-b2c-subscriptions` — following the project's DDD/`reserve-*` pattern, leaving the existing B2B `reserve-subscriptions` module untouched.

## Glossary

- **Student**: An authenticated end-user who purchases and consumes educational products.
- **Product**: An educational item (course or content bundle) represented by a `Product` record linked to a Stripe product.
- **ProductPrice**: A billing interval and amount for a Product, linked to a Stripe price.
- **UserSubscription**: A record representing a Student's active or historical subscription to a Product.
- **SubscriptionAccessGuard**: A NestJS guard that enforces subscription-based access to protected product content routes.
- **CheckoutSession**: A Stripe-hosted payment page created for a Student to complete a purchase.
- **StripeWebhookEvent**: A record used to track processed Stripe events and enforce idempotency.
- **B2CStripeWebhookController**: The NestJS controller that receives and validates Stripe webhook events for the B2C system.
- **ProcessB2CWebhookUseCase**: The use case that handles all Stripe webhook event types for the B2C system.
- **CreateCheckoutSessionUseCase**: The use case that initiates a Stripe Hosted Checkout session for a Student.
- **CancelSubscriptionUseCase**: The use case that schedules a Student's subscription for cancellation at period end.
- **ListMySubscriptionsUseCase**: The use case that returns all subscriptions for the authenticated Student.
- **ListProductsUseCase**: The use case that returns all active Products with their active prices.
- **GetProductUseCase**: The use case that returns a single Product by slug.
- **StripeProvider**: The shared infrastructure provider wrapping the Stripe SDK.
- **UserJwtGuard**: The shared NestJS guard that validates the student's JWT and sets `req.user_id`.
- **EUserSubscriptionStatus**: Enum of subscription statuses: `active`, `trialing`, `past_due`, `canceled`, `incomplete`, `unpaid`.

---

## Requirements

### Requirement 1: Product Catalog

**User Story:** As a Student, I want to browse available educational products and their pricing, so that I can choose what to purchase.

#### Acceptance Criteria

1. WHEN a request is made to `GET /products`, THE `ListProductsUseCase` SHALL return only Products where `active = true`, each including their active `ProductPrice` records.
2. WHEN a request is made to `GET /products/:slug` with a valid slug, THE `GetProductUseCase` SHALL return the matching Product with its active `ProductPrice` records.
3. WHEN a request is made to `GET /products/:slug` with a slug that does not match any Product, THE `GetProductUseCase` SHALL return a `404 Not Found` response.
4. THE `GET /products` and `GET /products/:slug` endpoints SHALL be publicly accessible without authentication.

---

### Requirement 2: Checkout Initiation

**User Story:** As a Student, I want to start a Stripe Hosted Checkout session for a product, so that I can pay and gain access.

#### Acceptance Criteria

1. WHEN an authenticated Student submits `POST /subscriptions/checkout` with a valid `priceId`, THE `CreateCheckoutSessionUseCase` SHALL return a `checkoutUrl` pointing to a Stripe Hosted Checkout page.
2. WHEN `CreateCheckoutSessionUseCase` is executed and the Student has no `stripe_customer_id`, THE `CreateCheckoutSessionUseCase` SHALL create a Stripe customer and persist the resulting `stripe_customer_id` on the `User` record.
3. WHEN `CreateCheckoutSessionUseCase` is executed and the Student already has a `stripe_customer_id`, THE `CreateCheckoutSessionUseCase` SHALL reuse the existing `stripe_customer_id` without creating a duplicate Stripe customer.
4. WHEN an authenticated Student submits `POST /subscriptions/checkout` for a Product to which the Student already has an active `UserSubscription`, THE `CreateCheckoutSessionUseCase` SHALL return a `409 Conflict` response.
5. WHEN an authenticated Student submits `POST /subscriptions/checkout` with a `priceId` that does not exist or belongs to an inactive `ProductPrice`, THE `CreateCheckoutSessionUseCase` SHALL return a `404 Not Found` response.
6. WHEN `CreateCheckoutSessionUseCase` encounters a Stripe API failure, THE `CreateCheckoutSessionUseCase` SHALL return a `502 Bad Gateway` response.
7. THE `POST /subscriptions/checkout` endpoint SHALL require a valid JWT validated by `UserJwtGuard`.

---

### Requirement 3: Webhook Processing

**User Story:** As the system, I want to process Stripe webhook events reliably and idempotently, so that subscription state is always consistent with Stripe.

#### Acceptance Criteria

1. WHEN the `B2CStripeWebhookController` receives a `POST /webhooks/b2c/stripe` request, THE `B2CStripeWebhookController` SHALL validate the `stripe-signature` header using HMAC before passing the event to `ProcessB2CWebhookUseCase`.
2. WHEN the `stripe-signature` header is missing or invalid, THE `B2CStripeWebhookController` SHALL return a `400 Bad Request` response without processing the event.
3. WHEN `ProcessB2CWebhookUseCase` receives a `checkout.session.completed` event, THE `ProcessB2CWebhookUseCase` SHALL create a `UserSubscription` record with `status = active` and persist `User.stripe_customer_id` if not already set.
4. WHEN `ProcessB2CWebhookUseCase` receives a `customer.subscription.updated` event, THE `ProcessB2CWebhookUseCase` SHALL update the matching `UserSubscription` with the new `status`, `current_period_end`, and `cancel_at_period_end` values from the event.
5. WHEN `ProcessB2CWebhookUseCase` receives a `customer.subscription.deleted` event, THE `ProcessB2CWebhookUseCase` SHALL update the matching `UserSubscription` to `status = canceled` and set `canceled_at` to the current timestamp.
6. WHEN `ProcessB2CWebhookUseCase` receives an `invoice.paid` event, THE `ProcessB2CWebhookUseCase` SHALL update the matching `UserSubscription` `current_period_end` and set `status = active`.
7. WHEN `ProcessB2CWebhookUseCase` receives an `invoice.payment_failed` event, THE `ProcessB2CWebhookUseCase` SHALL update the matching `UserSubscription` to `status = past_due`.
8. WHEN `ProcessB2CWebhookUseCase` receives an event whose `stripe_event_id` already exists in `StripeWebhookEvent`, THE `ProcessB2CWebhookUseCase` SHALL perform no database writes and return successfully (idempotency).
9. WHEN `ProcessB2CWebhookUseCase` processes a new event, THE `ProcessB2CWebhookUseCase` SHALL persist a `StripeWebhookEvent` record before executing the event-specific handler.
10. WHEN the `checkout.session.completed` event metadata is missing `userId`, `productId`, or `priceId`, THE `ProcessB2CWebhookUseCase` SHALL log the error and return a `400 Bad Request` response so Stripe can retry.

---

### Requirement 4: Content Access Control

**User Story:** As a Student, I want protected product content to be accessible only while my subscription is active, so that access is automatically enforced.

#### Acceptance Criteria

1. WHEN a Student requests `GET /products/:slug/content` and has a `UserSubscription` where `status IN ('active', 'trialing')` AND `current_period_end >= NOW()`, THE `SubscriptionAccessGuard` SHALL allow the request to proceed.
2. WHEN a Student requests `GET /products/:slug/content` and has no `UserSubscription` satisfying the active access predicate, THE `SubscriptionAccessGuard` SHALL throw a `403 Forbidden` response.
3. WHEN a Student's `UserSubscription` has `cancel_at_period_end = true`, `status = active`, and `current_period_end >= NOW()`, THE `SubscriptionAccessGuard` SHALL allow the request to proceed (access is preserved until the period ends).
4. WHEN a request reaches `GET /products/:slug/content` without a valid JWT, THE `UserJwtGuard` SHALL return a `401 Unauthorized` response before `SubscriptionAccessGuard` is evaluated.
5. THE `SubscriptionAccessGuard` SHALL enforce access server-side on every request; frontend UI state SHALL NOT be the sole access control mechanism.

---

### Requirement 5: Subscription Cancellation

**User Story:** As a Student, I want to cancel my subscription, so that I am not charged after the current billing period.

#### Acceptance Criteria

1. WHEN an authenticated Student submits `POST /subscriptions/:id/cancel` for a subscription that belongs to the Student and has `status IN ('active', 'trialing')`, THE `CancelSubscriptionUseCase` SHALL call the Stripe API to set `cancel_at_period_end = true` and update the local `UserSubscription.cancel_at_period_end = true`.
2. WHEN `CancelSubscriptionUseCase` is executed, THE Student SHALL retain access to the product until `current_period_end`.
3. WHEN an authenticated Student submits `POST /subscriptions/:id/cancel` for a subscription that does not exist or does not belong to the Student, THE `CancelSubscriptionUseCase` SHALL return a `404 Not Found` response.
4. WHEN an authenticated Student submits `POST /subscriptions/:id/cancel` for a subscription that is already canceled, THE `CancelSubscriptionUseCase` SHALL return a `400 Bad Request` response.
5. THE `POST /subscriptions/:id/cancel` endpoint SHALL require a valid JWT validated by `UserJwtGuard`.

---

### Requirement 6: Subscription Listing

**User Story:** As a Student, I want to view all my subscriptions, so that I can track my active and past purchases.

#### Acceptance Criteria

1. WHEN an authenticated Student requests `GET /subscriptions/my`, THE `ListMySubscriptionsUseCase` SHALL return all `UserSubscription` records belonging to that Student.
2. THE `GET /subscriptions/my` endpoint SHALL require a valid JWT validated by `UserJwtGuard`.

---

### Requirement 7: Subscription Access Entity Logic

**User Story:** As the system, I want a reliable domain-level method to determine whether a subscription grants access, so that access logic is consistent across all use cases and guards.

#### Acceptance Criteria

1. WHEN `UserSubscriptionEntity.isActive()` is called on a subscription with `status IN ('active', 'trialing')` AND `current_period_end >= NOW()`, THE `UserSubscriptionEntity` SHALL return `true`.
2. WHEN `UserSubscriptionEntity.isActive()` is called on a subscription where `status NOT IN ('active', 'trialing')` OR `current_period_end < NOW()`, THE `UserSubscriptionEntity` SHALL return `false`.
3. WHEN `UserSubscriptionEntity.isActive()` is called on a subscription with `cancel_at_period_end = true`, `status = active`, and `current_period_end >= NOW()`, THE `UserSubscriptionEntity` SHALL return `true`.

---

### Requirement 8: Data Persistence and Schema

**User Story:** As the system, I want the database schema to support all B2C subscription data, so that product, pricing, and subscription state are reliably stored.

#### Acceptance Criteria

1. THE system SHALL persist `Product` records with fields: `id`, `stripe_product_id`, `name`, `description`, `slug`, `active`, `created_at`, `updated_at`.
2. THE system SHALL persist `ProductPrice` records with fields: `id`, `stripe_price_id`, `product_id`, `interval`, `interval_count`, `unit_amount`, `currency`, `active`, `created_at`, `updated_at`.
3. THE system SHALL persist `UserSubscription` records with fields: `id`, `user_id`, `product_id`, `product_price_id`, `stripe_subscription_id`, `stripe_customer_id`, `stripe_price_id`, `status`, `current_period_start`, `current_period_end`, `trial_start`, `trial_end`, `canceled_at`, `cancel_at_period_end`, `amount`, `currency`, `created_at`, `updated_at`.
4. THE `User` model SHALL include a nullable `stripe_customer_id` field with a unique constraint.
5. THE `UserSubscription` table SHALL have a composite index on `(user_id, status)` and a unique index on `stripe_subscription_id` to support efficient access guard and webhook lookup queries.
