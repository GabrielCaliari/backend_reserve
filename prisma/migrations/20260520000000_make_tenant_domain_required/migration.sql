-- Make Tenant.domain required (NOT NULL)
-- All existing tenants must have domain set before this migration runs.
ALTER TABLE "Tenant" ALTER COLUMN "domain" SET NOT NULL;
