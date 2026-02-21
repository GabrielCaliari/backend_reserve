-- Migration: Convert MediaAssetRelation.id from Int to UUID (12-character cuid)
-- This migration preserves all existing MediaAssetRelation records and updates entity_id_type based on entity_type

-- Step 1: Add temporary UUID column to MediaAssetRelation
ALTER TABLE "media_asset_relations" ADD COLUMN "id_uuid" VARCHAR(12);

-- Step 2: Generate UUIDs for all existing MediaAssetRelation records
DO $$
DECLARE
    relation_record RECORD;
    new_uuid VARCHAR(12);
BEGIN
    FOR relation_record IN SELECT id FROM "media_asset_relations" ORDER BY id
    LOOP
        -- Generate a 12-character UUID-like string (cuid format)
        new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM "media_asset_relations" WHERE id_uuid = new_uuid) LOOP
            new_uuid := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12);
        END LOOP;
        
        UPDATE "media_asset_relations" SET id_uuid = new_uuid WHERE id = relation_record.id;
    END LOOP;
END $$;

-- Step 3: Set entity_id_type based on entity_type
-- 'article' and 'author' entities now use UUID, others remain as 'int'
UPDATE "media_asset_relations"
SET entity_id_type = CASE 
    WHEN entity_type IN ('article', 'author') THEN 'uuid'
    ELSE 'int'
END
WHERE entity_id_type IS NULL OR entity_id_type = '';

-- Step 4: Drop old MediaAssetRelation.id primary key
ALTER TABLE "media_asset_relations" DROP CONSTRAINT IF EXISTS "MediaAssetRelation_pkey";
ALTER TABLE "media_asset_relations" DROP CONSTRAINT IF EXISTS "media_asset_relations_pkey";

-- Step 5: Drop old MediaAssetRelation.id column and rename id_uuid to id
ALTER TABLE "media_asset_relations" DROP COLUMN "id";
ALTER TABLE "media_asset_relations" RENAME COLUMN "id_uuid" TO "id";

-- Step 6: Set MediaAssetRelation.id as primary key
ALTER TABLE "media_asset_relations" ADD PRIMARY KEY ("id");

-- Step 7: Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS "media_asset_relations_asset_id_entity_type_entity_id_relation_type_key" 
ON "media_asset_relations"("asset_id", "entity_type", "entity_id", "relation_type");

CREATE INDEX IF NOT EXISTS "media_asset_relations_entity_type_entity_id_idx" 
ON "media_asset_relations"("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "media_asset_relations_asset_id_idx" 
ON "media_asset_relations"("asset_id");

-- Verification: Check that all relations have UUIDs and correct entity_id_type
DO $$
DECLARE
    relation_count INT;
    uuid_count INT;
    article_relation_count INT;
    author_relation_count INT;
    other_relation_count INT;
BEGIN
    SELECT COUNT(*) INTO relation_count FROM "media_asset_relations";
    SELECT COUNT(*) INTO uuid_count FROM "media_asset_relations" WHERE id IS NOT NULL AND LENGTH(id) = 12;
    SELECT COUNT(*) INTO article_relation_count FROM "media_asset_relations" WHERE entity_type = 'article';
    SELECT COUNT(*) INTO author_relation_count FROM "media_asset_relations" WHERE entity_type = 'author';
    SELECT COUNT(*) INTO other_relation_count FROM "media_asset_relations" WHERE entity_type NOT IN ('article', 'author');
    
    IF relation_count != uuid_count THEN
        RAISE EXCEPTION 'MediaAssetRelation UUID migration failed: % relations but only % have valid UUIDs', relation_count, uuid_count;
    END IF;
    
    -- Verify entity_id_type is set correctly for article relations
    IF EXISTS (
        SELECT 1 FROM "media_asset_relations" 
        WHERE entity_type = 'article' AND entity_id_type != 'uuid'
    ) THEN
        RAISE EXCEPTION 'MediaAssetRelation UUID migration failed: Some article relations have incorrect entity_id_type';
    END IF;
    
    -- Verify entity_id_type is set correctly for author relations
    IF EXISTS (
        SELECT 1 FROM "media_asset_relations" 
        WHERE entity_type = 'author' AND entity_id_type != 'uuid'
    ) THEN
        RAISE EXCEPTION 'MediaAssetRelation UUID migration failed: Some author relations have incorrect entity_id_type';
    END IF;
    
    -- Verify entity_id_type is set correctly for other relations
    IF EXISTS (
        SELECT 1 FROM "media_asset_relations" 
        WHERE entity_type NOT IN ('article', 'author') AND entity_id_type != 'int'
    ) THEN
        RAISE EXCEPTION 'MediaAssetRelation UUID migration failed: Some non-article/author relations have incorrect entity_id_type';
    END IF;
    
    RAISE NOTICE 'MediaAssetRelation UUID migration successful: % relations migrated', relation_count;
    RAISE NOTICE '  - % article relations (entity_id_type = uuid)', article_relation_count;
    RAISE NOTICE '  - % author relations (entity_id_type = uuid)', author_relation_count;
    RAISE NOTICE '  - % other relations (entity_id_type = int)', other_relation_count;
END $$;
