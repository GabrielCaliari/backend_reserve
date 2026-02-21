/**
 * UUID Migration Data Integrity Verification Script
 * 
 * This script verifies data integrity after migrating all CMS entities to UUID.
 * It performs comprehensive checks on:
 * - UUID format validation (12-character cuid)
 * - UUID uniqueness
 * - Foreign key integrity
 * - Polymorphic relation integrity
 * - Data consistency
 * - Relationship integrity
 * 
 * Usage: pnpm exec ts-node prisma/scripts/verify-uuid-migration.ts
 */

import { PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

interface CheckResult {
  checkName: string;
  passed: boolean;
  details: string;
  errors?: string[];
}

const results: CheckResult[] = [];

// UUID validation regex (12-character cuid format)
const UUID_REGEX = /^[a-z0-9]{12}$/;

function isValidUUID(id: string): boolean {
  return typeof id === 'string' && id.length === 12 && UUID_REGEX.test(id);
}

async function checkUUIDFormat(
  entityName: string,
  records: Array<{ id: string }>
): Promise<CheckResult> {
  const invalidIds = records.filter(r => !isValidUUID(r.id));
  
  return {
    checkName: `${entityName} UUID Format`,
    passed: invalidIds.length === 0,
    details: `Total: ${records.length}, Valid: ${records.length - invalidIds.length}, Invalid: ${invalidIds.length}`,
    errors: invalidIds.length > 0 
      ? invalidIds.slice(0, 10).map(r => `Invalid ID: ${r.id}`)
      : undefined
  };
}

async function checkUUIDUniqueness(
  entityName: string,
  records: Array<{ id: string }>
): Promise<CheckResult> {
  const idSet = new Set<string>();
  const duplicates: string[] = [];
  
  records.forEach(r => {
    if (idSet.has(r.id)) {
      duplicates.push(r.id);
    } else {
      idSet.add(r.id);
    }
  });
  
  return {
    checkName: `${entityName} UUID Uniqueness`,
    passed: duplicates.length === 0,
    details: `Total: ${records.length}, Unique: ${idSet.size}, Duplicates: ${duplicates.length}`,
    errors: duplicates.length > 0 
      ? duplicates.slice(0, 10).map(id => `Duplicate ID: ${id}`)
      : undefined
  };
}

async function verifyBlogIntegrity(): Promise<void> {
  console.log('\n=== Verifying Blog Integrity ===');
  
  const blogs = await prisma.blog.findMany({
    select: { id: true, name: true, tenant_id: true }
  });
  
  // UUID format check
  results.push(await checkUUIDFormat('Blog', blogs));
  
  // UUID uniqueness check
  results.push(await checkUUIDUniqueness('Blog', blogs));
  
  // Check for NULL values in required fields
  const nullChecks = blogs.filter(b => !b.id || !b.name || !b.tenant_id);
  results.push({
    checkName: 'Blog NOT NULL Constraints',
    passed: nullChecks.length === 0,
    details: `Records with NULL required fields: ${nullChecks.length}`,
    errors: nullChecks.length > 0 
      ? nullChecks.slice(0, 10).map(b => `Blog with NULL: ${JSON.stringify(b)}`)
      : undefined
  });
}

async function verifyArticleIntegrity(): Promise<void> {
  console.log('\n=== Verifying Article Integrity ===');
  
  const articles = await prisma.article.findMany({
    select: { 
      id: true, 
      blog_id: true, 
      author_id: true, 
      cover_image_id: true,
      display_title: true,
      meta_title: true
    }
  });
  
  // UUID format check
  results.push(await checkUUIDFormat('Article', articles));
  
  // UUID uniqueness check
  results.push(await checkUUIDUniqueness('Article', articles));
  
  // Check blog_id foreign key integrity
  const blogs = await prisma.blog.findMany({ select: { id: true } });
  const blogIds = new Set(blogs.map(b => b.id));
  const orphanedArticles = articles.filter(a => !blogIds.has(a.blog_id));
  
  results.push({
    checkName: 'Article -> Blog Foreign Key',
    passed: orphanedArticles.length === 0,
    details: `Total: ${articles.length}, Valid: ${articles.length - orphanedArticles.length}, Orphaned: ${orphanedArticles.length}`,
    errors: orphanedArticles.length > 0 
      ? orphanedArticles.slice(0, 10).map(a => `Article ${a.id} references invalid blog_id: ${a.blog_id}`)
      : undefined
  });
  
  // Check author_id foreign key integrity
  const authors = await prisma.author.findMany({ select: { id: true } });
  const authorIds = new Set(authors.map(au => au.id));
  const orphanedByAuthor = articles.filter(a => a.author_id && !authorIds.has(a.author_id));
  
  results.push({
    checkName: 'Article -> Author Foreign Key',
    passed: orphanedByAuthor.length === 0,
    details: `Total with author: ${articles.filter(a => a.author_id).length}, Valid: ${articles.filter(a => a.author_id).length - orphanedByAuthor.length}, Orphaned: ${orphanedByAuthor.length}`,
    errors: orphanedByAuthor.length > 0 
      ? orphanedByAuthor.slice(0, 10).map(a => `Article ${a.id} references invalid author_id: ${a.author_id}`)
      : undefined
  });
  
  // Check cover_image_id foreign key integrity
  const assets = await prisma.mediaAsset.findMany({ select: { id: true } });
  const assetIds = new Set(assets.map(ma => ma.id));
  const orphanedByCover = articles.filter(a => a.cover_image_id && !assetIds.has(a.cover_image_id));
  
  results.push({
    checkName: 'Article -> MediaAsset (cover) Foreign Key',
    passed: orphanedByCover.length === 0,
    details: `Total with cover: ${articles.filter(a => a.cover_image_id).length}, Valid: ${articles.filter(a => a.cover_image_id).length - orphanedByCover.length}, Orphaned: ${orphanedByCover.length}`,
    errors: orphanedByCover.length > 0 
      ? orphanedByCover.slice(0, 10).map(a => `Article ${a.id} references invalid cover_image_id: ${a.cover_image_id}`)
      : undefined
  });
  
  // Check for NULL values in required fields
  const nullChecks = articles.filter(a => !a.id || !a.blog_id || !a.display_title || !a.meta_title);
  results.push({
    checkName: 'Article NOT NULL Constraints',
    passed: nullChecks.length === 0,
    details: `Records with NULL required fields: ${nullChecks.length}`,
    errors: nullChecks.length > 0 
      ? nullChecks.slice(0, 10).map(a => `Article with NULL: ${a.id}`)
      : undefined
  });
}

async function verifyAuthorIntegrity(): Promise<void> {
  console.log('\n=== Verifying Author Integrity ===');
  
  const authors = await prisma.author.findMany({
    select: { 
      id: true, 
      avatar_id: true, 
      first_name: true, 
      last_name: true, 
      tenant_id: true 
    }
  });
  
  // UUID format check
  results.push(await checkUUIDFormat('Author', authors));
  
  // UUID uniqueness check
  results.push(await checkUUIDUniqueness('Author', authors));
  
  // Check avatar_id foreign key integrity
  const assets = await prisma.mediaAsset.findMany({ select: { id: true } });
  const assetIds = new Set(assets.map(ma => ma.id));
  const orphanedByAvatar = authors.filter(au => au.avatar_id && !assetIds.has(au.avatar_id));
  
  results.push({
    checkName: 'Author -> MediaAsset (avatar) Foreign Key',
    passed: orphanedByAvatar.length === 0,
    details: `Total with avatar: ${authors.filter(au => au.avatar_id).length}, Valid: ${authors.filter(au => au.avatar_id).length - orphanedByAvatar.length}, Orphaned: ${orphanedByAvatar.length}`,
    errors: orphanedByAvatar.length > 0 
      ? orphanedByAvatar.slice(0, 10).map(au => `Author ${au.id} references invalid avatar_id: ${au.avatar_id}`)
      : undefined
  });
  
  // Check for NULL values in required fields
  const nullChecks = authors.filter(au => !au.id || !au.first_name || !au.last_name || !au.tenant_id);
  results.push({
    checkName: 'Author NOT NULL Constraints',
    passed: nullChecks.length === 0,
    details: `Records with NULL required fields: ${nullChecks.length}`,
    errors: nullChecks.length > 0 
      ? nullChecks.slice(0, 10).map(au => `Author with NULL: ${au.id}`)
      : undefined
  });
}

async function verifyMediaAssetIntegrity(): Promise<void> {
  console.log('\n=== Verifying MediaAsset Integrity ===');
  
  const assets = await prisma.mediaAsset.findMany({
    select: { id: true, collection_id: true, tenant_id: true }
  });
  
  // UUID format check
  results.push(await checkUUIDFormat('MediaAsset', assets));
  
  // UUID uniqueness check
  results.push(await checkUUIDUniqueness('MediaAsset', assets));
  
  // Check collection_id foreign key integrity
  const collections = await prisma.mediaCollection.findMany({ select: { id: true } });
  const collectionIds = new Set(collections.map(mc => mc.id));
  const orphanedAssets = assets.filter(ma => !collectionIds.has(ma.collection_id));
  
  results.push({
    checkName: 'MediaAsset -> MediaCollection Foreign Key',
    passed: orphanedAssets.length === 0,
    details: `Total: ${assets.length}, Valid: ${assets.length - orphanedAssets.length}, Orphaned: ${orphanedAssets.length}`,
    errors: orphanedAssets.length > 0 
      ? orphanedAssets.slice(0, 10).map(ma => `MediaAsset ${ma.id} references invalid collection_id: ${ma.collection_id}`)
      : undefined
  });
  
  // Check for NULL values in required fields
  const nullChecks = assets.filter(ma => !ma.id || !ma.collection_id || !ma.tenant_id);
  results.push({
    checkName: 'MediaAsset NOT NULL Constraints',
    passed: nullChecks.length === 0,
    details: `Records with NULL required fields: ${nullChecks.length}`,
    errors: nullChecks.length > 0 
      ? nullChecks.slice(0, 10).map(ma => `MediaAsset with NULL: ${ma.id}`)
      : undefined
  });
}

async function verifyMediaCollectionIntegrity(): Promise<void> {
  console.log('\n=== Verifying MediaCollection Integrity ===');
  
  const collections = await prisma.mediaCollection.findMany({
    select: { id: true, tenant_id: true }
  });
  
  // UUID format check
  results.push(await checkUUIDFormat('MediaCollection', collections));
  
  // UUID uniqueness check
  results.push(await checkUUIDUniqueness('MediaCollection', collections));
  
  // Check for NULL values in required fields
  const nullChecks = collections.filter(mc => !mc.id || !mc.tenant_id);
  results.push({
    checkName: 'MediaCollection NOT NULL Constraints',
    passed: nullChecks.length === 0,
    details: `Records with NULL required fields: ${nullChecks.length}`,
    errors: nullChecks.length > 0 
      ? nullChecks.slice(0, 10).map(mc => `MediaCollection with NULL: ${mc.id}`)
      : undefined
  });
}

async function verifyMediaAssetRelationIntegrity(): Promise<void> {
  console.log('\n=== Verifying MediaAssetRelation Integrity ===');
  
  const relations = await prisma.mediaAssetRelation.findMany({
    select: { 
      id: true, 
      asset_id: true, 
      entity_type: true, 
      entity_id: true, 
      entity_id_type: true 
    }
  });
  
  // UUID format check
  results.push(await checkUUIDFormat('MediaAssetRelation', relations));
  
  // UUID uniqueness check
  results.push(await checkUUIDUniqueness('MediaAssetRelation', relations));
  
  // Check asset_id foreign key integrity
  const assets = await prisma.mediaAsset.findMany({ select: { id: true } });
  const assetIds = new Set(assets.map(ma => ma.id));
  const orphanedRelations = relations.filter(mar => !assetIds.has(mar.asset_id));
  
  results.push({
    checkName: 'MediaAssetRelation -> MediaAsset Foreign Key',
    passed: orphanedRelations.length === 0,
    details: `Total: ${relations.length}, Valid: ${relations.length - orphanedRelations.length}, Orphaned: ${orphanedRelations.length}`,
    errors: orphanedRelations.length > 0 
      ? orphanedRelations.slice(0, 10).map(mar => `MediaAssetRelation ${mar.id} references invalid asset_id: ${mar.asset_id}`)
      : undefined
  });
  
  // Check polymorphic entity_id references for articles
  const articles = await prisma.article.findMany({ select: { id: true } });
  const articleIds = new Set(articles.map(a => a.id));
  const articleRelations = relations.filter(mar => mar.entity_type === 'article' && mar.entity_id_type === 'uuid');
  const orphanedArticleRelations = articleRelations.filter(mar => !articleIds.has(mar.entity_id));
  
  results.push({
    checkName: 'MediaAssetRelation -> Article (polymorphic)',
    passed: orphanedArticleRelations.length === 0,
    details: `Total article relations: ${articleRelations.length}, Valid: ${articleRelations.length - orphanedArticleRelations.length}, Orphaned: ${orphanedArticleRelations.length}`,
    errors: orphanedArticleRelations.length > 0 
      ? orphanedArticleRelations.slice(0, 10).map(mar => `MediaAssetRelation ${mar.id} references invalid article entity_id: ${mar.entity_id}`)
      : undefined
  });
  
  // Check polymorphic entity_id references for authors
  const authors = await prisma.author.findMany({ select: { id: true } });
  const authorIds = new Set(authors.map(au => au.id));
  const authorRelations = relations.filter(mar => mar.entity_type === 'author' && mar.entity_id_type === 'uuid');
  const orphanedAuthorRelations = authorRelations.filter(mar => !authorIds.has(mar.entity_id));
  
  results.push({
    checkName: 'MediaAssetRelation -> Author (polymorphic)',
    passed: orphanedAuthorRelations.length === 0,
    details: `Total author relations: ${authorRelations.length}, Valid: ${authorRelations.length - orphanedAuthorRelations.length}, Orphaned: ${orphanedAuthorRelations.length}`,
    errors: orphanedAuthorRelations.length > 0 
      ? orphanedAuthorRelations.slice(0, 10).map(mar => `MediaAssetRelation ${mar.id} references invalid author entity_id: ${mar.entity_id}`)
      : undefined
  });
  
  // Check entity_id_type consistency
  const inconsistentTypes = relations.filter(mar => {
    if (mar.entity_id_type === 'uuid') {
      return !isValidUUID(mar.entity_id);
    } else if (mar.entity_id_type === 'int') {
      return !/^\d+$/.test(mar.entity_id);
    }
    return false;
  });
  
  results.push({
    checkName: 'MediaAssetRelation entity_id_type Consistency',
    passed: inconsistentTypes.length === 0,
    details: `Total: ${relations.length}, Consistent: ${relations.length - inconsistentTypes.length}, Inconsistent: ${inconsistentTypes.length}`,
    errors: inconsistentTypes.length > 0 
      ? inconsistentTypes.slice(0, 10).map(mar => `MediaAssetRelation ${mar.id} has inconsistent entity_id_type: ${mar.entity_id_type} for entity_id: ${mar.entity_id}`)
      : undefined
  });
  
  // Check for NULL values in required fields
  const nullChecks = relations.filter(mar => !mar.id || !mar.asset_id || !mar.entity_type || !mar.entity_id || !mar.entity_id_type);
  results.push({
    checkName: 'MediaAssetRelation NOT NULL Constraints',
    passed: nullChecks.length === 0,
    details: `Records with NULL required fields: ${nullChecks.length}`,
    errors: nullChecks.length > 0 
      ? nullChecks.slice(0, 10).map(mar => `MediaAssetRelation with NULL: ${mar.id}`)
      : undefined
  });
}

async function verifyDeprecatedArticleImages(): Promise<void> {
  console.log('\n=== Verifying Deprecated ArticleImage References ===');
  
  const deprecatedImages = await prisma.articleImage.findMany({
    select: { id: true, article_id: true }
  });
  
  if (deprecatedImages.length === 0) {
    results.push({
      checkName: 'ArticleImage Deprecated Table',
      passed: true,
      details: 'No records in deprecated table (expected after migration)'
    });
    return;
  }
  
  // Check article_id foreign key integrity
  const articles = await prisma.article.findMany({ select: { id: true } });
  const articleIds = new Set(articles.map(a => a.id));
  const orphanedImages = deprecatedImages.filter(ai => !articleIds.has(ai.article_id));
  
  results.push({
    checkName: 'ArticleImage -> Article Foreign Key',
    passed: orphanedImages.length === 0,
    details: `Total deprecated images: ${deprecatedImages.length}, Valid: ${deprecatedImages.length - orphanedImages.length}, Orphaned: ${orphanedImages.length}`,
    errors: orphanedImages.length > 0 
      ? orphanedImages.slice(0, 10).map(ai => `ArticleImage ${ai.id} references invalid article_id: ${ai.article_id}`)
      : undefined
  });
}

async function printSummary(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('UUID MIGRATION VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal Checks: ${results.length}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  
  if (failed > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('FAILED CHECKS:');
    console.log('-'.repeat(80));
    
    results.filter(r => !r.passed).forEach(result => {
      console.log(`\n❌ ${result.checkName}`);
      console.log(`   ${result.details}`);
      if (result.errors && result.errors.length > 0) {
        console.log('   Errors:');
        result.errors.forEach(err => console.log(`   - ${err}`));
      }
    });
  }
  
  console.log('\n' + '-'.repeat(80));
  console.log('ENTITY COUNTS:');
  console.log('-'.repeat(80));
  
  const counts = await Promise.all([
    prisma.blog.count(),
    prisma.article.count(),
    prisma.author.count(),
    prisma.mediaAsset.count(),
    prisma.mediaCollection.count(),
    prisma.mediaAssetRelation.count(),
    prisma.articleImage.count()
  ]);
  
  console.log(`Blogs: ${counts[0]}`);
  console.log(`Articles: ${counts[1]}`);
  console.log(`Authors: ${counts[2]}`);
  console.log(`MediaAssets: ${counts[3]}`);
  console.log(`MediaCollections: ${counts[4]}`);
  console.log(`MediaAssetRelations: ${counts[5]}`);
  console.log(`ArticleImages (deprecated): ${counts[6]}`);
  
  console.log('\n' + '='.repeat(80));
  
  if (failed === 0) {
    console.log('✅ ALL CHECKS PASSED - Data integrity verified!');
  } else {
    console.log('❌ SOME CHECKS FAILED - Please review and fix issues above');
  }
  
  console.log('='.repeat(80) + '\n');
}

async function main() {
  console.log('Starting UUID Migration Data Integrity Verification...\n');
  
  try {
    await verifyBlogIntegrity();
    await verifyArticleIntegrity();
    await verifyAuthorIntegrity();
    await verifyMediaAssetIntegrity();
    await verifyMediaCollectionIntegrity();
    await verifyMediaAssetRelationIntegrity();
    await verifyDeprecatedArticleImages();
    
    await printSummary();
    
    const failed = results.filter(r => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
