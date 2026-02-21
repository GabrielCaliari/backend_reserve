# UUID Migration - Rollback Procedures

## Overview

This document provides detailed procedures for rolling back the UUID migration if critical issues are discovered. Rollback is only available within the first **48 hours** after production migration.

**⚠️ CRITICAL**: Rollback must be coordinated between backend and frontend teams. Both must rollback together.

---

## Rollback Window

### Timeline

- **Available**: First 48 hours after production migration
- **Decision Point**: 24 hours (recommended)
- **Execution Time**: 2-4 hours
- **After 48 hours**: Rollback becomes significantly more complex and risky

### Why 48 Hours?

- Database backup retention
- Minimal new data created with UUIDs
- Frontend deployment coordination window
- Team availability for coordination

---

## Rollback Triggers

### Critical Issues (Immediate Rollback)

1. **Data Loss**: Any evidence of data loss or corruption
2. **System Down**: API completely unavailable for >15 minutes
3. **Data Integrity**: Foreign key violations or orphaned records
4. **Security**: Security vulnerabilities discovered
5. **Performance**: >50% degradation in response times

### Major Issues (Consider Rollback)

1. **Functionality**: Core features not working
2. **Integration**: Third-party integrations broken
3. **User Impact**: >25% of users affected
4. **Data Inconsistency**: Mismatched IDs between entities

### Minor Issues (Fix Forward)

1. **UI Glitches**: Display issues that don't affect functionality
2. **Performance**: <25% degradation
3. **Edge Cases**: Issues affecting <5% of users
4. **Documentation**: Missing or incorrect documentation

---

## Pre-Rollback Checklist

Before initiating rollback, verify:

- [ ] Issue is confirmed and reproducible
- [ ] Issue severity justifies rollback
- [ ] Within 48-hour rollback window
- [ ] Backend team is available
- [ ] Frontend team is available
- [ ] Database backup is verified
- [ ] Rollback scripts are tested
- [ ] Communication plan is ready

---

## Rollback Procedure

### Phase 1: Preparation (30 minutes)

#### Step 1.1: Notify Stakeholders

```bash
# Send notification to all teams
Subject: URGENT - UUID Migration Rollback Initiated

We are initiating a rollback of the UUID migration due to [REASON].

Timeline:
- Start: [TIME]
- Expected completion: [TIME + 2-4 hours]
- Expected downtime: 30-60 minutes

Impact:
- API will be unavailable during rollback
- All users will be affected
- Data created after migration will be preserved

Status updates: [CHANNEL]
```

#### Step 1.2: Enable Maintenance Mode

```bash
# Set API to maintenance mode
curl -X POST https://api.pppi.com.br/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "message": "System maintenance in progress"}'
```

#### Step 1.3: Stop Background Jobs

```bash
# Stop all background workers
pm2 stop all

# Or using systemd
systemctl stop api-worker
systemctl stop api-queue
```

#### Step 1.4: Create Current State Backup

```bash
# Backup current database state
pg_dump -h localhost -U postgres -d pppi_production \
  -f /backups/pre-rollback-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh /backups/pre-rollback-*.sql
```

---

### Phase 2: Database Rollback (60-90 minutes)

#### Step 2.1: Verify Rollback Migration Scripts

```bash
# Navigate to project directory
cd /var/www/api-pppi

# List available rollback migrations
npx prisma migrate status

# Expected output should show rollback migrations
```

#### Step 2.2: Execute Rollback Migrations

The rollback migrations will:
1. Restore integer ID columns
2. Restore foreign key relationships
3. Map UUID values back to original integer IDs
4. Restore Blog.slug field
5. Remove UUID columns

```bash
# Execute rollback migrations in order
npx prisma migrate deploy --name rollback-uuid-phase-5
npx prisma migrate deploy --name rollback-uuid-phase-4
npx prisma migrate deploy --name rollback-uuid-phase-3
npx prisma migrate deploy --name rollback-uuid-phase-2
npx prisma migrate deploy --name rollback-uuid-phase-1

# Verify migration status
npx prisma migrate status
```

#### Step 2.3: Verify Data Integrity

```sql
-- Connect to database
psql -h localhost -U postgres -d pppi_production

-- Verify Blog table
SELECT COUNT(*) FROM "Blog";
SELECT id, name FROM "Blog" LIMIT 5;

-- Verify Article table
SELECT COUNT(*) FROM "Article";
SELECT id, blog_id, author_id FROM "Article" LIMIT 5;

-- Verify Author table
SELECT COUNT(*) FROM "Author";
SELECT id, first_name, last_name FROM "Author" LIMIT 5;

-- Verify MediaAsset table
SELECT COUNT(*) FROM "media_assets";
SELECT id, collection_id FROM "media_assets" LIMIT 5;

-- Verify foreign key relationships
SELECT 
  a.id, 
  a.blog_id, 
  b.id as blog_exists
FROM "Article" a
LEFT JOIN "Blog" b ON a.blog_id = b.id
WHERE b.id IS NULL
LIMIT 10;

-- Should return 0 rows (no orphaned records)
```

#### Step 2.4: Regenerate Prisma Client

```bash
# Regenerate Prisma client with integer IDs
npx prisma generate

# Verify generated types
cat src/generated/prisma/index.d.ts | grep "Blog" -A 10
```

---

### Phase 3: Application Rollback (30-45 minutes)

#### Step 3.1: Deploy Previous Backend Version

```bash
# Checkout previous version
git checkout tags/v2.5.0-pre-uuid

# Install dependencies
pnpm install

# Build application
pnpm build

# Restart application
pm2 restart api

# Or using systemd
systemctl restart api-pppi
```

#### Step 3.2: Verify Backend Health

```bash
# Health check
curl https://api.pppi.com.br/health

# Expected response:
# {"status": "ok", "version": "2.5.0"}

# Test Blog endpoint with integer ID
curl https://api.pppi.com.br/api/v2/cms/blogs/1 \
  -H "Authorization: Bearer $TEST_TOKEN"

# Should return blog with integer ID
```

#### Step 3.3: Deploy Previous Frontend Version

```bash
# Frontend deployment (coordinate with frontend team)
# Each frontend team should deploy their previous version

# Example for Next.js app
cd /var/www/frontend-cms
git checkout tags/v1.8.0-pre-uuid
pnpm install
pnpm build
pm2 restart frontend
```

#### Step 3.4: Clear CDN Cache

```bash
# Clear CloudFlare cache (if using)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'
```

---

### Phase 4: Verification (30 minutes)

#### Step 4.1: Smoke Tests

```bash
# Run automated smoke tests
pnpm test:e2e:smoke

# Manual verification checklist:
# [ ] Can list blogs
# [ ] Can create blog
# [ ] Can view blog details
# [ ] Can list articles
# [ ] Can create article
# [ ] Can view article details
# [ ] Can upload media asset
# [ ] Can create author
```

#### Step 4.2: Monitor Logs

```bash
# Monitor application logs
tail -f /var/log/api-pppi/error.log

# Monitor database logs
tail -f /var/log/postgresql/postgresql-*.log

# Check for errors
grep -i "error" /var/log/api-pppi/error.log | tail -20
```

#### Step 4.3: Performance Check

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s \
  https://api.pppi.com.br/api/v2/cms/blogs

# Monitor database performance
psql -h localhost -U postgres -d pppi_production -c "
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

---

### Phase 5: Re-enable System (15 minutes)

#### Step 5.1: Restart Background Jobs

```bash
# Restart workers
pm2 restart api-worker
pm2 restart api-queue

# Or using systemd
systemctl start api-worker
systemctl start api-queue
```

#### Step 5.2: Disable Maintenance Mode

```bash
# Disable maintenance mode
curl -X POST https://api.pppi.com.br/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'
```

#### Step 5.3: Notify Stakeholders

```bash
# Send completion notification
Subject: UUID Migration Rollback Complete

The UUID migration rollback has been completed successfully.

Status: System operational
Downtime: [ACTUAL DURATION]
Data loss: None
Next steps: [PLAN]

All systems are now running on the previous version with integer IDs.
```

---

## Post-Rollback Actions

### Immediate (Day 1)

- [ ] Monitor system for 24 hours
- [ ] Analyze root cause of rollback
- [ ] Document lessons learned
- [ ] Update migration plan
- [ ] Schedule post-mortem meeting

### Short-term (Week 1)

- [ ] Fix identified issues
- [ ] Update migration scripts
- [ ] Enhance testing procedures
- [ ] Update documentation
- [ ] Plan re-migration timeline

### Long-term (Month 1)

- [ ] Conduct thorough testing
- [ ] Implement additional safeguards
- [ ] Train team on new procedures
- [ ] Schedule re-migration
- [ ] Communicate new timeline

---

## Data Handling During Rollback

### New Data Created After Migration

**Scenario**: Users created new blogs/articles with UUID IDs after migration.

**Solution**: The rollback migration includes a UUID-to-integer mapping table:

```sql
-- Mapping table structure
CREATE TABLE uuid_to_int_mapping (
  entity_type VARCHAR(50),
  uuid_value VARCHAR(12),
  int_value INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- During rollback, new UUIDs are mapped to new integer IDs
INSERT INTO "Blog" (id, name, ...)
SELECT 
  nextval('blog_id_seq'),
  name,
  ...
FROM "Blog_uuid_temp"
WHERE id NOT IN (SELECT uuid_value FROM uuid_to_int_mapping);
```

**Result**: All data is preserved, but IDs change from UUID back to integers.

### Modified Data

**Scenario**: Existing records were updated after migration.

**Solution**: Updates are preserved. Only IDs are changed back to integers.

### Deleted Data

**Scenario**: Records were deleted after migration.

**Solution**: Deletions are preserved. Deleted records remain deleted.

---

## Rollback Migration Scripts

### Location

```
prisma/migrations/
├── 20240125_rollback_uuid_phase_1/
├── 20240125_rollback_uuid_phase_2/
├── 20240125_rollback_uuid_phase_3/
├── 20240125_rollback_uuid_phase_4/
└── 20240125_rollback_uuid_phase_5/
```

### Phase 1: Restore Integer Columns

```sql
-- Add temporary integer ID columns
ALTER TABLE "Blog" ADD COLUMN id_int INTEGER;
ALTER TABLE "Article" ADD COLUMN id_int INTEGER;
ALTER TABLE "Author" ADD COLUMN id_int INTEGER;
ALTER TABLE "media_assets" ADD COLUMN id_int INTEGER;
ALTER TABLE "media_collections" ADD COLUMN id_int INTEGER;
ALTER TABLE "media_asset_relations" ADD COLUMN id_int INTEGER;
```

### Phase 2: Map UUIDs to Integers

```sql
-- Map existing UUIDs back to original integers
UPDATE "Blog" b
SET id_int = m.int_value
FROM uuid_to_int_mapping m
WHERE b.id = m.uuid_value
  AND m.entity_type = 'blog';

-- Generate new integers for new records
UPDATE "Blog"
SET id_int = nextval('blog_id_seq')
WHERE id_int IS NULL;
```

### Phase 3: Update Foreign Keys

```sql
-- Update Article.blog_id
ALTER TABLE "Article" ADD COLUMN blog_id_int INTEGER;

UPDATE "Article" a
SET blog_id_int = b.id_int
FROM "Blog" b
WHERE a.blog_id = b.id;
```

### Phase 4: Drop UUID Columns

```sql
-- Drop UUID primary keys
ALTER TABLE "Blog" DROP CONSTRAINT "Blog_pkey";
ALTER TABLE "Blog" DROP COLUMN id;

-- Rename integer columns
ALTER TABLE "Blog" RENAME COLUMN id_int TO id;

-- Recreate primary keys
ALTER TABLE "Blog" ADD PRIMARY KEY (id);
```

### Phase 5: Restore Constraints

```sql
-- Restore foreign key constraints
ALTER TABLE "Article"
ADD CONSTRAINT "Article_blog_id_fkey"
FOREIGN KEY (blog_id) REFERENCES "Blog"(id)
ON DELETE CASCADE;

-- Restore indexes
CREATE INDEX "Article_blog_id_idx" ON "Article"(blog_id);
```

---

## Testing Rollback Procedure

### Staging Environment Test

Before production migration, test rollback in staging:

```bash
# 1. Apply UUID migration to staging
npx prisma migrate deploy

# 2. Create test data with UUIDs
node scripts/create-test-data.js

# 3. Execute rollback
npx prisma migrate deploy --name rollback-uuid-phase-5
# ... (all phases)

# 4. Verify data integrity
node scripts/verify-rollback.js

# 5. Check application functionality
pnpm test:e2e
```

### Rollback Drill

Schedule a rollback drill before production migration:

1. **Week before migration**: Announce drill
2. **Day of drill**: Execute full rollback procedure in staging
3. **After drill**: Document issues and update procedures
4. **Sign-off**: All teams confirm readiness

---

## Emergency Contacts

### Escalation Path

1. **Level 1**: Backend Team Lead - [Contact]
2. **Level 2**: CTO - [Contact]
3. **Level 3**: CEO - [Contact]

### Team Contacts

- **Backend Team**: [Contact/Channel]
- **Frontend Team**: [Contact/Channel]
- **DevOps Team**: [Contact/Channel]
- **Database Admin**: [Contact/Channel]

### External Contacts

- **Hosting Provider**: [Contact]
- **Database Support**: [Contact]
- **CDN Support**: [Contact]

---

## Lessons Learned Template

After rollback, document:

### What Went Wrong

- Root cause of issue
- Why it wasn't caught in testing
- Impact on users and business

### What Went Right

- Effective monitoring
- Quick detection
- Smooth rollback execution

### Action Items

- [ ] Fix root cause
- [ ] Enhance testing
- [ ] Update procedures
- [ ] Train team
- [ ] Schedule re-migration

---

## FAQ

### Q: Can we rollback after 48 hours?

**A**: Technically yes, but it becomes significantly more complex and risky. New data created with UUIDs must be carefully mapped, and coordination becomes more difficult.

### Q: Will we lose data during rollback?

**A**: No. All data is preserved. Only IDs change from UUID back to integers.

### Q: How long does rollback take?

**A**: 2-4 hours total, with 30-60 minutes of downtime.

### Q: Can we rollback just the backend or just the frontend?

**A**: No. Backend and frontend must rollback together to maintain compatibility.

### Q: What if rollback fails?

**A**: We have database backups from before migration and before rollback. We can restore to either point.

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-25  
**Status**: Ready for Production
