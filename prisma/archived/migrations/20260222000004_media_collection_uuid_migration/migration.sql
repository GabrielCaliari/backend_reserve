-- Migration: Convert MediaCollection.id from Int to UUID (12-character cuid)
-- This migration preserves all existing MediaCollection records and updates MediaAsset.collection_id references

-- Step 1: Add temporary UUID column to MediaCollection
ALTER TABLE "media_collections" ADD COLUMN "id_uuid" VARCHAR(12);

-- Step 2: Generate UUIDs for all existing MediaCollection records
DO $$
DECLARE
    collection_record RECORD;
    new_uuid VARCHAR(12);
BEGIN
    FOR collection_record IN SELECT id FROM "media_collections" ORDER BY id
    LOOP
        -- Generate a 12-character UUID-like string (cuid format)
        new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM "media_collections" WHERE id_uuid = new_uuid) LOOP
            new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        END LOOP;
        
        UPDATE "media_collections" SET id_uuid = new_uuid WHERE id = collection_record.id;
    END LOOP;
END $$;

-- Step 3: Add temporary collection_id_uuid column to MediaAsset
ALTER TABLE "media_assets" ADD COLUMN "collection_id_uuid" VARCHAR(12);

-- Step 4: Map MediaAsset.collection_id to new MediaCollection UUIDs
UPDATE "media_assets" ma
SET collection_id_uuid = mc.id_uuid
FROM "media_collections" mc
WHERE ma.collection_id = mc.id;

-- Step 5: Drop old foreign key constraint
ALTER TABLE "media_assets" DROP CONSTRAINT IF EXISTS "MediaAsset_collection_id_fkey";
ALTER TABLE "media_assets" DROP CONSTRAINT IF EXISTS "media_assets_collection_id_fkey";

-- Step 6: Drop old MediaCollection.id primary key
ALTER TABLE "media_collections" DROP CONSTRAINT IF EXISTS "MediaCollection_pkey";
ALTER TABLE "media_collections" DROP CONSTRAINT IF EXISTS "media_collections_pkey";

-- Step 7: Drop old MediaCollection.id column and rename id_uuid to id
ALTER TABLE "media_collections" DROP COLUMN "id";
ALTER TABLE "media_collections" RENAME COLUMN "id_uuid" TO "id";

-- Step 8: Set MediaCollection.id as primary key
ALTER TABLE "media_collections" ADD PRIMARY KEY ("id");

-- Step 9: Update MediaAsset.collection_id
ALTER TABLE "media_assets" DROP COLUMN "collection_id";
ALTER TABLE "media_assets" RENAME COLUMN "collection_id_uuid" TO "collection_id";

-- Step 10: Add foreign key constraint back
ALTER TABLE "media_assets" 
ADD CONSTRAINT "media_assets_collection_id_fkey" 
FOREIGN KEY ("collection_id") REFERENCES "media_collections"("id") ON DELETE CASCADE;

-- Step 11: Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS "media_collections_tenant_id_slug_key" 
ON "media_collections"("tenant_id", "slug");

CREATE INDEX IF NOT EXISTS "media_collections_tenant_id_idx" 
ON "media_collections"("tenant_id");

-- Verification: Check that all collections have UUIDs
DO $$
DECLARE
    collection_count INT;
    uuid_count INT;
    asset_ref_count INT;
BEGIN
    SELECT COUNT(*) INTO collection_count FROM "media_collections";
    SELECT COUNT(*) INTO uuid_count FROM "media_collections" WHERE id IS NOT NULL AND LENGTH(id) = 12;
    SELECT COUNT(*) INTO asset_ref_count FROM "media_assets";
    
    IF collection_count != uuid_count THEN
        RAISE EXCEPTION 'MediaCollection UUID migration failed: % collections but only % have valid UUIDs', collection_count, uuid_count;
    END IF;
    
    -- Verify all MediaAsset.collection_id references are valid
    IF EXISTS (
        SELECT 1 FROM "media_assets" ma 
        WHERE NOT EXISTS (SELECT 1 FROM "media_collections" mc WHERE mc.id = ma.collection_id)
    ) THEN
        RAISE EXCEPTION 'MediaCollection UUID migration failed: Some media assets reference non-existent collections';
    END IF;
    
    RAISE NOTICE 'MediaCollection UUID migration successful: % collections migrated, % asset references updated', collection_count, asset_ref_count;
END $$;
