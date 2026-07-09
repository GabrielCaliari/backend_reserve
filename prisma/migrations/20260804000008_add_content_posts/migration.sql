-- CreateEnum
CREATE TYPE "EContentPlatform" AS ENUM ('instagram', 'facebook');

-- CreateEnum
CREATE TYPE "EContentPostStatus" AS ENUM ('draft', 'scheduled', 'published');

-- CreateTable
CREATE TABLE "content_posts" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "platform" "EContentPlatform" NOT NULL,
    "scheduled_for" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "status" "EContentPostStatus" NOT NULL DEFAULT 'draft',
    "caption_preview" VARCHAR(280),
    "thumbnail_url" VARCHAR(500),
    "external_id" VARCHAR(100),
    "permalink" VARCHAR(500),
    "created_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_posts_tenant_id_scheduled_for_idx" ON "content_posts"("tenant_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "content_posts_tenant_id_published_at_idx" ON "content_posts"("tenant_id", "published_at");

-- CreateIndex
CREATE INDEX "content_posts_tenant_id_status_idx" ON "content_posts"("tenant_id", "status");
