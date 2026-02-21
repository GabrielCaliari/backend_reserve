# UUID Migration - Timeline and Deployment Strategy

## Overview

This document outlines the complete timeline and deployment strategy for the UUID migration in the CMS module. The migration is planned as a coordinated release between backend and frontend teams.

**Migration Type**: Breaking change - no backward compatibility  
**Estimated Duration**: 3 weeks (preparation to completion)  
**Rollback Window**: 48 hours after production deployment

---

## Timeline Overview

```
Week 1: Preparation & Testing
├── Day 1-2: Code updates and PR reviews
├── Day 3-4: Staging deployment and testing
└── Day 5: Final validation and sign-off

Week 2: Production Migration
├── Day 1: Database migration execution
├── Day 2: API deployment
├── Day 3: Frontend deployment
├── Day 4-5: Monitoring and issue resolution

Week 3: Post-Migration
├── Day 1-3: Continued monitoring
├── Day 4: Rollback window closes
└── Day 5: Post-mortem and documentation
```

---

## Week 1: Preparation & Testing

### Day 1-2: Code Updates and PR Reviews

#### Backend Tasks

**Monday Morning (4 hours)**
- [ ] Create feature branch `feature/uuid-migration`
- [ ] Update Prisma schema with UUID types
- [ ] Generate migration scripts
- [ ] Update domain entities to use string IDs
- [ ] Update repository interfaces

**Monday Afternoon (4 hours)**
- [ ] Update repository implementations
- [ ] Update service layer
- [ ] Update DTOs and validation
- [ ] Update controllers

**Tuesday Morning (4 hours)**
- [ ] Update Swagger documentation
- [ ] Create UUID validation pipes
- [ ] Update all unit tests
- [ ] Update integration tests

**Tuesday Afternoon (4 hours)**
- [ ] Create rollback migration scripts
- [ ] Test rollback procedure in local environment
- [ ] Create PR with detailed description
- [ ] Request code review from team

#### Frontend Tasks

**Monday Morning (4 hours)**
- [ ] Create feature branch `feature/uuid-migration-frontend`
- [ ] Update all type definitions
- [ ] Update API service functions
- [ ] Update routing logic

**Monday Afternoon (4 hours)**
- [ ] Update form handling
- [ ] Update state management
- [ ] Update local storage/cache logic
- [ ] Add UUID validation utilities

**Tuesday Morning (4 hours)**
- [ ] Update all unit tests
- [ ] Update integration tests
- [ ] Update E2E tests
- [ ] Test with mocked UUID data

**Tuesday Afternoon (4 hours)**
- [ ] Create PR with detailed description
- [ ] Request code review from team
- [ ] Update frontend documentation
- [ ] Prepare deployment checklist

#### Documentation Tasks

**Tuesday Afternoon (2 hours)**
- [ ] Review all migration documentation
- [ ] Update API documentation
- [ ] Create internal team guides
- [ ] Prepare stakeholder communication

---

### Day 3-4: Staging Deployment and Testing

#### Wednesday: Staging Deployment

**Morning (9:00 AM - 12:00 PM)**

**Step 1: Database Migration (30 minutes)**
```bash
# Connect to staging database
ssh staging-db

# Backup current database
pg_dump -h localhost -U postgres -d pppi_staging \
  -f /backups/pre-uuid-migration-$(date +%Y%m%d).sql

# Verify backup
ls -lh /backups/pre-uuid-migration-*.sql

# Run migration
cd /var/www/api-pppi-staging
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

**Step 2: Backend Deployment (30 minutes)**
```bash
# Deploy backend
cd /var/www/api-pppi-staging
git checkout feature/uuid-migration
pnpm install
pnpm build
pm2 restart api-staging

# Verify deployment
curl https://staging-api.pppi.com.br/health
```

**Step 3: Frontend Deployment (30 minutes)**
```bash
# Deploy frontend
cd /var/www/frontend-cms-staging
git checkout feature/uuid-migration-frontend
pnpm install
pnpm build
pm2 restart frontend-staging

# Clear CDN cache
# (if applicable)
```

**Step 4: Smoke Tests (30 minutes)**
```bash
# Run automated smoke tests
pnpm test:e2e:smoke

# Manual verification:
# - Can list blogs
# - Can create blog
# - Can view blog details
# - Can list articles
# - Can create article
# - Can view article details
```

**Afternoon (1:00 PM - 5:00 PM)**

**Step 5: Comprehensive Testing (4 hours)**

Test all CMS functionality:
- [ ] Blog CRUD operations
- [ ] Article CRUD operations
- [ ] Author CRUD operations
- [ ] Media asset upload and management
- [ ] Media collection management
- [ ] Article publishing workflow
- [ ] Image assignment to articles
- [ ] Author avatar assignment
- [ ] Search and filtering
- [ ] Pagination
- [ ] Sorting

**Step 6: Performance Testing (1 hour)**
```bash
# Run load tests
artillery run load-tests/cms-endpoints.yml

# Monitor database performance
psql -h staging-db -U postgres -d pppi_staging -c "
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%Blog%' OR query LIKE '%Article%'
ORDER BY mean_exec_time DESC
LIMIT 20;
"
```

**Step 7: Integration Testing (1 hour)**
- [ ] Test frontend-backend integration
- [ ] Test API authentication
- [ ] Test file uploads
- [ ] Test error handling
- [ ] Test validation messages

#### Thursday: Issue Resolution and Validation

**Morning (9:00 AM - 12:00 PM)**

**Step 1: Review Test Results (1 hour)**
- [ ] Analyze test failures
- [ ] Categorize issues by severity
- [ ] Create issue tickets
- [ ] Assign to team members

**Step 2: Fix Critical Issues (2 hours)**
- [ ] Fix blocking issues
- [ ] Deploy fixes to staging
- [ ] Re-run affected tests
- [ ] Verify fixes

**Afternoon (1:00 PM - 5:00 PM)**

**Step 3: Regression Testing (2 hours)**
- [ ] Re-run full test suite
- [ ] Verify all fixes
- [ ] Test edge cases
- [ ] Test error scenarios

**Step 4: User Acceptance Testing (2 hours)**
- [ ] Invite stakeholders to test
- [ ] Collect feedback
- [ ] Document any concerns
- [ ] Address feedback

---

### Day 5: Final Validation and Sign-off

#### Friday Morning (9:00 AM - 12:00 PM)

**Step 1: Final Testing (2 hours)**
- [ ] Run complete test suite
- [ ] Verify all issues resolved
- [ ] Test rollback procedure
- [ ] Verify rollback works correctly

**Step 2: Documentation Review (1 hour)**
- [ ] Review all documentation
- [ ] Update any outdated information
- [ ] Verify examples are correct
- [ ] Check for typos and errors

#### Friday Afternoon (1:00 PM - 5:00 PM)

**Step 3: Team Sign-off (2 hours)**

Meeting with all stakeholders:
- [ ] Backend team lead sign-off
- [ ] Frontend team lead sign-off
- [ ] QA team sign-off
- [ ] Product owner sign-off
- [ ] DevOps team sign-off

**Step 4: Production Preparation (2 hours)**
- [ ] Schedule production deployment
- [ ] Prepare deployment runbook
- [ ] Assign roles and responsibilities
- [ ] Set up monitoring alerts
- [ ] Prepare communication templates

**Step 5: Go/No-Go Decision (1 hour)**

Final decision meeting:
- [ ] Review all test results
- [ ] Review team sign-offs
- [ ] Assess risks
- [ ] Make final decision
- [ ] Communicate decision to all teams

---

## Week 2: Production Migration

### Day 1 (Monday): Database Migration

**Pre-Migration Checklist**
- [ ] All teams are available
- [ ] Rollback procedure tested
- [ ] Monitoring alerts configured
- [ ] Communication channels ready
- [ ] Backup verified

**Timeline: 9:00 AM - 12:00 PM (3 hours)**

**9:00 AM - Enable Maintenance Mode (15 minutes)**
```bash
# Notify users
curl -X POST https://api.pppi.com.br/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "enabled": true,
    "message": "Sistema em manutenção. Retornaremos em breve."
  }'

# Send email notification to all users
node scripts/notify-maintenance.js
```

**9:15 AM - Stop Background Jobs (15 minutes)**
```bash
# Stop all workers
pm2 stop api-worker
pm2 stop api-queue

# Verify all jobs stopped
pm2 list
```

**9:30 AM - Database Backup (30 minutes)**
```bash
# Full database backup
pg_dump -h production-db -U postgres -d pppi_production \
  -f /backups/pre-uuid-migration-$(date +%Y%m%d-%H%M%S).sql

# Verify backup size and integrity
ls -lh /backups/pre-uuid-migration-*.sql
pg_restore --list /backups/pre-uuid-migration-*.sql | head -20

# Copy backup to secure location
aws s3 cp /backups/pre-uuid-migration-*.sql \
  s3://pppi-backups/critical/
```

**10:00 AM - Execute Migration (60 minutes)**
```bash
# Connect to production server
ssh production-api

# Navigate to project
cd /var/www/api-pppi

# Run migration
npx prisma migrate deploy

# Monitor migration progress
tail -f /var/log/postgresql/postgresql-*.log
```

**11:00 AM - Verify Migration (30 minutes)**
```sql
-- Connect to database
psql -h production-db -U postgres -d pppi_production

-- Verify record counts
SELECT 'Blog' as table_name, COUNT(*) as count FROM "Blog"
UNION ALL
SELECT 'Article', COUNT(*) FROM "Article"
UNION ALL
SELECT 'Author', COUNT(*) FROM "Author"
UNION ALL
SELECT 'MediaAsset', COUNT(*) FROM "media_assets"
UNION ALL
SELECT 'MediaCollection', COUNT(*) FROM "media_collections";

-- Verify UUID format
SELECT id, name FROM "Blog" LIMIT 5;
SELECT id, blog_id, author_id FROM "Article" LIMIT 5;

-- Verify foreign key integrity
SELECT COUNT(*) FROM "Article" a
LEFT JOIN "Blog" b ON a.blog_id = b.id
WHERE b.id IS NULL;
-- Should return 0

-- Verify no orphaned records
SELECT COUNT(*) FROM "Article" a
LEFT JOIN "Author" au ON a.author_id = au.id
WHERE au.id IS NULL;
-- Should return 0
```

**11:30 AM - Decision Point**

✅ **If migration successful:**
- Proceed to Day 2 (API deployment)
- Keep maintenance mode enabled
- Monitor database performance

❌ **If migration failed:**
- Initiate rollback procedure
- Follow rollback documentation
- Notify all stakeholders

---

### Day 2 (Tuesday): API Deployment

**Timeline: 9:00 AM - 12:00 PM (3 hours)**

**9:00 AM - Deploy Backend (30 minutes)**
```bash
# Deploy new backend version
cd /var/www/api-pppi
git checkout main
git pull origin main
pnpm install
pnpm build

# Regenerate Prisma client
npx prisma generate

# Restart application
pm2 restart api

# Verify deployment
curl https://api.pppi.com.br/health
```

**9:30 AM - Smoke Tests (30 minutes)**
```bash
# Run automated smoke tests
pnpm test:e2e:smoke

# Manual API tests
curl https://api.pppi.com.br/api/v2/cms/blogs/ckl1234abcd5 \
  -H "Authorization: Bearer $TEST_TOKEN"

# Should return blog with UUID
```

**10:00 AM - Comprehensive API Testing (60 minutes)**

Test all endpoints:
- [ ] GET /api/v2/cms/blogs
- [ ] GET /api/v2/cms/blogs/:id
- [ ] POST /api/v2/cms/blogs
- [ ] PUT /api/v2/cms/blogs/:id
- [ ] DELETE /api/v2/cms/blogs/:id
- [ ] GET /api/v2/cms/articles
- [ ] GET /api/v2/cms/articles/:id
- [ ] POST /api/v2/cms/articles
- [ ] PUT /api/v2/cms/articles/:id
- [ ] DELETE /api/v2/cms/articles/:id
- [ ] GET /api/v2/cms/authors
- [ ] GET /api/v2/cms/authors/:id
- [ ] POST /api/v2/cms/authors
- [ ] PUT /api/v2/cms/authors/:id
- [ ] DELETE /api/v2/cms/authors/:id

**11:00 AM - Performance Monitoring (30 minutes)**
```bash
# Monitor API response times
artillery run load-tests/cms-endpoints.yml

# Monitor error rates
tail -f /var/log/api-pppi/error.log

# Monitor database connections
psql -h production-db -U postgres -d pppi_production -c "
SELECT 
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE datname = 'pppi_production'
GROUP BY state;
"
```

**11:30 AM - Decision Point**

✅ **If API deployment successful:**
- Proceed to Day 3 (Frontend deployment)
- Keep maintenance mode enabled
- Continue monitoring

❌ **If API deployment failed:**
- Rollback API deployment
- Investigate issues
- Fix and redeploy

---

### Day 3 (Wednesday): Frontend Deployment

**Timeline: 9:00 AM - 2:00 PM (5 hours)**

**9:00 AM - Deploy Frontend Applications (2 hours)**

For each frontend application:
```bash
# CMS Admin Panel
cd /var/www/frontend-cms
git checkout main
git pull origin main
pnpm install
pnpm build
pm2 restart frontend-cms

# Public Blog Site
cd /var/www/frontend-blog
git checkout main
git pull origin main
pnpm install
pnpm build
pm2 restart frontend-blog

# Mobile App API (if applicable)
# Deploy updated mobile app to app stores
```

**11:00 AM - Clear Caches (30 minutes)**
```bash
# Clear CDN cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'

# Clear Redis cache
redis-cli FLUSHALL

# Clear browser cache (instruct users)
# Send notification to clear browser cache
```

**11:30 AM - Disable Maintenance Mode (15 minutes)**
```bash
# Disable maintenance mode
curl -X POST https://api.pppi.com.br/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'

# Restart background jobs
pm2 restart api-worker
pm2 restart api-queue

# Send notification to users
node scripts/notify-system-restored.js
```

**11:45 AM - User Acceptance Testing (2 hours)**

Test complete user workflows:
- [ ] Admin login
- [ ] Create new blog
- [ ] Create new article
- [ ] Upload cover image
- [ ] Publish article
- [ ] View published article
- [ ] Edit article
- [ ] Create author
- [ ] Assign author to article
- [ ] Upload author avatar

**1:45 PM - Monitor User Activity (15 minutes)**
```bash
# Monitor active users
psql -h production-db -U postgres -d pppi_production -c "
SELECT COUNT(DISTINCT user_id) as active_users
FROM user_sessions
WHERE last_activity > NOW() - INTERVAL '15 minutes';
"

# Monitor error rates
tail -f /var/log/api-pppi/error.log | grep -i "error"

# Monitor API response times
curl https://api.pppi.com.br/metrics
```

---

### Day 4-5 (Thursday-Friday): Monitoring and Issue Resolution

**Continuous Monitoring (48 hours)**

**Metrics to Monitor:**
- [ ] API response times
- [ ] Error rates
- [ ] Database performance
- [ ] User activity
- [ ] Support tickets
- [ ] User feedback

**Monitoring Tools:**
```bash
# Set up monitoring dashboard
# - Grafana for metrics
# - Sentry for error tracking
# - New Relic for APM
# - CloudWatch for AWS resources

# Configure alerts
# - Response time > 2 seconds
# - Error rate > 1%
# - Database connections > 80%
# - Disk usage > 85%
```

**Issue Resolution Process:**

1. **Detect Issue**
   - Monitoring alert triggered
   - User report received
   - Support ticket created

2. **Assess Severity**
   - Critical: System down or data loss
   - High: Core functionality broken
   - Medium: Non-critical feature broken
   - Low: Minor UI issue

3. **Respond**
   - Critical: Immediate rollback consideration
   - High: Fix within 4 hours
   - Medium: Fix within 24 hours
   - Low: Fix in next release

4. **Fix and Deploy**
   - Create hotfix branch
   - Fix issue
   - Test fix
   - Deploy to production
   - Verify fix

---

## Week 3: Post-Migration

### Day 1-3 (Monday-Wednesday): Continued Monitoring

**Daily Tasks:**
- [ ] Review monitoring dashboards
- [ ] Analyze error logs
- [ ] Review support tickets
- [ ] Check user feedback
- [ ] Monitor performance metrics
- [ ] Document any issues

**Daily Stand-up (15 minutes)**
- What issues were found?
- What was fixed?
- What needs attention?
- Any rollback considerations?

---

### Day 4 (Thursday): Rollback Window Closes

**9:00 AM - Final Assessment**

Meeting with all stakeholders:
- [ ] Review all metrics
- [ ] Review all issues
- [ ] Assess overall success
- [ ] Make final decision on rollback window

**Decision:**
- ✅ Close rollback window (migration successful)
- ❌ Extend rollback window (issues found)
- ⚠️ Initiate rollback (critical issues)

**If closing rollback window:**
```bash
# Archive rollback scripts
mv prisma/migrations/rollback-* prisma/migrations/archive/

# Update documentation
echo "Rollback window closed: $(date)" >> docs/UUID-MIGRATION-STATUS.md

# Notify teams
# Send notification that rollback is no longer available
```

---

### Day 5 (Friday): Post-Mortem and Documentation

**Morning: Post-Mortem Meeting (2 hours)**

Agenda:
1. **What went well?**
   - Successful aspects of migration
   - Effective processes
   - Good decisions

2. **What went wrong?**
   - Issues encountered
   - Unexpected problems
   - Poor decisions

3. **What did we learn?**
   - Technical lessons
   - Process improvements
   - Team collaboration

4. **Action items**
   - Process improvements
   - Documentation updates
   - Training needs

**Afternoon: Documentation (3 hours)**

- [ ] Update migration documentation
- [ ] Document lessons learned
- [ ] Update runbooks
- [ ] Create knowledge base articles
- [ ] Update team wiki
- [ ] Archive migration artifacts

---

## Communication Plan

### Stakeholder Communication

**Week 1:**
- **Monday**: Announce migration schedule
- **Wednesday**: Staging deployment notification
- **Friday**: Go/No-Go decision announcement

**Week 2:**
- **Monday**: Production migration start notification
- **Monday**: Maintenance mode notification
- **Wednesday**: System restored notification
- **Friday**: Migration success announcement

**Week 3:**
- **Thursday**: Rollback window closing notification
- **Friday**: Post-mortem summary

### Communication Templates

#### Maintenance Notification

```
Subject: Scheduled Maintenance - CMS System Upgrade

Dear Users,

We will be performing a scheduled maintenance on the CMS system:

Date: [DATE]
Time: 9:00 AM - 2:00 PM (BRT)
Duration: Approximately 5 hours
Impact: CMS will be unavailable during this time

What's changing:
- System upgrade to improve performance and security
- All your data will be preserved
- No action required from your side

We apologize for any inconvenience.

Best regards,
PPPI Team
```

#### System Restored Notification

```
Subject: CMS System Restored - Upgrade Complete

Dear Users,

The CMS system maintenance has been completed successfully.

The system is now available with improved performance and security.

If you experience any issues, please:
1. Clear your browser cache
2. Refresh the page
3. Contact support if issues persist

Thank you for your patience.

Best regards,
PPPI Team
```

---

## Rollback Decision Matrix

| Scenario | Severity | Action | Timeline |
|----------|----------|--------|----------|
| Data loss detected | Critical | Immediate rollback | Within 1 hour |
| System completely down | Critical | Immediate rollback | Within 1 hour |
| >50% users affected | High | Consider rollback | Within 4 hours |
| Core feature broken | High | Fix or rollback | Within 4 hours |
| <25% users affected | Medium | Fix forward | Within 24 hours |
| Minor UI issues | Low | Fix forward | Next release |

---

## Success Criteria

Migration is considered successful if:

- [ ] Zero data loss
- [ ] <1% error rate
- [ ] <2 second average response time
- [ ] <5% user complaints
- [ ] All core features working
- [ ] No critical bugs
- [ ] Rollback not required

---

## Contacts and Escalation

### Team Contacts
- **Backend Lead**: [Name] - [Contact]
- **Frontend Lead**: [Name] - [Contact]
- **DevOps Lead**: [Name] - [Contact]
- **QA Lead**: [Name] - [Contact]
- **Product Owner**: [Name] - [Contact]

### Escalation Path
1. **Level 1**: Team Leads (0-2 hours)
2. **Level 2**: CTO (2-4 hours)
3. **Level 3**: CEO (4+ hours)

### Emergency Contacts
- **On-Call Engineer**: [Contact]
- **Database Admin**: [Contact]
- **Infrastructure**: [Contact]

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-25  
**Status**: Ready for Execution
