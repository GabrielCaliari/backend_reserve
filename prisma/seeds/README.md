# Database Seeds Organization

Seeds are organized by module following the application's bounded context structure.

## Structure

```
seeds/
├── zarp-auth/          # Authentication & Authorization
│   ├── admins.seed.ts
│   └── tenants.seed.ts
├── zarp-cms/           # Content Management System
│   ├── blogs.seed.ts
│   ├── articles.seed.ts
│   ├── authors.seed.ts
│   └── storage/
│       ├── author-avatars.seed.ts
│       └── article-images.seed.ts
├── zarp-leads/         # Lead Management
│   ├── collections.seed.ts
│   └── leads.seed.ts
├── zarp-mailer/        # Email Campaigns
│   ├── smtp-servers.seed.ts
│   └── campaigns.seed.ts
├── zarp-cnpjs/         # Company Data
│   ├── cnaes.seed.ts
│   └── companies.seed.ts
└── shared/             # Cross-module data
    ├── plans.seed.ts
    └── token-packs.seed.ts
```

## Execution Order

Seeds are executed in dependency order:
1. **zarp-auth**: Admins and Tenants (foundation)
2. **shared**: Plans and Token Packs
3. **zarp-cms**: Authors → Blogs → Storage Collections → Articles
4. **zarp-leads**: Collections → Leads
5. **zarp-mailer**: SMTP Servers → Campaigns
6. **zarp-cnpjs**: CNAEs → Companies (optional, large dataset)

## Running Seeds

```bash
# Run all seeds
pnpm exec prisma db seed

# Run specific module (future enhancement)
# pnpm exec ts-node prisma/seeds/zarp-cms/blogs.seed.ts
```

## Seed Data Philosophy

- **Diego Kelme** remains as the super_admin
- All other data uses realistic examples
- Images are stored in actual storage collections
- Data reflects real-world usage patterns
- Includes various states (draft, published, archived)
