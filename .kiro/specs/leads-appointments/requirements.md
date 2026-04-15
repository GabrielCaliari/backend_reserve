# Requirements Document

## Introduction

This feature adds an Appointments management system to the ZARP admin panel as a new section within the Leads module. It enables tenant admins to configure their own scheduling rules (working hours, slot intervals, lunch breaks, capacity per slot, blocked dates) and allows the public-facing site to query available slots and book appointments atomically — preventing overbooking. The system is fully multi-tenant: each tenant owns its own schedule configuration independently.

Currently, appointment data arrives as unstructured JSON inside the `data` field of a lead submission. This feature introduces first-class appointment entities with slot availability enforcement, replacing the current overbooking-prone approach.

## Glossary

- **Appointment_System**: The NestJS bounded context responsible for all appointment scheduling logic within the `zarp-leads` module.
- **Schedule_Config**: A tenant-scoped configuration record defining working hours, slot interval, lunch break, and capacity per slot.
- **Slot**: A discrete time window derived from a Schedule_Config (e.g., 09:00–09:30) on a specific date.
- **Slot_Capacity**: The maximum number of concurrent bookings allowed within a single Slot.
- **Appointment**: A confirmed booking linking a Lead to a specific Slot on a specific date.
- **Blocked_Period**: A tenant-defined date or time range during which no Slots are available.
- **Tenant**: An organization account in the multi-tenant ZARP platform, identified by `tenant_id`.
- **Admin**: An authenticated admin user operating within a Tenant context, using `AdminJwtGuard` + `RolesGuard`.
- **Public_Client**: An external site or application authenticating via `X-Tenant-Key` header.
- **Slot_Availability_Response**: The list of available Slots returned to the Public_Client for a given date.

---

## Requirements

### Requirement 1: Schedule Configuration Management

**User Story:** As a tenant admin, I want to configure my working hours, slot interval, lunch break, and capacity per slot, so that the system can automatically derive available time slots for my business.

#### Acceptance Criteria

1. THE Appointment_System SHALL allow each Tenant to have exactly one active Schedule_Config record.
2. WHEN a tenant admin creates a Schedule_Config, THE Appointment_System SHALL persist the working start time, working end time, slot interval in minutes, lunch break start time, lunch break end time, and capacity per slot.
3. WHEN a tenant admin updates a Schedule_Config, THE Appointment_System SHALL replace the existing configuration and reflect the changes immediately for all future slot calculations.
4. IF a Schedule_Config update sets the slot interval to a value less than 5 minutes or greater than 480 minutes, THEN THE Appointment_System SHALL reject the request with a 422 status and a descriptive error message.
5. IF a Schedule_Config update sets the working end time to a value equal to or earlier than the working start time, THEN THE Appointment_System SHALL reject the request with a 422 status and a descriptive error message.
6. IF a Schedule_Config update sets the lunch break end time to a value equal to or earlier than the lunch break start time, THEN THE Appointment_System SHALL reject the request with a 422 status and a descriptive error message.
7. IF a Schedule_Config update sets the capacity per slot to a value less than 1, THEN THE Appointment_System SHALL reject the request with a 422 status and a descriptive error message.
8. WHERE lunch break configuration is omitted, THE Appointment_System SHALL treat the entire working window as available without a lunch break.
9. THE Appointment_System SHALL scope all Schedule_Config operations to the authenticated admin's `tenant_id`, preventing cross-tenant access.

---

### Requirement 2: Slot Derivation

**User Story:** As a tenant admin or public client, I want the system to compute available time slots for a given date based on the tenant's schedule configuration, so that only valid and open slots are presented.

#### Acceptance Criteria

1. WHEN a date is provided, THE Appointment_System SHALL derive all Slots for that date by dividing the working window (excluding the lunch break) into consecutive intervals of the configured slot interval.
2. WHEN deriving Slots, THE Appointment_System SHALL exclude any Slot whose time range overlaps with a configured lunch break.
3. WHEN deriving Slots, THE Appointment_System SHALL exclude any Slot that falls within an active Blocked_Period for the tenant.
4. WHEN deriving Slots for a date in the past, THE Appointment_System SHALL return an empty list.
5. IF no Schedule_Config exists for the tenant, THEN THE Appointment_System SHALL return an empty list with a 200 status.
6. FOR ALL valid Schedule_Config records, the count of derived Slots SHALL equal `floor((working_minutes - lunch_minutes) / slot_interval)` where `working_minutes` is the total working window duration and `lunch_minutes` is the lunch break duration (0 if no lunch break is configured).

---

### Requirement 3: Public Slot Availability Query

**User Story:** As a public client (external site), I want to query available slots for a specific date before showing booking options to the user, so that only bookable slots are displayed.

#### Acceptance Criteria

1. WHEN a Public_Client sends a GET request with a valid date and `X-Tenant-Key`, THE Appointment_System SHALL return the list of Slots for that date with their available capacity (Slot_Capacity minus confirmed bookings count).
2. WHEN a Slot has zero remaining capacity, THE Appointment_System SHALL include it in the response with `available: false` so the Public_Client can display it as unavailable.
3. IF the provided date format is invalid, THEN THE Appointment_System SHALL return a 400 status with a descriptive error message.
4. THE Appointment_System SHALL authenticate the Public_Client using the existing `TenantKeyGuard` and resolve the `tenant_id` from the matched collection.
5. THE Appointment_System SHALL scope the slot availability response to the authenticated tenant's Schedule_Config and Blocked_Periods only.

---

### Requirement 4: Atomic Appointment Booking on Lead Submission

**User Story:** As a public client, I want the system to atomically check slot availability and create an appointment when a lead is submitted with appointment data, so that overbooking is prevented.

#### Acceptance Criteria

1. WHEN a lead is submitted with `data.appointmentDate` and `data.appointmentTime`, THE Appointment_System SHALL attempt to book the specified Slot as part of the same database transaction as the lead creation.
2. WHEN the requested Slot has remaining capacity, THE Appointment_System SHALL create an Appointment record linked to the new Lead and decrement the available count atomically.
3. IF the requested Slot is at full capacity at the time of booking, THEN THE Appointment_System SHALL reject the entire lead submission with a 409 status and the message `"Slot unavailable: no remaining capacity for the requested time"`.
4. IF the requested Slot does not correspond to a valid derived Slot for the tenant's Schedule_Config on that date, THEN THE Appointment_System SHALL reject the submission with a 422 status and a descriptive error message.
5. IF the requested appointment date is in the past, THEN THE Appointment_System SHALL reject the submission with a 422 status and a descriptive error message.
6. IF the requested Slot falls within an active Blocked_Period, THEN THE Appointment_System SHALL reject the submission with a 409 status and a descriptive error message.
7. WHERE `data.appointmentDate` and `data.appointmentTime` are absent from the lead submission, THE Appointment_System SHALL process the lead normally without any slot validation.
8. THE Appointment_System SHALL ensure that concurrent submissions for the same Slot cannot both succeed when only one capacity unit remains, using a database-level row lock or serializable transaction.

---

### Requirement 5: Admin Appointment Management

**User Story:** As a tenant admin, I want to view and manage all appointments booked by leads, so that I can track my schedule and make manual adjustments.

#### Acceptance Criteria

1. WHEN a tenant admin requests the appointments list, THE Appointment_System SHALL return a paginated list of Appointments scoped to the admin's `tenant_id`, ordered by appointment date and time ascending.
2. WHEN a tenant admin requests a specific Appointment by ID, THE Appointment_System SHALL return the Appointment details including the linked Lead's name, email, phone, and the booked Slot date and time.
3. WHEN a tenant admin cancels an Appointment, THE Appointment_System SHALL update the Appointment status to `cancelled` and restore one unit of capacity to the affected Slot.
4. IF a tenant admin attempts to cancel an already-cancelled Appointment, THEN THE Appointment_System SHALL return a 409 status with the message `"Appointment is already cancelled"`.
5. THE Appointment_System SHALL require `EAdminRole.viewer` for read operations and `EAdminRole.editor` for write operations on Appointments.
6. THE Appointment_System SHALL scope all admin Appointment operations to the authenticated admin's `tenant_id`, preventing cross-tenant data access.

---

### Requirement 6: Blocked Periods Management

**User Story:** As a tenant admin, I want to block specific dates or time ranges, so that no appointments can be booked during holidays, maintenance windows, or other unavailable periods.

#### Acceptance Criteria

1. WHEN a tenant admin creates a Blocked_Period, THE Appointment_System SHALL persist the start datetime, end datetime, and an optional label describing the reason.
2. WHEN a Blocked_Period is active, THE Appointment_System SHALL exclude all Slots that overlap with the blocked range from availability queries and booking validation.
3. WHEN a tenant admin deletes a Blocked_Period, THE Appointment_System SHALL remove it and restore the affected Slots to available status for future queries.
4. IF a Blocked_Period's end datetime is equal to or earlier than its start datetime, THEN THE Appointment_System SHALL reject the request with a 422 status and a descriptive error message.
5. THE Appointment_System SHALL return a paginated list of Blocked_Periods scoped to the authenticated admin's `tenant_id` when requested.
6. THE Appointment_System SHALL require `EAdminRole.viewer` for listing Blocked_Periods and `EAdminRole.editor` for creating or deleting them.

---

### Requirement 7: Multi-Tenancy Isolation

**User Story:** As a platform operator, I want every appointment-related entity to be strictly scoped to its tenant, so that no tenant can access or affect another tenant's schedule data.

#### Acceptance Criteria

1. THE Appointment_System SHALL associate every Schedule_Config, Appointment, and Blocked_Period record with a `tenant_id` at creation time.
2. WHEN any admin endpoint is called, THE Appointment_System SHALL resolve the `tenant_id` from the authenticated admin's tenant context (via `TenantGuard`) and apply it as a mandatory filter on all database queries.
3. WHEN any public endpoint is called, THE Appointment_System SHALL resolve the `tenant_id` from the `TenantKeyGuard` and apply it as a mandatory filter on all database queries.
4. IF a request attempts to access a resource belonging to a different tenant, THE Appointment_System SHALL return a 404 status, treating the resource as non-existent to avoid information leakage.

---

### Requirement 8: Appointment Status Lifecycle

**User Story:** As a tenant admin, I want appointments to have a clear status lifecycle, so that I can distinguish between confirmed, cancelled, and completed appointments.

#### Acceptance Criteria

1. THE Appointment_System SHALL assign the status `confirmed` to every newly created Appointment.
2. WHEN a tenant admin cancels an Appointment, THE Appointment_System SHALL transition the status from `confirmed` to `cancelled`.
3. WHEN the appointment date and time have passed, THE Appointment_System SHALL allow the status to be updated to `completed` by a tenant admin with `EAdminRole.editor`.
4. IF a tenant admin attempts to transition an Appointment to `confirmed` from `cancelled`, THEN THE Appointment_System SHALL reject the request with a 409 status and a descriptive error message.
