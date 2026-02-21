-- Migration: Convert MediaAsset.id from Int to UUID (12-character cuid)
-- This migration preserves all existing MediaAsset records and updates all foreign key references

-- Step 1: Add temporary UUID column to MediaAsset
ALTER TABLE "media_assets" ADD COLUMN "id_uuid" VARCHAR(12);

-- Step 2: Generate UUIDs for all existing MediaAsset records
DO $$
DECLARE
    asset_record RECORD;
    new_uuid VARCHAR(12);
BEGIN
    FOR asset_record IN SELECT id FROM "media_assets" ORDER BY id
    LOOP
        -- Generate a 12-character UUID-like string (cuid format)
        new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM "media_assets" WHERE id_uuid = new_uuid) LOOP
            new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        END LOOP;
        
        UPDATE "media_assets" SET id_uuid = new_uuid WHERE id = asset_record.id;
    END LOOP;
END $$;

-- Step 3: Add temporary asset_id_uuid columns to all referencing tables

-- Article.cover_image_id
ALTER TABLE "Article" ADD COLUMN "cover_image_id_uuid" VARCHAR(12);

-- Author.avatar_id
ALTER TABLE "Author" ADD COLUMN "avatar_id_uuid" VARCHAR(12);

-- MediaAssetRelation.asset_id
ALTER TABLE "media_asset_relations" ADD COLUMN "asset_id_uuid" VARCHAR(12);

-- LeadAttachment.asset_id
ALTER TABLE "lead_attachments" ADD COLUMN "asset_id_uuid" VARCHAR(12);

-- Step 4: Map all foreign keys to new MediaAsset UUIDs

-- Map Article.cover_image_id
UPDATE "Article" art
SET cover_image_id_uuid = ma.id_uuid
FROM "media_assets" ma
WHERE art.cover_image_id = ma.id;

-- Map Author.avatar_id
UPDATE "Author" au
SET avatar_id_uuid = ma.id_uuid
FROM "media_assets" ma
WHERE au.avatar_id = ma.id;

-- Map MediaAssetRelation.asset_id
UPDATE "media_asset_relations" mar
SET asset_id_uuid = ma.id_uuid
FROM "media_assets" ma
WHERE mar.asset_id = ma.id;

-- Map LeadAttachment.asset_id
UPDATE "lead_attachments" la
SET asset_id_uuid = ma.id_uuid
FROM "media_assets" ma
WHERE la.asset_id = ma.id;

-- Step 5: Drop old foreign key constraints
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_cover_image_id_fkey";
ALTER TABLE "Author" DROP CONSTRAINT IF EXISTS "Author_avatar_id_fkey";
ALTER TABLE "media_asset_relations" DROP CONSTRAINT IF EXISTS "MediaAssetRelation_asset_id_fkey";
ALTER TABLE "lead_attachments" DROP CONSTRAINT IF EXISTS "LeadAttachment_asset_id_fkey";

-- Step 6: Drop old MediaAsset.id primary key
ALTER TABLE "media_assets" DROP CONSTRAINT IF EXISTS "MediaAsset_pkey";
ALTER TABLE "media_assets" DROP CONSTRAINT IF EXISTS "media_assets_pkey";

-- Step 7: Drop old MediaAsset.id column and rename id_uuid to id
ALTER TABLE "media_assets" DROP COLUMN "id";
ALTER TABLE "media_assets" RENAME COLUMN "id_uuid" TO "id";

-- Step 8: Set MediaAsset.id as primary key
ALTER TABLE "media_assets" ADD PRIMARY KEY ("id");

-- Step 9: Update foreign key columns in referencing tables

-- Article.cover_image_id
ALTER TABLE "Article" DROP COLUMN "cover_image_id";
ALTER TABLE "Article" RENAME COLUMN "cover_image_id_uuid" TO "cover_image_id";

-- Author.avatar_id
ALTER TABLE "Author" DROP COLUMN "avatar_id";
ALTER TABLE "Author" RENAME COLUMN "avatar_id_uuid" TO "avatar_id";

-- MediaAssetRelation.asset_id
ALTER TABLE "media_asset_relations" DROP COLUMN "asset_id";
ALTER TABLE "media_asset_relations" RENAME COLUMN "asset_id_uuid" TO "asset_id";

-- LeadAttachment.asset_id
ALTER TABLE "lead_attachments" DROP COLUMN "asset_id";
ALTER TABLE "lead_attachments" RENAME COLUMN "asset_id_uuid" TO "asset_id";

-- Step 10: Add foreign key constraints back

-- Article.cover_image_id
ALTER TABLE "Article" 
ADD CONSTRAINT "Article_cover_image_id_fkey" 
FOREIGN KEY ("cover_image_id") REFERENCES "media_assets"("id");

-- Author.avatar_id
ALTER TABLE "Author" 
ADD CONSTRAINT "Author_avatar_id_fkey" 
FOREIGN KEY ("avatar_id") REFERENCES "media_assets"("id");

-- MediaAssetRelation.asset_id
ALTER TABLE "media_asset_relations" 
ADD CONSTRAINT "MediaAssetRelation_asset_id_fkey" 
FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE;

-- LeadAttachment.asset_id
ALTER TABLE "lead_attachments" 
ADD CONSTRAINT "LeadAttachment_asset_id_fkey" 
FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id");

-- Step 11: Recreate indexes
CREATE INDEX IF NOT EXISTS "media_assets_collection_id_idx" ON "media_assets"("collection_id");
CREATE INDEX IF NOT EXISTS "media_assets_tenant_id_idx" ON "media_assets"("tenant_id");
CREATE INDEX IF NOT EXISTS "media_assets_created_by_idx" ON "media_assets"("created_by");
CREATE INDEX IF NOT EXISTS "media_assets_status_idx" ON "media_assets"("status");

-- Verification: Check that all media assets have UUIDs
DO $$
DECLARE
    asset_count INT;
    uuid_count INT;
    article_ref_count INT;
    author_ref_count INT;
    relation_ref_count INT;
    lead_ref_count INT;
BEGIN
    SELECT COUNT(*) INTO asset_count FROM "media_assets";
    SELECT COUNT(*) INTO uuid_count FROM "media_assets" WHERE id IS NOT NULL AND LENGTH(id) = 12;
    SELECT COUNT(*) INTO article_ref_count FROM "Article" WHERE cover_image_id IS NOT NULL;
    SELECT COUNT(*) INTO author_ref_count FROM "Author" WHERE avatar_id IS NOT NULL;
    SELECT COUNT(*) INTO relation_ref_count FROM "media_asset_relations";
    SELECT COUNT(*) INTO lead_ref_count FROM "lead_attachments";
    
    IF asset_count != uuid_count THEN
        RAISE EXCEPTION 'MediaAsset UUID migration failed: % assets but only % have valid UUIDs', asset_count, uuid_count;
    END IF;
    
    -- Verify all foreign key references are valid
    IF EXISTS (
        SELECT 1 FROM "Article" a 
        WHERE a.cover_image_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM "media_assets" ma WHERE ma.id = a.cover_image_id)
    ) THEN
        RAISE EXCEPTION 'MediaAsset UUID migration failed: Some articles reference non-existent media assets';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM "Author" au 
        WHERE au.avatar_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM "media_assets" ma WHERE ma.id = au.avatar_id)
    ) THEN
        RAISE EXCEPTION 'MediaAsset UUID migration failed: Some authors reference non-existent media assets';
    END IF;
    
    RAISE NOTICE 'MediaAsset UUID migration successful: % assets migrated', asset_count;
    RAISE NOTICE '  - % article cover image references updated', article_ref_count;
    RAISE NOTICE '  - % author avatar references updated', author_ref_count;
    RAISE NOTICE '  - % asset relations updated', relation_ref_count;
    RAISE NOTICE '  - % lead attachments updated', lead_ref_count;
END $$;
