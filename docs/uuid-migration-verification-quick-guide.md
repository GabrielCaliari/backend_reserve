# UUID Migration Verification - Quick Guide

## TL;DR

After completing Phase 2 UUID migration, run:

```bash
pnpm exec ts-node prisma/scripts/run-verification-suite.ts
```

If all checks pass ✅, migration is successful!  
If any checks fail ❌, review the report and fix issues.

---

## What Gets Checked

| Check Category | What It Verifies |
|----------------|------------------|
| **UUID Format** | All IDs are valid 12-character cuid format |
| **UUID Uniqueness** | No duplicate UUIDs exist |
| **Foreign Keys** | All references point to existing records |
| **Polymorphic Relations** | MediaAssetRelation entity_id references are valid |
| **Data Consistency** | No NULL values in required fields |
| **Record Counts** | No data loss during migration |

---

## Entities Verified

- ✅ **Blog** (id, blog_id references)
- ✅ **Article** (id, blog_id, author_id, cover_image_id)
- ✅ **Author** (id, avatar_id)
- ✅ **MediaAsset** (id, collection_id)
- ✅ **MediaCollection** (id)
- ✅ **MediaAssetRelation** (id, asset_id, polymorphic entity_id)

---

## Available Scripts

### 1. Automated Suite (Recommended)
Runs all checks and generates a report.

```bash
pnpm exec ts-node prisma/scripts/run-verification-suite.ts
```

**Output:** `prisma/verification-report.txt`

### 2. TypeScript Verification
Programmatic checks using Prisma.

```bash
pnpm exec ts-node prisma/scripts/verify-uuid-migration.ts
```

**Output:** Console with detailed results

### 3. SQL Verification (Optional)
Direct database queries (requires psql).

```bash
psql "${DATABASE_URL}" -f prisma/migrations/verify-uuid-migration.sql
```

**Output:** SQL query results

---

## Interpreting Results

### ✅ All Checks Passed
```
✅ ALL CHECKS PASSED - Data integrity verified!
```

**Action:** Migration successful! Proceed with:
1. Update frontend to use UUID IDs
2. Update API documentation
3. Deploy to production

### ❌ Some Checks Failed
```
❌ SOME CHECKS FAILED - Please review and fix issues above
```

**Action:** Review failed checks and:
1. Identify the specific integrity issue
2. Check migration logs for errors
3. Fix data or migration scripts
4. Consider rollback if critical
5. Re-run migration and verification

---

## Common Issues & Fixes

### Issue: Orphaned Foreign Keys
```
❌ Article -> Author Foreign Key
   Orphaned: 2
   - Article abc123 references invalid author_id: xyz789
```

**Fix:**
```sql
-- Option 1: Set to NULL if nullable
UPDATE "Article" SET author_id = NULL WHERE author_id = 'xyz789';

-- Option 2: Create missing author
INSERT INTO "Author" (id, first_name, last_name, tenant_id)
VALUES ('xyz789', 'Unknown', 'Author', 1);
```

### Issue: Invalid UUID Format
```
❌ Article UUID Format
   Invalid: 1
   - Invalid ID: abc123
```

**Fix:** Re-run migration script to generate proper UUIDs.

### Issue: Duplicate UUIDs
```
❌ Article UUID Uniqueness
   Duplicates: 1
   - Duplicate ID: abc123def456
```

**Fix:** Regenerate UUIDs for duplicate records.

### Issue: NULL Required Fields
```
❌ Article NOT NULL Constraints
   Records with NULL required fields: 3
```

**Fix:** Populate missing required fields before migration.

---

## Pre-Migration Checklist

Before running verification:

- [ ] Phase 2 UUID migration completed
- [ ] All migration scripts executed successfully
- [ ] No migration errors in logs
- [ ] Database backup created
- [ ] DATABASE_URL environment variable set
- [ ] Prisma client generated (`pnpm exec prisma generate`)

---

## Post-Verification Checklist

After successful verification:

- [ ] All verification checks passed
- [ ] Report reviewed and archived
- [ ] Frontend updated to use UUID IDs
- [ ] API documentation updated
- [ ] Team notified of successful migration
- [ ] Production deployment scheduled

---

## Rollback Procedure

If verification fails critically:

1. **Stop all application instances**
2. **Restore database from backup**
   ```bash
   psql "${DATABASE_URL}" < backup.sql
   ```
3. **Review migration logs**
4. **Fix migration scripts**
5. **Re-run migration**
6. **Re-run verification**

---

## Need Help?

- **Detailed Checklist:** `docs/uuid-migration-verification-checklist.md`
- **Script Documentation:** `prisma/scripts/README-VERIFICATION.md`
- **Migration Guide:** `docs/uuid-migration-guide.md`
- **Requirements:** `.kiro/specs/cms-blog-article-refactor/requirements-uuid-expansion.md`

---

## Example: Full Verification Workflow

```bash
# 1. Ensure environment is ready
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"
pnpm exec prisma generate

# 2. Run verification suite
pnpm exec ts-node prisma/scripts/run-verification-suite.ts

# 3. Review report
cat prisma/verification-report.txt

# 4. If passed, proceed with deployment
# If failed, review issues and fix
```

---

## Success Criteria

Migration is considered successful when:

- ✅ All UUID format checks pass
- ✅ All UUID uniqueness checks pass
- ✅ All foreign key integrity checks pass
- ✅ All polymorphic relation checks pass
- ✅ All data consistency checks pass
- ✅ Record counts match pre-migration counts
- ✅ Application functions correctly with UUID IDs
- ✅ API endpoints work with UUID parameters

---

**Last Updated:** 2024  
**Spec:** cms-blog-article-refactor (Phase 2)  
**Task:** 25.4 - Verify data integrity after UUID migration
