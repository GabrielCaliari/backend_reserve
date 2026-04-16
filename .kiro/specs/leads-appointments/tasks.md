# Implementation Plan: Leads Appointments

## Overview

Implement the Appointments sub-domain inside the existing `ZarpLeadsModule` following the project's DDD patterns. The work proceeds in layers: Prisma schema → domain → application → infrastructure → module wiring. The `SubmitLeadUseCase` is extended (not replaced) to handle atomic booking when appointment fields are present, keeping the existing lead flow fully backward compatible.

## Tasks

- [x] 1. Extend Prisma schema with the three new appointment models
  - Add `AppointmentScheduleConfig`, `AppointmentBlockedPeriod`, and `Appointment` models to `prisma/schema.prisma` exactly as specified in the design document
  - Add the `EAppointmentStatus` enum (`confirmed`, `cancelled`, `completed`)
  - Add the `Appointment[]` relation back-reference to the existing `Lead` model
  - Add the `AppointmentScheduleConfig` and `AppointmentBlockedPeriod` relation back-references to the existing `Tenant` model
  - Run `pnpm exec prisma migrate dev --name add_appointment_models` to create the migration
  - Run `pnpm exec prisma generate` to regenerate the Prisma client
  - _Requirements: 1.1, 1.2, 4.1, 6.1, 7.1_

- [x] 2. Implement domain layer — entities, value objects, errors, and interfaces
  - [x] 2.1 Create domain errors
    - Create `src/modules/zarp-leads/domain/errors/slot-unavailable.error.ts` — plain `Error` subclass, no HTTP knowledge
    - Create `src/modules/zarp-leads/domain/errors/slot-invalid.error.ts`
    - Create `src/modules/zarp-leads/domain/errors/appointment-already-cancelled.error.ts`
    - Create `src/modules/zarp-leads/domain/errors/schedule-config-not-found.error.ts`
    - Create `src/modules/zarp-leads/domain/errors/blocked-period-not-found.error.ts`
    - Create `src/modules/zarp-leads/domain/errors/appointment-not-found.error.ts`
    - Create `src/modules/zarp-leads/domain/errors/invalid-time-range.error.ts`
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 4.3, 4.4, 5.4, 6.4, 8.4_

  - [x] 2.2 Create `TimeSlot` value object
    - Create `src/modules/zarp-leads/domain/value-objects/time-slot.vo.ts`
    - Immutable class with `startTime: string`, `endTime: string`, `date: Date`, `availableCapacity: number`, `isAvailable: boolean`
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 2.3 Create `AppointmentScheduleConfig` entity
    - Create `src/modules/zarp-leads/domain/entities/appointment-schedule-config.entity.ts`
    - Fields: `id`, `tenantId`, `workingDays: number[]`, `workStartTime`, `workEndTime`, `slotIntervalMinutes`, `capacityPerSlot`, `lunchStartTime?`, `lunchEndTime?`, `createdAt`, `updatedAt`
    - Constructor validates: `slotIntervalMinutes` in [5, 480], `workEndTime > workStartTime`, `lunchEndTime > lunchStartTime` when lunch is configured, `capacityPerSlot >= 1` — throws `InvalidTimeRangeError` on violation
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.4 Create `AppointmentBlockedPeriod` entity
    - Create `src/modules/zarp-leads/domain/entities/appointment-blocked-period.entity.ts`
    - Fields: `id`, `tenantId`, `scheduleConfigId`, `startDatetime`, `endDatetime`, `label?`, `createdAt`, `updatedAt`
    - Constructor validates `endDatetime > startDatetime`, throws `InvalidTimeRangeError` otherwise
    - _Requirements: 6.1, 6.4_

  - [x] 2.5 Create `Appointment` entity
    - Create `src/modules/zarp-leads/domain/entities/appointment.entity.ts`
    - Fields: `id`, `tenantId`, `leadId`, `scheduleConfigId`, `appointmentDate`, `slotStartTime`, `slotEndTime`, `status: EAppointmentStatus`, `selectedProduct?`, `notes?`, `createdAt`, `updatedAt`
    - Export `EAppointmentStatus` enum from this file
    - _Requirements: 4.1, 8.1_

  - [x] 2.6 Create repository interfaces with Symbol tokens
    - Create `src/modules/zarp-leads/domain/interfaces/appointment-schedule-config.repository.interface.ts` — `APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY` symbol + `IAppointmentScheduleConfigRepository` with `upsert` and `findByTenantId`
    - Create `src/modules/zarp-leads/domain/interfaces/appointment-blocked-period.repository.interface.ts` — `APPOINTMENT_BLOCKED_PERIOD_REPOSITORY` symbol + `IAppointmentBlockedPeriodRepository` with `create`, `findById`, `findActiveByTenantIdAndDate`, `findAllByTenantId`, `delete`
    - Create `src/modules/zarp-leads/domain/interfaces/appointment.repository.interface.ts` — `APPOINTMENT_REPOSITORY` symbol + `IAppointmentRepository` with `create`, `findById`, `findAllByTenantId`, `countBySlot`, `updateStatus`, `lockAndCountBySlot`
    - Export all new symbols and interfaces from `src/modules/zarp-leads/domain/interfaces/index.ts`
    - _Requirements: 1.1, 4.8, 5.1, 5.2, 7.1_

- [x] 3. Implement `SlotDerivationService` — pure domain service
  - Create `src/modules/zarp-leads/domain/services/slot-derivation.service.ts`
  - `deriveSlots(config, date, blockedPeriods, now?)` returns `TimeSlot[]`
  - Returns `[]` for past dates (calendar date comparison only)
  - Returns `[]` if `date`'s weekday is not in `config.workingDays`
  - Generates consecutive slots from `workStartTime` to `workEndTime` at `slotIntervalMinutes` intervals
  - Removes slots overlapping the lunch window when configured
  - Removes slots overlapping any blocked period
  - For today, removes slots whose start time has already passed (compared against `now`, defaulting to `new Date()`)
  - No I/O, no NestJS decorators — pure TypeScript
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [ ]* 3.1 Write property tests for `SlotDerivationService`
    - Create `src/modules/zarp-leads/domain/services/slot-derivation.service.spec.ts`
    - Use `fast-check` for all property tests; minimum 100 runs each
    - **Property 7: Slot count formula invariant** — for any valid config and future working-day date, `slots.length === floor((workingMinutes - lunchMinutes) / slotIntervalMinutes)` — **Validates: Requirements 2.1, 2.6**
    - **Property 8: No slot overlaps lunch window** — for any config with lunch, no derived slot overlaps `[lunchStartTime, lunchEndTime)` — **Validates: Requirements 2.2**
    - **Property 9: No slot overlaps blocked period** — for any set of blocked periods, no derived slot overlaps any active blocked period — **Validates: Requirements 2.3, 6.2**
    - Add example-based tests: past date returns `[]`, non-working weekday returns `[]`, today's past slots excluded
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

- [x] 4. Implement Prisma repositories
  - [x] 4.1 Create `PrismaAppointmentScheduleConfigRepository`
    - Create `src/modules/zarp-leads/infrastructure/repositories/prisma-appointment-schedule-config.repository.ts`
    - Implements `IAppointmentScheduleConfigRepository`
    - `upsert`: uses `prisma.appointmentScheduleConfig.upsert` with `where: { tenant_id }` — guarantees one record per tenant
    - `findByTenantId`: returns mapped domain entity or `null`
    - Map Prisma rows to `AppointmentScheduleConfig` domain entity in a private `toDomain()` method
    - _Requirements: 1.1, 1.2, 1.3, 7.1_

  - [ ]* 4.2 Write property test for upsert uniqueness
    - Create `src/modules/zarp-leads/infrastructure/repositories/prisma-appointment-schedule-config.repository.spec.ts`
    - **Property 1: Schedule config uniqueness per tenant** — after N upserts for the same tenant, `findByTenantId` returns exactly one record — **Validates: Requirements 1.1**
    - **Property 2: Schedule config round-trip** — upsert then read back returns all fields equal to input — **Validates: Requirements 1.2**
    - _Requirements: 1.1, 1.2_

  - [x] 4.3 Create `PrismaAppointmentBlockedPeriodRepository`
    - Create `src/modules/zarp-leads/infrastructure/repositories/prisma-appointment-blocked-period.repository.ts`
    - Implements `IAppointmentBlockedPeriodRepository`
    - `findActiveByTenantIdAndDate`: queries periods where `start_datetime <= dayEnd AND end_datetime >= dayStart`
    - `findAllByTenantId`: paginated, ordered by `start_datetime` ascending
    - Map Prisma rows to `AppointmentBlockedPeriod` domain entity
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 7.2_

  - [x] 4.4 Create `PrismaAppointmentRepository`
    - Create `src/modules/zarp-leads/infrastructure/repositories/prisma-appointment.repository.ts`
    - Implements `IAppointmentRepository`
    - `create(appointment, tx?)`: accepts optional Prisma transaction client
    - `countBySlot`: counts confirmed appointments for `(tenantId, date, slotStartTime)`
    - `lockAndCountBySlot(tenantId, date, slotStart, tx)`: inside the transaction, uses `findFirst` with `_count` or raw SQL `SELECT ... FOR UPDATE` to acquire a row-level lock before counting
    - `findAllByTenantId`: paginated, ordered by `appointment_date ASC, slot_start_time ASC`
    - `findById`: includes joined lead fields (`name`, `email`, `phone_number`) via Prisma `include`
    - `updateStatus`: updates status field, scoped by `tenantId` for isolation
    - Map Prisma rows to `Appointment` domain entity
    - _Requirements: 4.1, 4.2, 4.8, 5.1, 5.2, 5.3, 7.2, 7.4_

  - [ ]* 4.5 Write property test for cross-tenant isolation
    - Create `src/modules/zarp-leads/infrastructure/repositories/prisma-appointment.repository.spec.ts`
    - **Property 21: Tenant isolation — cross-tenant 404** — `findById` with a mismatched `tenantId` returns `null` — **Validates: Requirements 7.4**
    - _Requirements: 7.4_

- [-] 5. Implement application use cases — schedule config and slot availability
  - [x] 5.1 Create `UpsertScheduleConfigDto` and `GetSlotAvailabilityQueryDto`
    - Create `src/modules/zarp-leads/application/dtos/upsert-schedule-config.dto.ts` with `class-validator` decorators: `workingDays: number[]`, `workStartTime`, `workEndTime`, `slotIntervalMinutes`, `capacityPerSlot`, optional `lunchStartTime`, `lunchEndTime`
    - Create `src/modules/zarp-leads/application/dtos/get-slot-availability-query.dto.ts` with `date: string` (ISO date format)
    - _Requirements: 1.2, 3.1, 3.3_

  - [x] 5.2 Create `UpsertScheduleConfigUseCase`
    - Create `src/modules/zarp-leads/application/use-cases/upsert-schedule-config.use-case.ts`
    - Injects `APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY`
    - Constructs `AppointmentScheduleConfig` entity (entity constructor validates business rules, throws domain errors)
    - Calls `repository.upsert(config)` and returns the saved entity
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9_

  - [ ]* 5.3 Write property tests for `UpsertScheduleConfigUseCase`
    - Create `src/modules/zarp-leads/application/use-cases/upsert-schedule-config.use-case.spec.ts`
    - Use in-memory repository fake
    - **Property 3: Slot interval boundary validation** — any interval outside [5, 480] is rejected; inside [5, 480] is accepted — **Validates: Requirements 1.4**
    - **Property 4: Working time ordering validation** — `workEndTime <= workStartTime` is rejected — **Validates: Requirements 1.5**
    - **Property 5: Lunch time ordering validation** — `lunchEndTime <= lunchStartTime` is rejected — **Validates: Requirements 1.6**
    - **Property 6: Capacity boundary validation** — capacity < 1 is rejected — **Validates: Requirements 1.7**
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

  - [x] 5.4 Create `GetScheduleConfigUseCase`
    - Create `src/modules/zarp-leads/application/use-cases/get-schedule-config.use-case.ts`
    - Returns the config for the tenant or throws `ScheduleConfigNotFoundError`
    - _Requirements: 1.1, 7.2_

  - [x] 5.5 Create `GetSlotAvailabilityUseCase`
    - Create `src/modules/zarp-leads/application/use-cases/get-slot-availability.use-case.ts`
    - Injects all three repositories and `SlotDerivationService`
    - If no config exists, returns `[]` (200)
    - Calls `SlotDerivationService.deriveSlots(config, date, blockedPeriods)`
    - For each derived slot, calls `appointmentRepository.countBySlot` and sets `availableCapacity` and `isAvailable`
    - Returns `TimeSlot[]` with availability data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.4, 3.5_

  - [ ]* 5.6 Write property test for slot availability flag
    - Create `src/modules/zarp-leads/application/use-cases/get-slot-availability.use-case.spec.ts`
    - Use in-memory fakes
    - **Property 10: Slot availability flag correctness** — `isAvailable` is `true` iff confirmed bookings < `capacityPerSlot` — **Validates: Requirements 3.2**
    - Add example-based test: no config returns empty list with no error
    - _Requirements: 2.5, 3.2_

- [x] 6. Implement application use cases — booking and appointment lifecycle
  - [x] 6.1 Create `BookAppointmentUseCase`
    - Create `src/modules/zarp-leads/application/use-cases/book-appointment.use-case.ts`
    - Injects `APPOINTMENT_SCHEDULE_CONFIG_REPOSITORY`, `APPOINTMENT_BLOCKED_PERIOD_REPOSITORY`, `APPOINTMENT_REPOSITORY`, and `SlotDerivationService`
    - `execute(tenantId, date, time, leadId, tx)` — all DB calls use the passed transaction client
    - Validates the requested slot against `SlotDerivationService.deriveSlots` — throws `SlotInvalidError` if not found
    - Calls `appointmentRepository.lockAndCountBySlot(tenantId, date, time, tx)` — throws `SlotUnavailableError` if count >= capacity
    - Creates and returns the `Appointment` entity via `appointmentRepository.create(appointment, tx)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

  - [x] 6.2 Extend `SubmitLeadUseCase` to handle atomic booking
    - Modify `src/modules/zarp-leads/application/use-cases/submit-lead.use-case.ts`
    - Inject `BookAppointmentUseCase` and `PrismaService` (for `$transaction`)
    - If `dto.data?.appointmentDate` and `dto.data?.appointmentTime` are present, wrap lead creation and `BookAppointmentUseCase.execute` in a single `prisma.$transaction`
    - If those fields are absent, execute the existing lead creation path unchanged (full backward compatibility)
    - Return `{ leadId, appointmentId? }` — `appointmentId` is present only when a booking was made
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 6.3 Write unit tests for extended `SubmitLeadUseCase`
    - Add to or create `src/modules/zarp-leads/application/use-cases/submit-lead.use-case.spec.ts`
    - Test: lead without appointment fields processes normally and returns only `leadId` — **Validates: Requirements 4.7**
    - Test: lead with appointment fields calls `BookAppointmentUseCase` inside a transaction
    - Test: `SlotUnavailableError` from `BookAppointmentUseCase` propagates correctly
    - _Requirements: 4.7_

  - [x] 6.4 Create `ListAppointmentsQueryDto` and `CreateBlockedPeriodDto`
    - Create `src/modules/zarp-leads/application/dtos/list-appointments-query.dto.ts` with optional `page`, `limit`, `status` filter
    - Create `src/modules/zarp-leads/application/dtos/create-blocked-period.dto.ts` with `startDatetime`, `endDatetime`, `label?`
    - _Requirements: 5.1, 6.1, 6.4_

  - [x] 6.5 Create admin appointment use cases
    - Create `src/modules/zarp-leads/application/use-cases/list-appointments.use-case.ts` — paginated, ordered by `appointment_date ASC, slot_start_time ASC`, scoped to `tenantId`
    - Create `src/modules/zarp-leads/application/use-cases/get-appointment.use-case.ts` — returns appointment with linked lead fields; throws `AppointmentNotFoundError` if not found or wrong tenant
    - Create `src/modules/zarp-leads/application/use-cases/cancel-appointment.use-case.ts` — checks status is `confirmed`, throws `AppointmentAlreadyCancelledError` otherwise, then calls `updateStatus(id, cancelled)`
    - Create `src/modules/zarp-leads/application/use-cases/complete-appointment.use-case.ts` — transitions status to `completed`; throws `AppointmentAlreadyCancelledError` if already cancelled
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 8.2, 8.3, 8.4_

  - [ ]* 6.6 Write property test for cancellation
    - Create `src/modules/zarp-leads/application/use-cases/cancel-appointment.use-case.spec.ts`
    - Use in-memory fakes
    - **Property 16: Cancellation restores capacity** — after cancellation, `countBySlot` for the affected slot decreases by 1 — **Validates: Requirements 5.3, 8.2**
    - **Property 17: Cancelled appointment cannot be re-confirmed** — calling cancel on an already-cancelled appointment throws `AppointmentAlreadyCancelledError` — **Validates: Requirements 8.4**
    - _Requirements: 5.3, 5.4, 8.2, 8.4_

  - [x] 6.7 Create blocked period use cases
    - Create `src/modules/zarp-leads/application/use-cases/create-blocked-period.use-case.ts` — constructs `AppointmentBlockedPeriod` entity (entity validates end > start), persists via repository
    - Create `src/modules/zarp-leads/application/use-cases/list-blocked-periods.use-case.ts` — paginated list scoped to `tenantId`
    - Create `src/modules/zarp-leads/application/use-cases/delete-blocked-period.use-case.ts` — verifies ownership (throws `BlockedPeriodNotFoundError` if wrong tenant), then deletes
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 7.2_

- [ ] 7. Checkpoint — Ensure all domain and application layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement HTTP controllers
  - [x] 8.1 Create `PublicAppointmentController`
    - Create `src/modules/zarp-leads/infrastructure/controllers/public-appointment.controller.ts`
    - `@Controller()` with `@UseGuards(TenantKeyGuard)` and `@ApiHeader` for `X-Tenant-Key`
    - `GET /appointments/availability?date=YYYY-MM-DD` → calls `GetSlotAvailabilityUseCase`
    - Resolves `tenantId` from `request.tenantContext` (same pattern as `PublicLeadController`)
    - Catches `ScheduleConfigNotFoundError` → returns `200 { slots: [] }`
    - Catches validation errors → 400
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Create `AdminAppointmentScheduleConfigController`
    - Create `src/modules/zarp-leads/infrastructure/controllers/admin-appointment-schedule-config.controller.ts`
    - `@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)` on all routes
    - `PUT /admin/appointments/schedule-config` → `UpsertScheduleConfigUseCase` — `@Roles(EAdminRole.editor)`
    - `GET /admin/appointments/schedule-config` → `GetScheduleConfigUseCase` — `@Roles(EAdminRole.viewer)`
    - Catches `InvalidTimeRangeError` → 422 with descriptive message
    - Catches `ScheduleConfigNotFoundError` → 404
    - Resolves `tenantId` via `@GetTenantId()` decorator
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 8.3 Create `AdminAppointmentController`
    - Create `src/modules/zarp-leads/infrastructure/controllers/admin-appointment.controller.ts`
    - `@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)` on all routes
    - `GET /admin/appointments` → `ListAppointmentsUseCase` — `@Roles(EAdminRole.viewer)`
    - `GET /admin/appointments/:id` → `GetAppointmentUseCase` — `@Roles(EAdminRole.viewer)`
    - `PATCH /admin/appointments/:id/cancel` → `CancelAppointmentUseCase` — `@Roles(EAdminRole.editor)`
    - `PATCH /admin/appointments/:id/complete` → `CompleteAppointmentUseCase` — `@Roles(EAdminRole.editor)`
    - Catches `AppointmentNotFoundError` → 404
    - Catches `AppointmentAlreadyCancelledError` → 409
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.2, 8.3, 8.4_

  - [x] 8.4 Create `AdminBlockedPeriodController`
    - Create `src/modules/zarp-leads/infrastructure/controllers/admin-blocked-period.controller.ts`
    - `@UseGuards(AdminJwtGuard, TenantGuard, RolesGuard)` on all routes
    - `GET /admin/appointments/blocked-periods` → `ListBlockedPeriodsUseCase` — `@Roles(EAdminRole.viewer)`
    - `POST /admin/appointments/blocked-periods` → `CreateBlockedPeriodUseCase` — `@Roles(EAdminRole.editor)`
    - `DELETE /admin/appointments/blocked-periods/:id` → `DeleteBlockedPeriodUseCase` — `@Roles(EAdminRole.editor)`
    - Catches `InvalidTimeRangeError` → 422
    - Catches `BlockedPeriodNotFoundError` → 404
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Wire everything into `ZarpLeadsModule`
  - Modify `src/modules/zarp-leads/zarp-leads.module.ts`
  - Add new controllers to the `controllers` array: `PublicAppointmentController`, `AdminAppointmentScheduleConfigController`, `AdminAppointmentController`, `AdminBlockedPeriodController`
  - Add new repository classes to `providers`: `PrismaAppointmentScheduleConfigRepository`, `PrismaAppointmentBlockedPeriodRepository`, `PrismaAppointmentRepository`
  - Add DI token bindings for all three new repository symbols
  - Add `SlotDerivationService` to `providers` (no token needed — injected directly by class)
  - Add all new use cases to `providers`: `UpsertScheduleConfigUseCase`, `GetScheduleConfigUseCase`, `GetSlotAvailabilityUseCase`, `BookAppointmentUseCase`, `ListAppointmentsUseCase`, `GetAppointmentUseCase`, `CancelAppointmentUseCase`, `CompleteAppointmentUseCase`, `CreateBlockedPeriodUseCase`, `ListBlockedPeriodsUseCase`, `DeleteBlockedPeriodUseCase`
  - _Requirements: all_

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Run `pnpm test` and confirm all unit tests pass
  - Verify `SubmitLeadUseCase` backward compatibility: existing lead submission without appointment fields must work unchanged
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- `SlotDerivationService` has no NestJS decorators — it is a plain TypeScript class registered as a provider in the module
- The `BookAppointmentUseCase` receives the Prisma transaction client as a parameter; it does NOT open its own transaction
- `SubmitLeadUseCase` owns the transaction boundary for the atomic booking flow
- Property tests use `fast-check` with a minimum of 100 iterations per property
