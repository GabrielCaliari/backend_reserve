-- CreateEnum
CREATE TYPE "EArticleStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EAdminRole" ADD VALUE 'owner';
ALTER TYPE "EAdminRole" ADD VALUE 'manager';
ALTER TYPE "EAdminRole" ADD VALUE 'editor';
ALTER TYPE "EAdminRole" ADD VALUE 'viewer';

-- AlterTable
ALTER TABLE "AdminTenant" ADD COLUMN     "role" "EAdminRole" NOT NULL DEFAULT 'manager';

-- CreateTable
CREATE TABLE "Blog" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(100) NOT NULL,
    "secret_key_hash" TEXT NOT NULL,
    "secret_key_salt" TEXT NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "status" "EArticleStatus" NOT NULL DEFAULT 'draft',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "blog_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "alt_text" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "file_size" INTEGER NOT NULL,
    "original_format" VARCHAR(10) NOT NULL,
    "article_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blog_tenant_id_idx" ON "Blog"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_slug_tenant_id_key" ON "Blog"("slug", "tenant_id");

-- CreateIndex
CREATE INDEX "Article_blog_id_status_display_order_idx" ON "Article"("blog_id", "status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_blog_id_key" ON "Article"("slug", "blog_id");

-- CreateIndex
CREATE INDEX "ArticleImage_article_id_display_order_idx" ON "ArticleImage"("article_id", "display_order");

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleImage" ADD CONSTRAINT "ArticleImage_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
