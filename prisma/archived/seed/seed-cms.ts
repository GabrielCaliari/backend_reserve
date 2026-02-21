import 'dotenv/config';
import { PrismaClient, EArticleStatus } from "../../../src/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Hash a secret key for blog authentication */
function hashSecretKey(value: string): { salt: string; hash: string } {
    const pk = process.env.ENCRYPT_PRIVATE_KEY;
    if (!pk) throw new Error('ENCRYPT_PRIVATE_KEY env var not set');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(value, salt + pk, 856, 64, 'sha512').toString('hex');
    return { salt, hash };
}

export async function seedCMS() {
    const blogs = [
        {
            name: 'Zarp Studio Tech Blog',
            description: 'Official Zarp Studio blog featuring articles about technology, software development, and digital innovation',
            slug: 'blog-zarp-studio',
            secret_key: 'zarp-blog-secret-2024',
            tenantSlug: 'zarp-studio',
        },
        {
            name: 'Test Company Blog',
            description: 'Test blog for demonstration purposes',
            slug: 'blog-empresa-teste',
            secret_key: 'test-blog-secret-2024',
            tenantSlug: 'empresa-teste',
        },
    ];

    const articles = [
        {
            display_title: 'Welcome to Zarp Studio Tech Blog',
            meta_title: 'Welcome to Zarp Studio | Tech Blog',
            meta_description: 'Discover insights on software development, emerging technologies, and digital innovation from the Zarp Studio team.',
            focus_keyword: 'software development blog',
            content: `# Welcome to Zarp Studio Tech Blog

We're excited to launch our official tech blog! This is your go-to resource for:

## What You'll Find Here

- **Software Development**: Best practices, design patterns, and modern development workflows
- **Emerging Technologies**: Coverage of cutting-edge tools, frameworks, and platforms
- **API Integration**: Practical guides for integrating with various APIs and services
- **Digital Innovation**: Insights on how technology is transforming businesses

## Our Mission

At Zarp Studio, we believe in sharing knowledge and empowering developers. Whether you're a seasoned professional or just starting your journey, you'll find valuable content here.

## Stay Connected

Subscribe to our newsletter to get the latest articles delivered to your inbox. Follow us on social media for quick tips and updates.

Let's build something amazing together!`,
            slug: 'welcome-to-zarp-studio-tech-blog',
            status: EArticleStatus.published,
            display_order: 1,
            blogSlug: 'blog-zarp-studio',
        },
        {
            display_title: 'Getting Started with Our API',
            meta_title: 'API Integration Guide | Zarp Studio',
            meta_description: 'Learn how to integrate with Zarp Studio API. Complete guide covering authentication, endpoints, and best practices.',
            focus_keyword: 'api integration guide',
            content: `# Getting Started with Our API

Integrating with the Zarp Studio API is straightforward. This guide will walk you through the essential steps to get up and running.

## Authentication

All API requests require authentication using JWT tokens. Here's how to get started:

### 1. Obtain Your API Credentials

First, log into your dashboard and navigate to the API section to generate your credentials:

- API Key
- Secret Key

### 2. Generate an Access Token

Use your credentials to obtain a JWT token:

\`\`\`bash
curl -X POST https://api.zarpstudio.com/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{"api_key": "your_key", "secret": "your_secret"}'
\`\`\`

### 3. Make Authenticated Requests

Include the token in the Authorization header:

\`\`\`bash
curl -X GET https://api.zarpstudio.com/v2/data \\
  -H "Authorization: Bearer your_token_here"
\`\`\`

## Core Endpoints

### Company Data
- \`GET /v2/companies\` - List companies
- \`GET /v2/companies/:id\` - Get company details

### Brand Monitoring
- \`GET /v2/brands\` - List monitored brands
- \`POST /v2/brands\` - Add brand to monitoring

### Lead Management
- \`GET /v2/leads\` - List leads
- \`POST /v2/leads\` - Create new lead

## Rate Limiting

API requests are limited to 1000 requests per hour per API key. Monitor your usage through the dashboard.

## Best Practices

1. **Cache responses** when possible to reduce API calls
2. **Handle errors gracefully** with proper retry logic
3. **Use webhooks** for real-time updates instead of polling
4. **Validate data** before sending requests

## Need Help?

Check out our [API documentation](https://docs.zarpstudio.com) for detailed endpoint references, or contact our support team.`,
            slug: 'getting-started-with-our-api',
            status: EArticleStatus.published,
            display_order: 2,
            blogSlug: 'blog-zarp-studio',
        },
        {
            display_title: 'Modern Web Development Best Practices',
            meta_title: 'Web Development Best Practices 2024',
            meta_description: 'Essential best practices for modern web development including performance, security, and maintainability.',
            focus_keyword: 'web development best practices',
            content: `# Modern Web Development Best Practices

The web development landscape evolves rapidly. Here are the essential practices every developer should follow in 2024.

## Performance Optimization

### 1. Optimize Assets
- Compress images using WebP format
- Minify CSS and JavaScript
- Implement lazy loading for images and components
- Use CDN for static assets

### 2. Code Splitting
Break your application into smaller chunks that load on demand:

\`\`\`javascript
// Dynamic imports in React
const Dashboard = lazy(() => import('./Dashboard'));
\`\`\`

## Security First

### Authentication & Authorization
- Use JWT tokens with short expiration times
- Implement refresh token rotation
- Never store sensitive data in localStorage
- Use httpOnly cookies for tokens

### Input Validation
Always validate and sanitize user input on both client and server:

\`\`\`typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
\`\`\`

## Code Quality

### TypeScript
Use TypeScript for type safety and better developer experience:

\`\`\`typescript
interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

function getUser(id: string): Promise<User> {
  // Implementation
}
\`\`\`

### Testing
Write tests for critical functionality:
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

## Accessibility

Make your applications accessible to everyone:
- Use semantic HTML
- Provide alt text for images
- Ensure keyboard navigation works
- Test with screen readers
- Maintain proper color contrast

## Conclusion

Following these best practices will help you build robust, performant, and maintainable web applications. Remember, the key is consistency and continuous improvement.`,
            slug: 'modern-web-development-best-practices',
            status: EArticleStatus.published,
            display_order: 3,
            blogSlug: 'blog-zarp-studio',
        },
        {
            display_title: 'Understanding Microservices Architecture',
            meta_title: 'Microservices Architecture Guide',
            meta_description: 'Comprehensive guide to microservices architecture, benefits, challenges, and implementation strategies.',
            focus_keyword: 'microservices architecture',
            content: `# Understanding Microservices Architecture

Microservices have become the de facto standard for building scalable applications. Let's explore what they are and when to use them.

## What Are Microservices?

Microservices architecture breaks down applications into small, independent services that:
- Run in their own processes
- Communicate via well-defined APIs
- Can be deployed independently
- Are organized around business capabilities

## Benefits

### 1. Scalability
Scale individual services based on demand rather than the entire application.

### 2. Technology Flexibility
Each service can use different technologies best suited for its purpose.

### 3. Faster Development
Teams can work independently on different services.

### 4. Resilience
Failure in one service doesn't bring down the entire system.

## Challenges

### Complexity
Managing multiple services adds operational complexity.

### Data Consistency
Maintaining consistency across services requires careful design.

### Network Latency
Inter-service communication introduces latency.

## When to Use Microservices

✅ **Good fit:**
- Large, complex applications
- Multiple teams working on the same product
- Need for independent scaling
- Different parts require different technologies

❌ **Not ideal:**
- Small applications
- Simple CRUD operations
- Limited team size
- Tight coupling between features

## Implementation Tips

1. **Start with a monolith** - Don't begin with microservices
2. **Define clear boundaries** - Use Domain-Driven Design
3. **Implement API Gateway** - Single entry point for clients
4. **Use containerization** - Docker and Kubernetes
5. **Monitor everything** - Distributed tracing and logging

## Conclusion

Microservices are powerful but not a silver bullet. Evaluate your needs carefully before adopting this architecture.`,
            slug: 'understanding-microservices-architecture',
            status: EArticleStatus.published,
            display_order: 4,
            blogSlug: 'blog-zarp-studio',
        },
        {
            display_title: 'Draft: Upcoming Features in 2024',
            meta_title: 'Upcoming Features 2024',
            meta_description: 'Preview of exciting new features coming to Zarp Studio platform in 2024.',
            focus_keyword: 'new features 2024',
            content: `# Upcoming Features in 2024

This article is still being written. Check back soon for details on our exciting new features!

## Planned Features

- Enhanced AI capabilities
- Real-time collaboration tools
- Advanced analytics dashboard
- Mobile app launch

Stay tuned for more information...`,
            slug: 'draft-upcoming-features-2024',
            status: EArticleStatus.draft,
            display_order: 5,
            blogSlug: 'blog-zarp-studio',
        },
        {
            display_title: 'Test Article',
            meta_title: 'Test Article',
            meta_description: 'This is a test article for demonstration purposes.',
            focus_keyword: 'test',
            content: 'This is a test article with minimal content for testing purposes.',
            slug: 'test-article',
            status: EArticleStatus.published,
            display_order: 1,
            blogSlug: 'blog-empresa-teste',
        },
    ];

    let blogsInserted = 0;
    let blogsUpdated = 0;

    // Seed blogs
    for (const blog of blogs) {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: blog.tenantSlug },
        });

        if (!tenant) {
            console.log(`[SKIP] Tenant "${blog.tenantSlug}" not found for blog "${blog.name}"`);
            continue;
        }

        const { hash, salt } = hashSecretKey(blog.secret_key);

        const existing = await prisma.blog.findFirst({
            where: {
                name: blog.name,
                tenant_id: tenant.id,
            },
        });

        const data = {
            name: blog.name,
            description: blog.description,
            secret_key_hash: hash,
            secret_key_salt: salt,
            tenant_id: tenant.id,
            active: true,
        };

        if (existing) {
            await prisma.blog.update({
                where: { id: existing.id },
                data,
            });
            blogsUpdated++;
        } else {
            await prisma.blog.create({ data });
            blogsInserted++;
        }
    }

    let articlesInserted = 0;
    let articlesUpdated = 0;

    // Seed articles
    for (const article of articles) {
        const blog = await prisma.blog.findFirst({
            where: { 
                name: blogs.find(b => b.slug === article.blogSlug)?.name 
            },
        });

        if (!blog) {
            console.log(`[SKIP] Blog "${article.blogSlug}" not found for article "${article.display_title}"`);
            continue;
        }

        // Get first admin for created_by field
        const firstAdmin = await prisma.admin.findFirst({
            where: { active: true },
        });

        const existing = await prisma.article.findFirst({
            where: {
                slug: article.slug,
                blog_id: blog.id,
            },
        });

        const data = {
            display_title: article.display_title,
            meta_title: article.meta_title,
            meta_description: article.meta_description,
            focus_keyword: article.focus_keyword,
            content: article.content,
            slug: article.slug,
            status: article.status,
            display_order: article.display_order,
            blog_id: blog.id,
            published_at: article.status === EArticleStatus.published ? new Date() : null,
            created_by: firstAdmin?.id,
            last_edited_by: firstAdmin?.id,
        };

        if (existing) {
            await prisma.article.update({
                where: { id: existing.id },
                data,
            });
            articlesUpdated++;
        } else {
            await prisma.article.create({ data });
            articlesInserted++;
        }
    }

    console.log(`\n----------------------------------------------------------------------------------\n`);
    console.log(`Blogs inserted: ${blogsInserted}, updated: ${blogsUpdated}`);
    console.log(`Articles inserted: ${articlesInserted}, updated: ${articlesUpdated}`);
    console.log(`\n----------------------------------------------------------------------------------\n`);
}
