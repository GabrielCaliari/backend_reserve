# Seed System Quick Start

## TL;DR

```bash
# Reset database and run all seeds
pnpm exec prisma migrate reset

# Or just run seeds (keeps existing data, updates/creates)
pnpm exec prisma db seed
```

## Default Credentials

### Super Admin
- **Email:** `kelme.dev@pm.me`
- **Password:** `Vamos@Inovar@26`
- **Access:** All tenants, all permissions

### Test Admins
| Email | Password | Tenant | Role |
|-------|----------|--------|------|
| admin@test-company.com | Test@123456 | Test Company | Owner |
| editor@zarp-studio.com | Editor@123456 | Zarp Studio | Editor |
| manager@test-company.com | Manager@123456 | Test Company | Manager |

## What Gets Created

### Tenants
- **Zarp Studio** - Main company with full blog and content
- **Test Company** - Minimal test tenant

### CMS Content
- 2 blogs (Zarp Studio + Test Company)
- 6 articles (5 published, 1 draft)
- 4 authors with biographies
- 4 storage collections

### Lead Management
- 4 lead collections (public, private, restricted)
- 5 sample leads with realistic data

### Configuration
- Subscription plans
- Token packs
- SMTP servers

## Quick Commands

```bash
# View data in browser
pnpm exec prisma studio

# Reset everything and reseed
pnpm exec prisma migrate reset

# Just run seeds (safe, idempotent)
pnpm exec prisma db seed

# Run specific seed
ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed/seed-cms.ts
```

## Common Tasks

### Add a New Admin
Edit `prisma/seed/seed-admin.ts`:
```typescript
{
    name: 'New Admin',
    email: 'new@example.com',
    password: 'Password@123',
    role: 'company_admin' as const,
}
```

### Add a New Article
Edit `prisma/seed/seed-cms.ts`:
```typescript
{
    display_title: 'My New Article',
    meta_title: 'Article Title',
    meta_description: 'Description here',
    focus_keyword: 'keyword',
    content: '# Article content here',
    slug: 'my-new-article',
    status: EArticleStatus.published,
    display_order: 6,
    blogSlug: 'blog-zarp-studio',
}
```

### Add a New Lead Collection
Edit `prisma/seed/seed-lead-collection.ts`:
```typescript
{
    name: 'My Collection',
    slug: 'my-collection',
    source: 'website',
    access_mode: ECollectionAccessMode.public,
    tenantSlug: 'zarp-studio',
}
```

## Troubleshooting

### "ENCRYPT_PRIVATE_KEY env var not set"
Add to `.env`:
```
ENCRYPT_PRIVATE_KEY=your-secret-key-here
```

### "Tenant not found"
Seeds run in order. Make sure `seed-admin.ts` runs first (it creates tenants).

### Duplicate errors
Seeds are idempotent. If you get duplicates, check your unique identifiers (email, slug).

### Need fresh start
```bash
pnpm exec prisma migrate reset
# This drops DB, runs migrations, and seeds
```

## File Structure

```
prisma/seed/
├── README.md              # Full documentation
├── QUICK-START.md         # This file
├── seed-admin.ts          # Admins & tenants
├── seed-authors.ts        # Blog authors
├── seed-cms.ts            # Blogs & articles
├── seed-lead-collection.ts # Lead collections
├── seed-leads.ts          # Sample leads
├── seed-storage-collections.ts # Media storage
├── seed-plan.ts           # Subscription plans
├── seed-smtp-server.ts    # Email config
└── seed-token-pack.ts     # Token packs
```

## Need More Info?

- Full documentation: `prisma/seed/README.md`
- System overview: `docs/seed-system-overview.md`
- Schema reference: `prisma/schema.prisma`
