# Database Seeds Organization

Seeds are organized by module following the application's bounded context structure.

## Structure

```
seeds/
├── reserve-auth/          # Authentication & Authorization
│   ├── admins.seed.ts
│   └── tenants.seed.ts
├── reserve-cms/           # Content Management System
│   ├── blogs.seed.ts
│   ├── articles.seed.ts
│   ├── authors.seed.ts
│   └── storage/
│       ├── author-avatars.seed.ts
│       └── article-images.seed.ts
├── reserve-leads/         # Lead Management
│   ├── collections.seed.ts
│   └── leads.seed.ts
├── reserve-mailer/        # Email Campaigns
│   ├── smtp-servers.seed.ts
│   └── campaigns.seed.ts
├── reserve-cnpjs/         # Company Data
│   ├── cnaes.seed.ts
│   └── companies.seed.ts
└── shared/             # Cross-module data
    ├── plans.seed.ts
    └── token-packs.seed.ts
```

## Execution Order

Seeds are executed in dependency order:
1. **reserve-auth**: Admins and Tenants (foundation)
2. **shared**: Plans and Token Packs
3. **reserve-cms**: Authors → Blogs → Storage Collections → Articles
4. **reserve-leads**: Collections → Leads
5. **reserve-mailer**: SMTP Servers → Campaigns
6. **reserve-cnpjs**: CNAEs → Companies (optional, large dataset)

## Running Seeds

```bash
# Run all seeds
pnpm exec prisma db seed

# Run specific module (future enhancement)
# pnpm exec ts-node prisma/seeds/reserve-cms/blogs.seed.ts
```

## Seed Data Philosophy

- **Diego Kelme** remains as the super_admin
- All other data uses realistic examples
- Images are stored in actual storage collections
- Data reflects real-world usage patterns
- Includes various states (draft, published, archived)
