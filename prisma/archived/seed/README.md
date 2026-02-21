# Database Seeding Guide

This directory contains comprehensive database seed files for populating the API PPPI platform with realistic test data.

## Overview

The seeding system is designed to create a complete, realistic development environment with:

- **Multi-tenant setup** with proper isolation
- **Admin users** with different roles and permissions
- **CMS content** including blogs, articles, and authors
- **Lead management** with collections and sample leads
- **Storage collections** for media assets
- **Configuration data** for plans, SMTP, and tokens

## Seed Files

### Core Configuration
- `seed-plan.ts` - Subscription plans and pricing tiers
- `seed-token-pack.ts` - Additional token packs for API usage
- `seed-smtp-server.ts` - SMTP server configurations for email campaigns
- `seed-cnae.ts` - Brazilian CNAE economic activity codes (optional, large dataset)

### Authentication & Tenants
- `seed-admin.ts` - Admin users, tenants, and role assignments
  - Creates super admin (diego kelme)
  - Creates test company admins with different roles
  - Sets up tenant associations

### CMS Module
- `seed-authors.ts` - Blog authors with biographies
- `seed-storage-collections.ts` - Storage collections for images and media
- `seed-cms.ts` - Blogs and articles with realistic content
  - Technical articles about software development
  - API integration guides
  - Best practices content

### Lead Management
- `seed-lead-collection.ts` - Lead collections with different access modes
- `seed-leads.ts` - Sample leads with realistic data

### Company Data (Optional)
- `seed-company.ts` - Brazilian company data (CNPJ) - large dataset, commented out by default

## Running Seeds

### Full Seed
```bash
pnpm exec prisma db seed
```

This runs all seeds in the correct order as defined in `prisma/seeds.ts`.

### Individual Seeds
You can run individual seed files for testing:

```bash
ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed/seed-admin.ts
ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed/seed-cms.ts
```

## Seed Data Structure

### Tenants
1. **Zarp Studio** (`zarp-studio`)
   - Main company tenant
   - Has blog, authors, and lead collections
   
2. **Test Company** (`empresa-teste`)
   - Test tenant for demonstrations
   - Minimal data for testing

### Admin Users

| Email | Password | Role | Tenants |
|-------|----------|------|---------|
| kelme.dev@pm.me | Vamos@Inovar@26 | super_admin | All |
| admin@test-company.com | Test@123456 | company_admin | Test Company (owner) |
| editor@zarp-studio.com | Editor@123456 | company_admin | Zarp Studio (editor) |
| manager@test-company.com | Manager@123456 | company_admin | Test Company (manager) |

### Blog Content

**Zarp Studio Tech Blog** includes:
- Welcome article introducing the blog
- API integration guide with code examples
- Web development best practices
- Microservices architecture guide
- Draft article (unpublished)

### Authors

- **Sarah Johnson** - Senior technology writer
- **Michael Chen** - Full-stack developer and technical writer
- **Emma Rodriguez** - UX designer and content strategist
- **David Thompson** - Test author

### Lead Collections

1. **General Public Collection** - Public access, website forms
2. **Landing Page Leads** - Public access, paid campaigns
3. **Private Test Collection** - Private access with secret key
4. **Domain Restricted Collection** - Restricted to specific domains

### Storage Collections

1. **Article Images** - Private, for blog article media
2. **Author Avatars** - Private, for author profile pictures
3. **Public Assets** - Public access for general images
4. **Test Collection** - Private test collection

## Customization

### Adding New Seed Data

1. Create a new seed file in `prisma/seed/`
2. Follow the naming convention: `seed-{entity}.ts`
3. Export an async function (e.g., `export async function seedEntity()`)
4. Import and call it in `prisma/seeds.ts`

### Modifying Existing Data

Each seed file uses an upsert pattern:
- Checks if data exists (by unique identifier)
- Updates if exists
- Creates if doesn't exist

This allows you to:
- Re-run seeds safely without duplicates
- Update existing data by modifying the seed file
- Add new data incrementally

### Example Pattern

```typescript
const existing = await prisma.entity.findUnique({
    where: { slug: 'unique-identifier' },
});

if (existing) {
    await prisma.entity.update({
        where: { id: existing.id },
        data: { /* updated data */ },
    });
} else {
    await prisma.entity.create({
        data: { /* new data */ },
    });
}
```

## Important Notes

### Password Hashing
Admin passwords are hashed using PBKDF2 SHA-512 with the `ENCRYPT_PRIVATE_KEY` environment variable. Ensure this is set before running seeds.

### Secret Keys
Blog and collection secret keys are also hashed using the same method. The plain-text keys in seed files are for reference only.

### Tenant Isolation
All data is properly scoped to tenants. When adding new data, always specify the correct `tenantSlug` to maintain isolation.

### Database Views
The main seed orchestrator (`prisma/seeds.ts`) also creates database views for company data queries. These views are created automatically if they don't exist.

## Troubleshooting

### "ENCRYPT_PRIVATE_KEY env var not set"
Ensure your `.env` file contains the `ENCRYPT_PRIVATE_KEY` variable.

### "Tenant not found"
Seeds run in order. If a seed depends on tenants, ensure `seed-admin.ts` runs first (it creates tenants).

### "Admin not found"
Some seeds (like CMS) need an admin for `created_by` fields. Ensure `seed-admin.ts` runs before CMS seeds.

### Duplicate Key Errors
If you get unique constraint violations, check if you're trying to create data with the same unique identifier (email, slug, etc.).

## Best Practices

1. **Keep seeds idempotent** - They should be safe to run multiple times
2. **Use realistic data** - Helps with testing and demonstrations
3. **Document changes** - Update this README when adding new seeds
4. **Test incrementally** - Run individual seeds during development
5. **Maintain order** - Some seeds depend on others (tenants → blogs → articles)

## Future Enhancements

Potential improvements to the seeding system:

- [ ] Add seed for media assets (actual image files in storage)
- [ ] Add seed for email campaigns
- [ ] Add seed for brand monitoring data
- [ ] Add seed for user subscriptions
- [ ] Create seed data generator CLI tool
- [ ] Add seed for API tokens
- [ ] Add seed for journal alerts
