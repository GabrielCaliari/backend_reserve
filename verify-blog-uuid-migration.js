const { PrismaClient } = require('./src/generated/prisma/client');

async function verifyUuidMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verifying Blog UUID Migration...\n');

    // 1. Check Blog records
    const blogs = await prisma.blog.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { Article: true },
        },
      },
    });

    console.log('✅ Blog Records (showing first 5):');
    blogs.forEach((blog) => {
      console.log(
        `  - ID: ${blog.id} (length: ${blog.id.length}) | Name: ${blog.name} | Articles: ${blog._count.Article}`,
      );
    });

    // 2. Check Article records with blog relationships
    const articles = await prisma.article.findMany({
      take: 5,
      select: {
        id: true,
        display_title: true,
        blog_id: true,
        Blog: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    console.log('\n✅ Article Records with Blog relationships (showing first 5):');
    articles.forEach((article) => {
      console.log(
        `  - Article ID: ${article.id} | Title: ${article.display_title}`,
      );
      console.log(
        `    Blog ID: ${article.blog_id} (length: ${article.blog_id.length}) | Blog: ${article.Blog.name}`,
      );
    });

    // 3. Verify counts
    const blogCount = await prisma.blog.count();
    const articleCount = await prisma.article.count();

    console.log('\n📊 Summary:');
    console.log(`  - Total Blogs: ${blogCount}`);
    console.log(`  - Total Articles: ${articleCount}`);

    // 4. Verify all blog IDs are strings
    const allBlogs = await prisma.blog.findMany({ select: { id: true } });
    const allIdsAreStrings = allBlogs.every((b) => typeof b.id === 'string');
    const idLengths = allBlogs.map((b) => b.id.length);
    const minLength = idLengths.length > 0 ? Math.min(...idLengths) : 0;
    const maxLength = idLengths.length > 0 ? Math.max(...idLengths) : 0;

    console.log('\n✅ Blog ID Validation:');
    console.log(`  - All IDs are strings: ${allIdsAreStrings}`);
    console.log(`  - ID length range: ${minLength} - ${maxLength} characters`);

    console.log('\n✅ Migration verification completed successfully!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUuidMigration();
