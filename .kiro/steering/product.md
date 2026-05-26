---
inclusion: always
---

# Product Domain: Reserve Business Intelligence Platform

Reserve is a B2B SaaS platform providing business intelligence for the Brazilian market through CNPJ data, trademark monitoring, and automated journal processing.

## Business Context

### Primary Value Proposition
Real-time monitoring and analysis of Brazilian company data, trademarks (INPI), and official business journals (DOU) to enable informed business decisions.

### Core Bounded Contexts

| Context | Domain Focus | Key Entities |
|---------|-------------|--------------|
| **Company Registry** | CNPJ data management and lookup | Company, CNAE, Address |
| **Brand Intelligence** | Trademark monitoring and analysis | Brand, BrandAnalysis, INPIAlert |
| **Journal Processing** | Official publication tracking | Journal, JournalAlert, Post |
| **Lead Management** | CRM and email campaigns | Lead, EmailCampaign, LeadCollection |
| **User Management** | Multi-tenant authentication | Admin, User, Tenant |
| **Subscription** | Billing and plan management | Plan, TokenPack, Subscription |

## Domain Language (Ubiquitous Language)

| Business Term | Technical Entity | Context |
|--------------|------------------|---------|
| CNPJ | Company identifier (14 digits) | Brazilian federal tax ID |
| CNAE | Economic activity code | Industry classification |
| INPI | National Institute of Industrial Property | Trademark registry |
| DOU | Diário Oficial da União | Official federal gazette |
| Lead | Potential customer contact | CRM context |
| Token | API usage credit | Billing context |
| Tenant | Organization account | Multi-tenancy |

## Feature Domains

### 1. Company Data (reserve-cnpjs)
- CNPJ validation and lookup
- Company profile enrichment
- CNAE classification
- Bulk export with filtering
- Historical data tracking

### 2. Brand Monitoring (reserve-brands)
- INPI trademark search
- AI-powered brand analysis (OpenAI/Azure)
- Automated alert system
- Similarity detection
- Registration status tracking

### 3. Journal Processing (reserve-journals)
- Automated DOU scraping
- Publication parsing and indexing
- Alert configuration by keywords
- Post categorization
- Notification delivery

### 4. Lead Management (reserve-mailer)
- Lead collection and qualification
- Email campaign management
- SMTP configuration
- SMS notifications (AWS SNS)
- Geolocation tracking
- File attachment handling

### 5. User & Authentication (reserve-auth)
- Multi-tenant architecture
- Admin and user roles
- JWT-based authentication
- Session management
- Permission control

### 6. Subscription & Billing
- Stripe integration
- Plan management (free/paid tiers)
- Token pack system
- Usage tracking
- Payment processing

## User Personas

| Persona | Goals | Key Features Used |
|---------|-------|-------------------|
| **Business Analyst** | Research companies, validate opportunities | CNPJ lookup, export, brand search |
| **Legal Professional** | Monitor trademark registrations | INPI alerts, brand analysis |
| **Marketing Team** | Market research, lead generation | Lead management, campaigns |
| **Entrepreneur** | Validate business ideas, competitor analysis | Company data, brand monitoring |

## Business Rules & Constraints

### Data Processing
- CNPJ must be validated before storage (14 digits, valid check digit)
- Company data sourced from official government APIs
- Journal processing runs on scheduled intervals
- AI analysis requires token consumption

### Multi-Tenancy
- Each tenant has isolated data
- Admins can manage multiple tenants
- Users belong to a single tenant
- Shared reference data (CNAE codes)

### Billing & Usage
- Free tier with limited tokens
- Paid plans with token packs
- Token consumption per API call
- Stripe webhooks for payment events

### Notifications
- Email via SMTP (configurable per tenant)
- SMS via AWS SNS
- Alert frequency limits to prevent spam
- User preference management

## Integration Points

| External Service | Purpose | Context |
|-----------------|---------|---------|
| **Stripe** | Payment processing | Subscription management |
| **AWS S3** | File storage | Media assets, exports |
| **AWS SNS** | SMS delivery | Lead notifications |
| **OpenAI/Azure AI** | Brand analysis | AI-powered insights |
| **Government APIs** | CNPJ data | Company information |
| **INPI** | Trademark data | Brand monitoring |

## Data Sensitivity

| Data Type | Sensitivity | Handling |
|-----------|-------------|----------|
| Company CNPJ | Public | Cacheable, exportable |
| User credentials | High | Hashed (PBKDF2 SHA-512) |
| Payment info | High | Stripe-managed, no storage |
| Lead contacts | Medium | Tenant-isolated, encrypted |
| API tokens | High | JWT with expiration |

## Product Conventions

### Naming
- Modules prefixed with `reserve-` (e.g., `reserve-brands`, `reserve-mailer`)
- API routes follow `/api/{module}` pattern
- Database tables use `snake_case`
- Entities use `PascalCase`

### Data Formats
- CNPJ: 14 digits, stored without formatting
- Phone: E.164 format for international
- Dates: ISO 8601 (UTC)
- Currency: Cents (integer) for BRL

### API Versioning
- v1: Legacy endpoints (being phased out)
- v2: Current modular architecture
- Breaking changes require new version