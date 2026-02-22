-- Add tracking fields to Lead table for geolocation and analytics
ALTER TABLE "Lead" ADD COLUMN "ip_address" VARCHAR(45);
ALTER TABLE "Lead" ADD COLUMN "user_agent" TEXT;
ALTER TABLE "Lead" ADD COLUMN "country" VARCHAR(100);
ALTER TABLE "Lead" ADD COLUMN "city" VARCHAR(100);
ALTER TABLE "Lead" ADD COLUMN "region" VARCHAR(100);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "Lead_country_idx" ON "Lead"("country");
CREATE INDEX IF NOT EXISTS "Lead_city_idx" ON "Lead"("city");
CREATE INDEX IF NOT EXISTS "Lead_created_at_idx" ON "Lead"("created_at");
