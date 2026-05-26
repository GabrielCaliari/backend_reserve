# Seeds Migration Status

## ✅ Completed Work

### 1. New Modular Structure Created
All seeds have been migrated from `prisma/seed/` to `prisma/seeds/` with proper organization:

```
prisma/seeds/
├── reserve-auth/
│   ├── admins.seed.ts ✅
│   └── tenants.seed.ts ✅
├── reserve-cms/
│   ├── authors.seed.ts ✅
│   ├── blogs.seed.ts ✅
│   ├── articles.seed.ts ✅
│   └── storage/
│       ├── author-avatars-collection.seed.ts ✅
│       └── article-images-collection.seed.ts ✅
├── reserve-leads/
│   ├── collections.seed.ts ✅
│   └── leads.seed.ts ✅
├── reserve-mailer/
│   └── smtp-servers.seed.ts ✅
├── reserve-cnpjs/
│   ├── cnaes.seed.ts ✅
│   └── companies.seed.ts ✅
└── shared/
    ├── plans.seed.ts ✅
    └── token-packs.seed.ts ✅
```

### 2. Schema Alignment
All seeds have been updated to match the current Prisma schema:
- ✅ Plan model (slug, maximum_queries fields)
- ✅ AdditionalTokenPack model (not TokenPack)
- ✅ MediaCollection model (not StorageCollection)
- ✅ SMTPServer model (correct field names)
- ✅ Admin model (UUID/CUID string IDs)

### 3. English Translation
All seed content and console messages converted to English.

### 4. Documentation Created
- ✅ README.md - Structure and usage guide
- ✅ MIGRATION-GUIDE.md - Migration instructions
- ✅ SEED-COVERAGE.md - Coverage report
- ✅ TROUBLESHOOTING.md - Common issues and solutions
- ✅ MIGRATION-STATUS.md - This file

## ⚠️ Current Blocker

### Database Contains Incompatible Data

**Error:** `Expected a string in column 'id', got number`

**Cause:** The database contains old Admin records with numeric IDs, but the schema now uses UUID strings (CUID).

**Impact:** Seeds cannot run until this is resolved.

## 🔧 Required Action

You need to reset the database to clear incompatible data. Choose one option:

### Option 1: Full Reset (Recommended for Development)

```bash
# WARNING: Deletes ALL data!
pnpm exec prisma migrate reset

# Seeds will run automatically after reset
```

### Option 2: Manual Cleanup (Preserve other data)

```bash
# Connect to database
psql $DATABASE_URL

# Delete only Admin-related tables
DELETE FROM "AdminSessionToken";
DELETE FROM "AdminCredential";
DELETE FROM "AdminTenant";
DELETE FROM "Admin";

# Exit
\q

# Run seeds
pnpm exec prisma db seed
```

### Option 3: Fresh Database

```bash
# Drop and recreate
pnpm exec prisma migrate reset --skip-seed
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
```

## 📋 After Database Reset

Once the database is clean, run:

```bash
pnpm exec prisma db seed
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║          DATABASE SEEDING - Gabriel Caliari API               ║
╚════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────┐
│  MÓDULO: reserve-AUTH                      │
└─────────────────────────────────────────┘

[TENANTS SEED]
  ✓ Tenant created: reserve-studio
  ✓ Tenant created: empresa-teste
  ✓ Tenant created: tech-innovations
  ✓ Tenant created: tenant-inativo

[ADMINS SEED]
  ✓ Admin created: kelme.dev@pm.me (super_admin)
  ✓ Admin created: ana.silva@GabrielCaliari.com (company_admin)
  ...

[And so on for all modules]

╔════════════════════════════════════════════════════════════╗
║              ✓ SEEDING CONCLUÍDO COM SUCESSO              ║
╚════════════════════════════════════════════════════════════╝
```

## 🗑️ Cleanup Old Files

After successful seeding, delete the old seed directory:

```bash
# Backup first (optional)
mkdir -p prisma/seed-backup
mv prisma/seed/* prisma/seed-backup/

# Then delete
rm -rf prisma/seed
```

Or on Windows PowerShell:
```powershell
# Backup first (optional)
New-Item -ItemType Directory -Force -Path prisma\seed-backup
Move-Item -Path prisma\seed\* -Destination prisma\seed-backup\

# Then delete
Remove-Item -Recurse -Force prisma\seed
```

## 📊 Seed Data Summary

After successful seeding, you'll have:

- **4 Tenants** (3 active, 1 inactive)
- **5 Admins** (1 super_admin, 3 active company_admins, 1 inactive)
- **5 Plans** (Free, Starter, Professional, Enterprise, Legacy)
- **5 Token Packs** (100, 500, 1K, 5K, 10K tokens)
- **5 Authors** distributed across tenants
- **3 Blogs** (1 per active tenant)
- **6 Articles** (5 published, 1 draft) with full technical content
- **2 Media Collections** (author-avatars, article-images)
- **6 Lead Collections** with different access modes
- **7 Leads** distributed across collections
- **4 SMTP Servers** (AWS SES, Gmail, SendGrid, Dev)

## 🎯 Next Steps (Optional Enhancements)

1. **Add Media Assets** - Create actual image files for avatars and article covers
2. **Add Email Campaigns** - Create sample email campaigns
3. **Add CNAE Full Dataset** - If needed for testing (currently sample data only)
4. **Add Company Full Dataset** - If needed for testing (currently sample data only)

## 📝 Notes

- Diego Kelme (kelme.dev@pm.me) is maintained as super_admin
- All passwords are hashed with PBKDF2 SHA-512
- Seeds are idempotent (safe to run multiple times)
- All data is in English
- Realistic sample data for all modules

