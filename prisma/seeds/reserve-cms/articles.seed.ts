import 'dotenv/config';
import { PrismaClient, EArticleStatus } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ARTICLE_META_TITLE_MAX_LENGTH = 60;
const ARTICLE_META_DESCRIPTION_MAX_LENGTH = 160;

interface ArticleSeed {
  display_title: string;
  language: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  content: string;
  slug: string;
  status: EArticleStatus;
  published_at?: string;
  blogName: string;
  authorFirstName: string;
  authorLastName: string;
}

function assertArticleSeedFitsSchema(article: ArticleSeed) {
  if (article.meta_title.length > ARTICLE_META_TITLE_MAX_LENGTH) {
    throw new Error(
      `Article meta_title exceeds ${ARTICLE_META_TITLE_MAX_LENGTH} characters: ${article.slug}`,
    );
  }

  if (article.meta_description.length > ARTICLE_META_DESCRIPTION_MAX_LENGTH) {
    throw new Error(
      `Article meta_description exceeds ${ARTICLE_META_DESCRIPTION_MAX_LENGTH} characters: ${article.slug}`,
    );
  }
}

export async function seedArticles() {
  const articles: ArticleSeed[] = [
    // -- Gabriel Caliari Blog (marketing agency) ---------------------------------
    {
      display_title: 'Inbound Marketing: How to Attract Clients Without Chasing Them',
      language: 'en_us',
      meta_title: 'Inbound Marketing: Attract Clients Without Chasing',
      meta_description:
        'Understand what inbound marketing is, how it works in practice, and why brands that educate their audience sell more and at better margins.',
      focus_keyword: 'inbound marketing',
      content: `# Inbound Marketing: How to Attract Clients Without Chasing Them

If you have ever received a telemarketing call during Sunday lunch, you already know what outbound marketing feels like from the other side. Disruptive. Invasive. Unwanted.

Inbound marketing is the opposite of that, and that is exactly why it works.

## What Is Inbound Marketing?

Inbound marketing is a methodology that attracts customers through relevant content instead of interrupting them with ads. The logic is simple: **you create value first, and the customer comes to you.**

The journey usually works like this:

1. **Attract**: Generate traffic with content such as blog posts, SEO, and social media
2. **Convert**: Turn visitors into leads with valuable offers such as guides, newsletters, and webinars
3. **Close**: Nurture leads with email and personalized content until they are ready to buy
4. **Delight**: Keep delivering value so customers stay loyal and recommend your brand

## Why Does It Work?

Because **people do not want to be sold to, they want to buy**. There is a huge difference between someone searching for an answer and finding a useful article, versus someone having their feed interrupted by an ad they never asked for.

The first person is open to a conversation. The second one is defensive.

## The Role of Content

Content is the raw material of inbound marketing. Good content answers the questions your ideal customer is asking today, not the questions your brand wishes they were asking.

Practical examples:

- A dental clinic should not publish only “meet our equipment.” It should publish “how much does a dental implant cost and what should you consider before getting one?”
- A real estate company should not post only apartment photos. It should publish “five questions to ask before signing a lease agreement.”
- A marketing agency should not talk only about itself. It should write the kind of article you are reading right now.

## Essential Tools

To run inbound marketing well, you usually need:

- **An SEO-optimized blog**
- **Landing pages**
- **Email nurture flows**
- **A CRM**
- **Analytics**

## How Long Does It Take?

Inbound marketing is not a weekend campaign. It is a medium and long-term strategy. Meaningful organic results typically begin to appear after **3 to 6 months** of consistent execution.

The good news is that, unlike paid traffic, content can keep generating results long after you stop paying to distribute it.

## Starting From Scratch

1. Define your persona
2. List the ten questions they ask most often
3. Write one article answering each question
4. Publish consistently
5. Distribute through social media and email

---

*Need help building an inbound marketing strategy for your business? [Talk to Gabriel Caliari.](/contato)*`,
      slug: 'inbound-marketing-how-to-attract-clients',
      status: EArticleStatus.published,
      published_at: '2025-01-10T09:00:00.000Z',
      blogName: 'Blog Gabriel Caliari',
      authorFirstName: 'Diego',
      authorLastName: 'Kelme',
    },
    {
      display_title: 'SEO in 2025: The Definitive Guide to Ranking on Google',
      language: 'en_us',
      meta_title: 'SEO in 2025: Definitive Guide to Ranking on Google',
      meta_description:
        'Everything you need to know about SEO in 2025, including how Google works, the ranking factors that matter most, and what changed with AI.',
      focus_keyword: 'SEO 2025',
      content: `# SEO in 2025: The Definitive Guide to Ranking on Google

SEO remains one of the highest-return channels in digital marketing, but the rules have changed. If you are still applying the same playbook from a few years ago, competitors with a better understanding of today’s Google may already be ahead.

## How Google Really Works

Google has one core goal: **deliver the most satisfying result for every search**.

### What matters most today

- Matching search intent
- Publishing trustworthy content with real expertise
- Maintaining technical performance
- Producing genuinely useful information instead of generic filler

## What Changed With AI

AI made generic content easier to produce and easier to replace. That means unique perspectives, real experience, and original insight matter more than ever.

## A Practical SEO Strategy

### Keyword Research

Use tools such as Semrush, Ahrefs, or Google Search Console to find terms that align with your customer’s real intent.

### Content Creation

- Answer the search intent clearly
- Use the main keyword naturally
- Add internal links and descriptive alt text

### Technical SEO

- Keep HTTPS enabled
- Publish a sitemap
- Use short, descriptive URLs
- Fix broken pages and redirects

### Link Building

Quality backlinks remain one of the strongest ranking signals.

## Conclusion

SEO in 2025 is not about trying to beat Google. It is about being the best answer to your customer’s question on a technically healthy site.

---

*Want an SEO audit for your site? Gabriel Caliari can review your organic visibility and build a practical action plan. [Request a free analysis.](/contato)*`,
      slug: 'seo-definitive-guide-2025',
      status: EArticleStatus.published,
      published_at: '2025-01-17T09:00:00.000Z',
      blogName: 'Blog Gabriel Caliari',
      authorFirstName: 'Gabriel',
      authorLastName: 'Caliari',
    },
    {
      display_title: 'Visual Identity: Why Your Brand Needs to Be Memorable',
      language: 'en_us',
      meta_title: 'Visual Identity: Build a Memorable Brand',
      meta_description:
        'Learn what visual identity is, which elements shape a strong brand, and why getting it right early can be the difference between growth and stagnation.',
      focus_keyword: 'visual identity for companies',
      content: `# Visual Identity: Why Your Brand Needs to Be Memorable

Visual identity is the set of visual elements that represents and differentiates a brand. It goes far beyond a logo. It is the system that communicates, before any sentence is read, who your company is and what it stands for.

## Why It Matters

- Strong first impressions happen fast
- Consistency increases recognition
- Differentiation matters in crowded markets

## Common Mistakes

- Using design tools without brand strategy
- Treating a logo as the entire identity system
- Changing the visual direction too often
- Ignoring digital applications

## A Better Process

1. Brand immersion
2. Creative direction
3. Design and refinement
4. Brand guidelines
5. Implementation

## Conclusion

Visual identity is not decoration. It is an investment in perception.

---

*Want to build a visual identity that truly sets your brand apart? [Explore Gabriel Caliari’s process.](/identidade-visual)*`,
      slug: 'visual-identity-memorable-brand',
      status: EArticleStatus.published,
      published_at: '2025-01-24T09:00:00.000Z',
      blogName: 'Blog Gabriel Caliari',
      authorFirstName: 'Emily',
      authorLastName: 'Clamerick',
    },
    {
      display_title: 'Social Media Management: From Basic Execution to Professional Strategy',
      language: 'en_us',
      meta_title: 'Social Media Management: Complete Guide',
      meta_description:
        'Learn how to manage social media strategically, including content planning, useful metrics, and common mistakes that kill engagement.',
      focus_keyword: 'social media management for companies',
      content: `# Social Media Management: From Basic Execution to Professional Strategy

Professional social media management is very different from posting whenever someone remembers.

## Why Most Companies Fail

- Company-centered content
- Inconsistency
- No audience definition

## What Works Better

- Clear content pillars
- Consistent planning
- Metrics focused on reach, engagement, clicks, and conversions
- Fast comment response and format testing

## Conclusion

Social media can be one of the most powerful channels for brand growth, lead generation, and loyalty when it is managed with planning, consistency, and analysis.

---

*Gabriel Caliari manages your company’s social media from strategy to execution. [See our services.](/redes-sociais)*`,
      slug: 'social-media-management-complete-guide',
      status: EArticleStatus.published,
      published_at: '2025-01-31T09:00:00.000Z',
      blogName: 'Blog Gabriel Caliari',
      authorFirstName: 'Emily',
      authorLastName: 'Clamerick',
    },
    {
      display_title: 'Content Marketing: Why Brands That Teach Sell More',
      language: 'en_us',
      meta_title: 'Content Marketing: Why Teaching Brands Sell More',
      meta_description:
        'Learn what content marketing is, how to structure a strategy from scratch, and why it often becomes the lowest-cost lead source over time.',
      focus_keyword: 'content marketing',
      content: `# Content Marketing: Why Brands That Teach Sell More

Modern buyers research before they purchase. The company that shows up consistently with useful content is far more likely to be chosen.

## Effective Formats

- Blog articles
- Video
- Guides and e-books
- Newsletters
- Podcasts

## How to Build a Strategy

1. Define your persona
2. Map the buyer journey
3. Research keywords and questions
4. Publish consistently
5. Distribute proactively
6. Measure what drives traffic and conversions

## Conclusion

Brands that teach build audiences. Audiences become customers. Satisfied customers generate referrals.

---

*Gabriel Caliari develops end-to-end content strategies, from editorial planning to execution. [See how we can help.](/marketing-de-conteudo)*`,
      slug: 'content-marketing-brands-that-teach',
      status: EArticleStatus.published,
      published_at: '2025-02-07T09:00:00.000Z',
      blogName: 'Blog Gabriel Caliari',
      authorFirstName: 'Gabriel',
      authorLastName: 'Caliari',
    },
    {
      display_title: 'Landing Pages That Convert: A Practical Guide for Agencies and Clients',
      language: 'en_us',
      meta_title: 'Landing Pages That Convert: Practical Guide',
      meta_description:
        'Understand the essential elements of a high-converting landing page, including headline, social proof, CTA, and the mistakes that should always be avoided.',
      focus_keyword: 'high-converting landing page',
      content: `# Landing Pages That Convert: A Practical Guide for Agencies and Clients

Whether the goal is lead capture, product sales, or event registration, the landing page is the conversion point of the entire traffic strategy.

## Core Elements

- A strong headline
- A clear value proposition
- Social proof
- A visible and persuasive CTA
- A complete above-the-fold section

## Common Mistakes

- Navigation menus that distract
- Long text blocks
- Excessive form fields
- No urgency
- Slow pages
- Cluttered design

## Conclusion

Landing page optimization is not guesswork. It is a disciplined mix of persuasion, clarity, and testing.

---

*Want Gabriel Caliari to build and optimize your landing page? [Talk to our team.](/contato)*`,
      slug: 'landing-page-that-converts-complete-guide',
      status: EArticleStatus.published,
      published_at: '2025-02-14T09:00:00.000Z',
      blogName: 'Blog Gabriel Caliari',
      authorFirstName: 'Diego',
      authorLastName: 'Kelme',
    },
    // Draft currently being reviewed by the content team
    {
      display_title: 'Email Marketing: How to Build Campaigns That Actually Perform',
      language: 'en_us',
      meta_title: 'Email Marketing: Campaigns That Actually Perform',
      meta_description:
        'Email marketing is still a high-ROI channel. Learn how to build campaigns that reach the inbox, earn opens, and drive conversion.',
      focus_keyword: 'email marketing for companies',
      content: `# Email Marketing: How to Build Campaigns That Actually Perform

[DRAFT — under editorial review]

## Planned Sections

- Why email is still relevant
- Healthy list versus large list
- Anatomy of a high-converting email
- Segmentation and personalization
- Essential automations
- Deliverability and conversion metrics
- Recommended tools

## Status

Article in production. Expected publication date: 2025-04-15.`,
      slug: 'email-marketing-campaigns-that-perform',
      status: EArticleStatus.draft,
      blogName: 'Blog Gabriel Caliari',
      authorFirstName: 'Emily',
      authorLastName: 'Clamerick',
    },
    // -- Tech Insights (florida-exam-prep) -----------------------------------
    {
      display_title: 'DevOps: CI/CD with GitHub Actions',
      language: 'en_us',
      meta_title: 'DevOps: CI/CD with GitHub Actions | Complete Tutorial',
      meta_description:
        'Learn how to configure CI/CD pipelines with GitHub Actions to automate testing and deployment.',
      focus_keyword: 'github actions ci cd',
      content: `# DevOps: CI/CD with GitHub Actions

GitHub Actions changed the way teams implement CI/CD by offering an integrated and practical automation workflow.

## What Is CI/CD?

- **CI (Continuous Integration)** means integrating code changes continuously
- **CD (Continuous Deployment)** means shipping automatically and reliably

## Basic Setup

Create a file called \`.github/workflows/deploy.yml\` and define checkout, setup, install, test, build, and deploy steps.

## Best Practices

1. Always run automated tests before deployment
2. Use staging before production
3. Store credentials in GitHub Secrets
4. Maintain a rollback plan

## Conclusion

GitHub Actions makes CI/CD more accessible and easier to adopt, improving both software quality and delivery speed.`,
      slug: 'devops-cicd-github-actions',
      status: EArticleStatus.published,
      published_at: '2025-02-21T09:00:00.000Z',
      blogName: 'Tech Insights',
      authorFirstName: 'Cruz',
      authorLastName: 'Vinci',
    },
  ];

  let inserted = 0;
  let updated = 0;

  console.log('\n[ARTICLES SEED]');

  for (const article of articles) {
    assertArticleSeedFitsSchema(article);

    const blog = await prisma.blog.findFirst({
      where: { name: article.blogName },
    });

    if (!blog) {
      console.log(`  WARNING SKIP: Blog "${article.blogName}" not found for article "${article.display_title}"`);
      continue;
    }

    const author = await prisma.author.findFirst({
      where: {
        first_name: article.authorFirstName,
        last_name: article.authorLastName,
      },
    });

    if (!author) {
      console.log(
        `  WARNING SKIP: Author "${article.authorFirstName} ${article.authorLastName}" not found for article "${article.display_title}"`,
      );
      continue;
    }

    // Use the first active admin as the creator for seeded content
    const firstAdmin = await prisma.admin.findFirst({
      where: { active: true },
      orderBy: { created_at: 'asc' },
    });

    const existing = await prisma.article.findFirst({
      where: {
        slug: article.slug,
        blog_id: blog.id,
      },
    });

    const data = {
      display_title: article.display_title,
      language: article.language,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      focus_keyword: article.focus_keyword,
      content: article.content,
      slug: article.slug,
      status: article.status,
      blog_id: blog.id,
      author_id: author.id,
      created_by: firstAdmin?.id,
      last_edited_by: firstAdmin?.id,
      published_at:
        article.status === EArticleStatus.published && article.published_at
          ? new Date(article.published_at)
          : null,
    };

    if (existing) {
      await prisma.article.update({
        where: { id: existing.id },
        data,
      });
      updated++;
      console.log(`  UPDATED article: ${article.display_title}`);
    } else {
      await prisma.article.create({ data });
      inserted++;
      console.log(`  CREATED article: ${article.display_title}`);
    }
  }

  console.log(`\n  Summary: ${inserted} created, ${updated} updated\n`);

  await prisma.$disconnect();
}