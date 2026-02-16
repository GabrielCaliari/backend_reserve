# Zarp Mailer - Bounded Context

Módulo de gerenciamento de campanhas de email marketing seguindo princípios **SOLID** e **Domain-Driven Design (DDD)**.

## 📁 Estrutura DDD

```
zarp-mailer/
├── domain/                      # Enterprise Business Rules
│   ├── entities/                # Domain entities com regras de negócio
│   │   └── email-campaign.entity.ts
│   ├── value-objects/           # Objetos de valor imutáveis
│   │   ├── email-address.vo.ts
│   │   └── batch-size.vo.ts
│   ├── enums/                   # Enums do domínio
│   │   └── index.ts
│   └── interfaces/              # Contratos (Repository interfaces)
│       ├── email-campaign.repository.interface.ts
│       ├── smtp.provider.interface.ts
│       └── smtp-server.repository.interface.ts
│
├── application/                 # Application Business Rules
│   ├── services/                # Orquestração e casos de uso
│   │   └── email-campaign.service.ts
│   └── dtos/                    # Data Transfer Objects
│       ├── create-email-campaign.dto.ts
│       ├── update-batch-size.dto.ts
│       ├── update-copy-variant.dto.ts
│       └── create-primary-copy-variant.dto.ts
│
├── infrastructure/              # Frameworks & Adapters
│   ├── controllers/             # HTTP controllers (NestJS)
│   │   └── email-campaign.controller.ts
│   ├── repositories/            # Implementações Prisma
│   │   ├── prisma-email-campaign.repository.ts
│   │   └── prisma-smtp-server.repository.ts
│   ├── processors/              # BullMQ processors (async jobs)
│   │   └── email-campaign.processor.ts
│   └── providers/               # Implementações de serviços externos
│       └── nodemailer-smtp.provider.ts
│
└── zarp-mailer.module.ts        # NestJS Module configuration
```

## 🎯 Princípios SOLID Aplicados

### 1. **Single Responsibility (SRP)**
- **Controller**: Apenas HTTP request/response
- **Service**: Orquestração de business logic
- **Repository**: Apenas acesso a dados
- **Entity**: Regras de negócio do domínio

### 2. **Open/Closed (OCP)**
- Interfaces no `domain/interfaces/`
- Novas implementações não modificam código existente
- Exemplo: Adicionar novo SMTP provider = nova classe implementando `ISMTPProvider`

### 3. **Liskov Substitution (LSP)**
- Todas implementações respeitam contratos das interfaces
- `PrismaEmailCampaignRepository` é substituível por qualquer implementação de `IEmailCampaignRepository`

### 4. **Interface Segregation (ISP)**
- Interfaces pequenas e focadas
- `IEmailCampaignRepository`, `ISMTPProvider`, `ISMTPServerRepository` são independentes

### 5. **Dependency Inversion (DIP)**
- Services dependem de **interfaces** (abstrações)
- Implementações são injetadas via NestJS DI
- Exemplo:
```typescript
@Injectable()
export class EmailCampaignService {
  constructor(
    @Inject(EMAIL_CAMPAIGN_REPOSITORY)
    private readonly campaignRepo: IEmailCampaignRepository,
  ) {}
}
```

## 🔄 Fluxo de Dados

```
HTTP Request
    ↓
Controller (infrastructure)
    ↓
Service (application) → usa interfaces do domain
    ↓
Repository (infrastructure) → implementa interface
    ↓
Prisma/Database
```

## 📝 Regras de Negócio (Domain Layer)

### EmailCampaign Entity
- ✅ Só pode alterar configurações em status `DRAFT`
- ✅ Batch size mínimo: 100
- ✅ Transições de status válidas:
  - `DRAFT → PENDING` (closeSetup)
  - `PENDING → PAUSED` (pause)
  - `SCHEDULED → PAUSED` (pause)
  - `PAUSED → PENDING` (resume)

### Value Objects
- **BatchSize**: Garante tamanho mínimo de 100
- **EmailAddress**: Valida formato de email

## 🚀 Uso

### Criar campanha
```typescript
POST /api/mailer/
Body: { "name": "Campanha Black Friday" }
```

### Atualizar batch size
```typescript
PUT /api/mailer/:id/batch-size
Body: { "campaign_batch_size": 500 }
```

### Fechar setup
```typescript
POST /api/mailer/:id/close-setup
```

## 🔧 Extensibilidade

Para adicionar nova funcionalidade:

1. **Nova regra de negócio**: Adicione método na entity (`domain/entities/`)
2. **Novo caso de uso**: Adicione método no service (`application/services/`)
3. **Nova rota**: Adicione endpoint no controller (`infrastructure/controllers/`)
4. **Novo provider externo**: Crie interface em `domain/interfaces/` e implementação em `infrastructure/providers/`

## 📦 Dependências

- `@nestjs/common`: Framework base
- `@nestjs/bull`: Filas assíncronas
- `class-validator`: Validação de DTOs
- `prisma`: ORM (via shared/database)

## ✅ Testes

```bash
# Unit tests (domain entities)
pnpm test email-campaign.entity.spec.ts

# Integration tests (service layer)
pnpm test email-campaign.service.spec.ts

# E2E tests (HTTP endpoints)
pnpm test:e2e email-campaign.e2e-spec.ts
```
