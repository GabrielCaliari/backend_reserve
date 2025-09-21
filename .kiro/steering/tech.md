# Technology Stack

## Framework & Runtime
- **Node.js** with **TypeScript** (ES2021 target)
- **NestJS** - Main application framework with decorators and dependency injection
- **Express** - HTTP server platform

## Database & ORM
- **PostgreSQL** - Primary database
- **Prisma ORM** - Database toolkit with type-safe client
- **MySQL** support via mysql2 (legacy/migration support)
- **Sequelize** - Additional ORM for specific use cases

## Key Libraries & Services
- **Bull** - Redis-based job queue system
- **AWS SDK** - S3 storage and SNS notifications  
- **Stripe** - Payment processing and subscription management
- **AI Integration**: OpenAI and Azure AI SDK for brand analysis
- **Authentication**: JWT tokens with custom guards
- **Validation**: class-validator and class-transformer
- **File Processing**: CSV parsing, XML parsing, ZIP extraction

## Development Tools
- **ESLint** with TypeScript rules
- **Prettier** (currently disabled via .prettierignore)
- **Jest** - Testing framework
- **ts-node** - TypeScript execution

## Common Commands

### Development
```bash
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugging
npm run build              # Build for production
npm run start:prod         # Run production build
```

### Database
```bash
npx prisma generate        # Generate Prisma client
npx prisma db push         # Push schema changes
npx prisma db seed         # Run database seeds
```

### Code Quality
```bash
npm run lint               # Run ESLint with auto-fix
npm run format             # Format code with Prettier
npm run test               # Run unit tests
npm run test:e2e           # Run end-to-end tests
npm run test:cov           # Run tests with coverage
```

## Architecture Notes
- Uses modular architecture with v1 and v2 API versions
- Repository pattern for database access
- Guard-based authentication system
- Background job processing with Bull queues
- Scheduled tasks via @nestjs/schedule