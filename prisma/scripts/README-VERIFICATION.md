# UUID Migration Verification Scripts

This directory contains comprehensive verification scripts to ensure data integrity after the Phase 2 UUID migration for all CMS entities.

## Overview

The verification suite includes:

1. **SQL Verification Script** (`verify-uuid-migration.sql`) - Direct database checks
2. **TypeScript Verification Script** (`verify-uuid-migration.ts`) - Programmatic checks using Prisma
3. **Automated Suite** (`run-verification-suite.ts`) - Runs all checks and generates a report

## Prerequisites

- Node.js and pnpm installed
- Database connection configured (DATABASE_URL environment variable)
- Prisma client generated (`pnpm exec prisma generate`)
- PostgreSQL client tools (psql) for SQL verification (optional)

## Quick Start

### Run All Verifications (Recommended)

```bash
pnpm exec ts-node prisma/scripts/run-verification-suite.ts
```

This will:
- Run all verification checks
- Generate a detailed report at `prisma/verification-report.txt`
- Exit with code 0 if all checks pass, 1 if any fail

### Run Individual Verifications

#### TypeScript Verification (Recommended)
```bash
pnpm exec ts-node prisma/scripts/verify-uuid-migration.ts
```

#### SQL Verification (Requires psql)
```bash
psql "${DATABASE_URL}" -f prisma/migrations/verify-uuid-migration.sql
```

## What Gets Verified

### 1. UUID Format Validation
- All entity IDs are 12-character cuid format
- Pattern: `^[a-z0-9]{12}$`
- Entities: Blog, Article, Author, MediaAsset, MediaCollection, MediaAssetRelation

### 2. UUID Uniqueness
- No duplicate UUIDs within each entity type
- Checks all primary keys

### 3. Foreign Key Integrity
- Article → Blog (blog_id)
- Article → Author (author_id)
- Article → MediaAsset (cover_image_id)
- Author → MediaAsset (avatar_id)
- MediaAsset → MediaCollection (collection_id)
- MediaAssetRelation → MediaAsset (asset_id)
- ArticleImage → Article (article_id, deprecated)

### 4. Polymorphic Relation Integrity
- MediaAssetRelation → Article (entity_type='article', entity_id_type='uuid')
- MediaAssetRelation → Author (entity_type='author', entity_id_type='uuid')
- entity_id_type consistency with actual entity_id format

### 5. Data Consistency
- No NULL values in NOT NULL fields
- All required fields populated
- Data types match schema definitions

### 6. Relationship Integrity
- Bidirectional relationship checks
- No orphaned records (entities without valid references)
- Cascade delete behavior verification

### 7. Record Count Preservation
- Entity counts match pre-migration counts
- No data loss during migration

## Verification Checklist

A comprehensive manual checklist is available at:
```
docs/uuid-migration-verification-checklist.md
```

Use this for:
- Pre-migration preparation
- Manual verification steps
- Sign-off documentation
- Rollback planning

## Output Examples

### Successful Verification
```
================================================================================
UUID MIGRATION VERIFICATION SUMMARY
================================================================================

Total Checks: 25
Passed: 25 ✓
Failed: 0 ✗

--------------------------------------------------------------------------------
ENTITY COUNTS:
--------------------------------------------------------------------------------
Blogs: 5
Articles: 42
Authors: 8
MediaAssets: 156
MediaCollections: 4
MediaAssetRelations: 89
ArticleImages (deprecated): 0

================================================================================
✅ ALL CHECKS PASSED - Data integrity verified!
================================================================================
```

### Failed Verification
```
================================================================================
UUID MIGRATION VERIFICATION SUMMARY
================================================================================

Total Checks: 25
Passed: 23 ✓
Failed: 2 ✗

--------------------------------------------------------------------------------
FAILED CHECKS:
--------------------------------------------------------------------------------

❌ Article -> Author Foreign Key
   Total with author: 42, Valid: 40, Orphaned: 2
   Errors:
   - Article abc123def456 references invalid author_id: xyz789uvw012
   - Article ghi789jkl012 references invalid author_id: mno345pqr678

❌ MediaAssetRelation entity_id_type Consistency
   Total: 89, Consistent: 87, Inconsistent: 2
   Errors:
   - MediaAssetRelation stu901vwx234 has inconsistent entity_id_type: uuid for entity_id: 12345

================================================================================
❌ SOME CHECKS FAILED - Please review and fix issues above
================================================================================
```

## Troubleshooting

### "DATABASE_URL not set"
Ensure your `.env` file contains a valid DATABASE_URL:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

### "psql: command not found"
The SQL verification requires PostgreSQL client tools. Either:
- Install psql: `sudo apt-get install postgresql-client` (Linux) or `brew install postgresql` (Mac)
- Skip SQL verification and use TypeScript verification only

### "Cannot find module '@prisma/client'"
Generate the Prisma client:
```bash
pnpm exec prisma generate
```

### Verification Fails After Migration
1. Review the specific failed checks in the output
2. Check migration logs for errors
3. Verify migration scripts ran in correct order
4. Consider rollback if critical issues found
5. Fix issues and re-run migration

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Verify UUID Migration
  run: pnpm exec ts-node prisma/scripts/run-verification-suite.ts
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Post-Verification

After successful verification:

1. ✅ Update frontend applications to use UUID IDs
2. ✅ Update API documentation
3. ✅ Notify team of successful migration
4. ✅ Archive migration scripts and logs
5. ✅ Schedule deprecated table cleanup

## Support

For issues or questions:
- Review the verification checklist: `docs/uuid-migration-verification-checklist.md`
- Check migration documentation: `docs/uuid-migration-guide.md`
- Review spec requirements: `.kiro/specs/cms-blog-article-refactor/requirements-uuid-expansion.md`
