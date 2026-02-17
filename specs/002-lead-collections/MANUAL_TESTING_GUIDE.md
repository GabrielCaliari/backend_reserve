# Manual Testing Guide - Lead Collections

**Feature**: Lead Collections per Tenant  
**Purpose**: Step-by-step guide for manual testing of all functionality  
**Prerequisites**: API running locally, Postman/Insomnia/curl available

## Setup

1. Start the API: `npm run start:dev`
2. Ensure database is running and migrated
3. Have admin credentials ready for authentication
4. API Base URL: `http://localhost:3002`

## Authentication

All admin endpoints require JWT authentication. First, authenticate:

```bash
POST /auth/admin/authenticate
Content-Type: application/json

{
  "email": "admin@zarp.com.br",
  "password": "your_password"
}
```

Save the `session_token` and `session_id` from the response. Use them in subsequent requests:

```
Authorization: Bearer <session_token>
session-id: <session_id>
```

## Test Scenarios

### Scenario 1: Create Public Collection

**Objective**: Create a collection with public access mode

```bash
POST /leads/collections
Authorization: Bearer <token>
session-id: <session_id>
Content-Type: application/json

{
  "name": "Landing Page Home",
  "source": "website-main",
  "access_mode": "public"
}
```

**Expected Result**:
- Status: 201
- Response contains collection with auto-generated slug
- `accessMode` is "public"
- No `secretKey` in response

**Save**: Collection ID and slug for next tests

---

### Scenario 2: List Collections

**Objective**: Verify collection listing with pagination

```bash
GET /leads/collections?page=1&limit=10
Authorization: Bearer <token>
session-id: <session_id>
```

**Expected Result**:
- Status: 200
- Response contains array of collections
- Meta object with pagination info
- Only collections from your tenant visible

---

### Scenario 3: Get Collection by ID

**Objective**: Retrieve specific collection details

```bash
GET /leads/collections/{id}
Authorization: Bearer <token>
session-id: <session_id>
```

**Expected Result**:
- Status: 200
- Full collection details returned
- If ID belongs to another tenant: 404

---

### Scenario 4: Submit Lead to Public Collection

**Objective**: Test public lead capture endpoint

```bash
POST /collect/{slug}
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+5511999999999",
  "origin": 6,
  "data": {
    "utm_source": "google",
    "utm_campaign": "test"
  }
}
```

**Expected Result**:
- Status: 201
- Response: `{ "success": true, "data": { "id": <lead_id> } }`
- No authentication required
- Works from any origin

---

### Scenario 5: Update Collection to Private (CORS)

**Objective**: Change access mode to private with CORS restrictions

```bash
PUT /leads/collections/{id}
Authorization: Bearer <token>
session-id: <session_id>
Content-Type: application/json

{
  "access_mode": "private",
  "allowed_domains": ["https://example.com", "https://app.example.com"]
}
```

**Expected Result**:
- Status: 200
- Collection updated
- No `secretKey` in response (not restricted mode)

---

### Scenario 6: Test CORS Enforcement

**Objective**: Verify private collection blocks non-whitelisted origins

**Test A - Allowed Origin**:
```bash
POST /collect/{slug}
Origin: https://example.com
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "origin": 6
}
```

**Expected**: Status 201 (success)

**Test B - Blocked Origin**:
```bash
POST /collect/{slug}
Origin: https://other-domain.com
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "origin": 6
}
```

**Expected**: Status 403 (Forbidden - Origin not allowed)

---

### Scenario 7: Update Collection to Restricted (Auth)

**Objective**: Change to restricted mode and receive secret key

```bash
PUT /leads/collections/{id}
Authorization: Bearer <token>
session-id: <session_id>
Content-Type: application/json

{
  "access_mode": "restricted"
}
```

**Expected Result**:
- Status: 200
- Response includes `secretKey` field (starts with `ck_live_`)
- **IMPORTANT**: Save this key - it's shown only once!

**Save**: The secret key for next tests

---

### Scenario 8: Test Restricted Collection with Valid Key

**Objective**: Submit lead with valid secret key

```bash
POST /collect/{slug}
x-collection-key: <secret_key>
Content-Type: application/json

{
  "name": "Bob Smith",
  "email": "bob@example.com",
  "origin": 6
}
```

**Expected Result**:
- Status: 201
- Lead created successfully

---

### Scenario 9: Test Restricted Collection without Key

**Objective**: Verify authentication is required

```bash
POST /collect/{slug}
Content-Type: application/json

{
  "name": "Bob Smith",
  "email": "bob@example.com",
  "origin": 6
}
```

**Expected Result**:
- Status: 400
- Error: "Missing x-collection-key header"

---

### Scenario 10: Test Restricted Collection with Invalid Key

**Objective**: Verify invalid keys are rejected

```bash
POST /collect/{slug}
x-collection-key: ck_live_invalid_key_123
Content-Type: application/json

{
  "name": "Bob Smith",
  "email": "bob@example.com",
  "origin": 6
}
```

**Expected Result**:
- Status: 400
- Error: "Invalid collection key"

---

### Scenario 11: Regenerate Secret Key

**Objective**: Generate new key and invalidate old one

```bash
POST /leads/collections/{id}/regenerate-key
Authorization: Bearer <token>
session-id: <session_id>
```

**Expected Result**:
- Status: 200
- Response contains new `secretKey`
- Old key is immediately invalid

**Verify**: Try using old key - should fail with 400

---

### Scenario 12: List Leads in Collection

**Objective**: View leads captured through specific collection

```bash
GET /leads/collections/{id}/leads?page=1&limit=30
Authorization: Bearer <token>
session-id: <session_id>
```

**Expected Result**:
- Status: 200
- Array of leads from this collection only
- Pagination metadata included
- Leads show collection_id matching the collection

---

### Scenario 13: Deactivate Collection

**Objective**: Stop collection from accepting new leads

```bash
DELETE /leads/collections/{id}
Authorization: Bearer <token>
session-id: <session_id>
```

**Expected Result**:
- Status: 200
- Collection marked as inactive

---

### Scenario 14: Test Inactive Collection

**Objective**: Verify inactive collection rejects leads

```bash
POST /collect/{slug}
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "origin": 6
}
```

**Expected Result**:
- Status: 410 (Gone)
- Error: "Collection is not accepting leads"

---

### Scenario 15: Reactivate Collection

**Objective**: Make collection active again

```bash
PUT /leads/collections/{id}
Authorization: Bearer <token>
session-id: <session_id>
Content-Type: application/json

{
  "active": true
}
```

**Expected Result**:
- Status: 200
- Collection active again
- Can accept leads immediately

---

### Scenario 16: Change Back to Public

**Objective**: Remove restrictions and clear secret key

```bash
PUT /leads/collections/{id}
Authorization: Bearer <token>
session-id: <session_id>
Content-Type: application/json

{
  "access_mode": "public"
}
```

**Expected Result**:
- Status: 200
- Secret key cleared from database
- Collection accepts leads from any origin without auth

---

### Scenario 17: Test Tenant Isolation

**Objective**: Verify admins cannot access other tenants' collections

**Setup**: Need two admin accounts from different tenants

1. Authenticate as Admin A (Tenant 1)
2. Create collection as Admin A
3. Note the collection ID
4. Authenticate as Admin B (Tenant 2)
5. Try to access Admin A's collection:

```bash
GET /leads/collections/{admin_a_collection_id}
Authorization: Bearer <admin_b_token>
session-id: <admin_b_session_id>
```

**Expected Result**:
- Status: 404
- Admin B cannot see Admin A's collection

---

### Scenario 18: Test Super Admin Cross-Tenant Access

**Objective**: Verify super admin can see all collections

**Setup**: Need super admin account

1. Authenticate as Super Admin
2. List all collections:

```bash
GET /leads/collections
Authorization: Bearer <super_admin_token>
session-id: <super_admin_session_id>
```

**Expected Result**:
- Status: 200
- Collections from ALL tenants visible
- Each collection shows its tenant_id

---

### Scenario 19: Test Role Enforcement

**Objective**: Verify viewer cannot create/update collections

**Setup**: Need viewer role account

1. Authenticate as Viewer
2. Try to create collection:

```bash
POST /leads/collections
Authorization: Bearer <viewer_token>
session-id: <viewer_session_id>
Content-Type: application/json

{
  "name": "Test Collection",
  "source": "test",
  "access_mode": "public"
}
```

**Expected Result**:
- Status: 403
- Error: Insufficient permissions

---

### Scenario 20: Test Validation

**Objective**: Verify input validation works

**Test A - Missing Required Fields**:
```bash
POST /leads/collections
Authorization: Bearer <token>
session-id: <session_id>
Content-Type: application/json

{
  "name": "Test"
  // Missing 'source'
}
```

**Expected**: Status 400 (Validation error)

**Test B - Invalid Access Mode**:
```bash
POST /leads/collections
Authorization: Bearer <token>
session-id: <session_id>
Content-Type: application/json

{
  "name": "Test",
  "source": "test",
  "access_mode": "invalid_mode"
}
```

**Expected**: Status 400 (Invalid enum value)

**Test C - Lead with No Contact Info**:
```bash
POST /collect/{slug}
Content-Type: application/json

{
  "origin": 6
  // No name, email, or phone_number
}
```

**Expected**: Status 400 (At least one contact field required)

---

## Verification Checklist

After completing all scenarios, verify:

- [ ] Collections can be created with all three access modes
- [ ] Slug generation works correctly (lowercase, hyphenated)
- [ ] Public collections accept leads without restrictions
- [ ] Private collections enforce CORS correctly
- [ ] Restricted collections require valid secret keys
- [ ] Secret keys can be regenerated
- [ ] Old keys are invalidated immediately
- [ ] Inactive collections reject new leads (410)
- [ ] Leads are associated with correct collection and tenant
- [ ] Collection-scoped lead listing works
- [ ] Pagination works on all list endpoints
- [ ] Tenant isolation is enforced
- [ ] Super admin can access all tenants
- [ ] Role-based access control works
- [ ] Input validation catches errors
- [ ] Error messages are clear and helpful

## Common Issues & Troubleshooting

### Issue: 401 Unauthorized
- Check JWT token is valid and not expired
- Verify `session-id` header is included
- Ensure token format is `Bearer <token>`

### Issue: 403 Forbidden
- Check user role (viewer cannot create/update)
- Verify user belongs to the tenant
- For CORS: check Origin header matches allowed domains

### Issue: 404 Not Found
- Verify collection ID is correct
- Check collection belongs to your tenant
- Ensure collection exists in database

### Issue: 410 Gone
- Collection is inactive
- Reactivate via PUT endpoint with `active: true`

### Issue: 400 Bad Request
- Check request body format (valid JSON)
- Verify all required fields are present
- For restricted collections: include `x-collection-key` header
- For leads: at least one of name/email/phone_number required

## Performance Testing

After functional testing, test performance:

1. **Load Test Capture Endpoint**:
   - Use tool like Apache Bench or k6
   - Target: 100+ requests/second
   - Expected: < 500ms response time

2. **Pagination Performance**:
   - Create 1000+ leads in a collection
   - Test listing with various page sizes
   - Verify consistent response times

3. **Concurrent Access**:
   - Multiple admins accessing same collection
   - Verify no race conditions
   - Check data consistency

## Cleanup

After testing, clean up test data:

```bash
# Deactivate test collections
DELETE /leads/collections/{id}

# Or delete from database directly if needed
```

## Notes

- Save all test collection IDs and slugs for reference
- Document any unexpected behavior
- Take screenshots of Swagger documentation
- Test with different browsers for CORS scenarios
- Use network tab to inspect headers and responses
