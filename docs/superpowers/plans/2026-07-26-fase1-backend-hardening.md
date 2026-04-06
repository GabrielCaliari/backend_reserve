# Fase 1 — Hardening de Bootstrap e Credenciais (Backend Reserve) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os achados de segurança de bootstrap e de credenciais do `backend_reserve` — sem `helmet`, sem rate limit efetivo, `ValidationPipe` sem `whitelist`, Swagger público em produção, PBKDF2 com 856 iterações comparado com `===`, sem lockout de conta, senha de 6 caracteres, e JWT que confunde assinatura forjada com token expirado.

**Architecture:** Tudo é bootstrap/config mais dois arquivos novos em `src/shared/`. O `HashProvider` ganha PBKDF2 versionado (`hash_version`: `1` = 856 iterações legado, `2` = 210.000) para que os hashes existentes continuem validando enquanto cada login bem-sucedido contra um hash v1 re-hasheia para v2 na mesma requisição. Uma política pura `account-lockout.policy.ts` dirige o lockout progressivo persistido. Um decorator `IsStrongPassword` de class-validator substitui todo `@MinLength(6)` em campo de senha. Nenhum modelo Prisma novo — só três colunas em duas tabelas de credencial.

**Tech Stack:** NestJS 11 (adaptador Express 4), Prisma 7 (`prisma migrate`, pasta `prisma/migrations/` já existe), `@nestjs/throttler` 6.5 (já instalado), `helmet` (a instalar), Jest com specs colocados (`*.spec.ts`), `crypto.pbkdf2Sync` + `crypto.timingSafeEqual`, `class-validator`.

## Global Constraints

- **Gerenciador de pacotes:** o repositório tem `package-lock.json` (548 KB, mai 26 18:24) **e** `pnpm-lock.yaml` (358 KB, mai 26 17:11). A Task 1 resolve essa ambiguidade e fixa um único gerenciador. Todos os comandos deste plano usam `npm`; se a Task 1 decidir `pnpm`, troque `npm` por `pnpm` em todos os passos e `npm test --` por `pnpm test --`.
- **Prisma do Reserve é snake_case** (`admin_id`, `created_at`, `hash_version`, `failed_attempts`, `locked_until`). Nunca camelCase. Código copiado da Zarp precisa dos nomes de campo adaptados.
- **Migrações, não `db push`.** Existe `prisma/migrations/` com 6 migrações e `migration_lock.toml`. Cada mudança de schema é uma pasta com nome prefixado por timestamp, aplicada com `npx prisma migrate dev --name <nome>`.
- **O Reserve tem duas tabelas de credencial de senha:** `AdminCredential` e `UserCredential`. Não existe `CustomerCredential` (a Zarp tem três). Este plano cobre as duas que existem.
- Testes: Jest, spec colocado ao lado do arquivo, `rootDir: src`, `testRegex: ".*\\.spec\\.ts$"`. Rodar com `npm test -- <padrão>`.
- Após cada task: `npm run build` passa, depois `npm test` 100% verde (suíte completa, não só o spec tocado). Commit por task.
- Trabalhar no branch `fase1-hardening` criado a partir do branch atual. A Task 1 cria.
- **Comportamento preservado exceto onde o achado exige mudar.** O único modo de falha novo é HTTP 423 quando a conta está travada (antes: tentativas de senha errada retornavam 401 para sempre, sem limite).
- Toda escrita em `AdminCredential`/`UserCredential` que define uma senha **nova** (registro, reset, ativação) precisa gravar `hash_version: 2` e zerar `failed_attempts: 0, locked_until: null`. O default `1` no schema existe só para rotular corretamente as linhas **já existentes** de antes da migração.
- **Hash de token de sessão não é versionado.** `AdminSessionToken`/`UserSessionToken` hasheiam um JWT recém-gerado a cada login (nunca uma senha de vida longa), então esses `compare(...)` continuam usando o default `version = 2` — sem argumento de versão explícito — porque sempre foram criados pelo `hash()` também atualizado.
- Variáveis de ambiente introduzidas: `SWAGGER_ENABLED` (opcional, opt-in só em produção). `CORS_ORIGINS` já é lido hoje. Não existe `.env.example` no repositório; documentar na Task 15.
- Textos de erro voltados ao usuário em português, dizendo o que fazer em seguida — nunca um label técnico cru.

---

### Task 1: Baseline — branch, gerenciador de pacotes, suíte verde

**Files:**
- Delete: `package-lock.json` **ou** `pnpm-lock.yaml` (um dos dois, conforme a decisão)

**Interfaces:**
- Produces: branch `fase1-hardening` e um único lockfile no repositório. Todas as tasks seguintes assumem que `npm run build` e `npm test` passam no estado inicial.

- [ ] **Step 1: Criar o branch**

```bash
git checkout -b fase1-hardening
```

- [ ] **Step 2: Confirmar o estado inicial do build**

Run: `npm run build`
Expected: termina com exit code 0. Se falhar, **pare** — corrigir build quebrado não é escopo deste plano; reporte ao usuário.

- [ ] **Step 3: Confirmar o estado inicial dos testes**

Run: `npm test`
Expected: todos os specs passam. Anote o número de suítes e de testes — é a linha de base para comparar nas tasks seguintes.

- [ ] **Step 4: Decidir o gerenciador de pacotes**

O `package.json` não tem campo `packageManager`. O `pnpm-lock.yaml` é mais antigo que o `package-lock.json`, e existe `pnpm-workspace.yaml` no repositório. Verifique qual está de fato em uso:

```bash
git log --oneline -5 -- package-lock.json
git log --oneline -5 -- pnpm-lock.yaml
```

O lockfile com commits mais recentes é o real. Remova o outro e fixe a escolha no `package.json`:

```bash
git rm pnpm-lock.yaml        # ou: git rm package-lock.json
```

- [ ] **Step 5: Fixar o gerenciador no `package.json`**

Adicione o campo `packageManager` logo depois de `"private"` (ou depois de `"version"` se não houver `private`), com a versão que `npm --version` reportar:

```json
  "packageManager": "npm@10.9.0",
```

- [ ] **Step 6: Confirmar que build e testes seguem verdes**

Run: `npm run build && npm test`
Expected: mesmo resultado do Step 2 e 3.

- [ ] **Step 7: Commit**

```bash
git add package.json
git commit -m "chore: fixar gerenciador de pacotes e remover lockfile duplicado"
```

---

### Task 2: helmet, ValidationPipe whitelist, trust proxy e limite de body

**Files:**
- Modify: `package.json` (dependência `helmet`)
- Modify: `src/main.ts:12-19` (imports e criação do app), `src/main.ts:22-25` (CORS/prefix), `src/main.ts:57` (ValidationPipe)

**Interfaces:**
- Produces: `app` com `helmet` aplicado, `trust proxy` habilitado (pré-requisito da Task 4 — sem isso o throttler limita o IP do proxy para todo mundo), `json`/`urlencoded` com limite de 5 MB preservando `rawBody` para a validação de assinatura do Stripe, e `ValidationPipe` com `whitelist: true`.

- [ ] **Step 1: Instalar o helmet**

```bash
npm install helmet
```

- [ ] **Step 2: Trocar a criação do app e adicionar os middlewares**

Em `src/main.ts`, substitua o bloco de imports do topo e a criação do app. Os imports passam a incluir `json` e `urlencoded` do express e o `helmet`:

```ts
import 'dotenv/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MulterExceptionFilter } from './shared/exceptions/multer-exception.filter';
import { DomainExceptionFilter } from './shared/exceptions/domain-exception.filter';
import { ConnectionErrorFilter } from './shared/exceptions/connection-error.filter';
import { Request, Response, NextFunction, json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
```

E o corpo inicial do `bootstrap()`:

```ts
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Preserva o corpo cru para a validação de assinatura do webhook do Stripe.
  // Necessário porque desligamos o bodyParser embutido do Nest para poder
  // impor um limite de tamanho.
  const rawBodySaver = (req: Request, _res: Response, buffer: Buffer) => {
    if (buffer?.length) {
      (req as Request & { rawBody?: Buffer }).rawBody = buffer;
    }
  };

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  app.use(cookieParser());

  // CSP desligado: esta é uma API JSON e o CSP default quebra os scripts
  // inline do Swagger UI. crossOriginResourcePolicy relaxado para que
  // portais de tenant em outras origens carreguem assets servidos pela API.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(json({ limit: '5mb', verify: rawBodySaver }));
  app.use(urlencoded({ extended: true, limit: '5mb', verify: rawBodySaver }));

  app.setGlobalPrefix('api', { exclude: ['wa/:code'] });

  // Atrás de nginx/proxy o IP do cliente chega em X-Forwarded-For; sem isso
  // o throttler da Task 4 limitaria o IP do proxy para todos os clientes.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
```

- [ ] **Step 3: Ligar o whitelist no ValidationPipe**

Substitua a linha `app.useGlobalPipes(new ValidationPipe({ transform: true }));` por:

```ts
  // whitelist remove campos de body/query sem decorator do class-validator
  // (proteção contra mass assignment). forbidNonWhitelisted fica desligado
  // até os clientes serem observados limpos em staging — ligar agora
  // transformaria um campo extra inofensivo em 400.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
```

- [ ] **Step 4: Verificar o build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 5: Verificar a suíte**

Run: `npm test`
Expected: mesmo número de testes passando da Task 1 Step 3.

- [ ] **Step 6: Verificar manualmente que o webhook do Stripe ainda recebe rawBody**

Suba a API (`npm run start:dev`) e confirme no log que ela inicia sem erro. Então:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:$PORT/api/webhooks/stripe \
  -H "Content-Type: application/json" -H "stripe-signature: t=0,v1=invalid" -d '{"id":"evt_test"}'
```

Expected: `400` (assinatura inválida — prova que o handler leu o corpo cru e chegou na validação de assinatura). Um `500` com erro de "rawBody undefined" significa que o `rawBodySaver` não foi aplicado; revise o Step 2.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/main.ts
git commit -m "feat(security): helmet, whitelist no ValidationPipe, trust proxy e limite de body de 5mb"
```

---

### Task 3: Extrair a configuração do Swagger e fechá-la em produção

**Files:**
- Create: `src/swagger.config.ts`
- Create: `src/swagger.config.spec.ts`
- Modify: `src/main.ts` (remove o bloco inline do Swagger, chama `setupSwagger`)

**Interfaces:**
- Produces: `setupSwagger(app: INestApplication, version: string): boolean` — retorna `true` se montou a documentação, `false` se estava desabilitada. Monta em `api/docs` quando `NODE_ENV !== 'production'` ou `SWAGGER_ENABLED === 'true'`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/swagger.config.spec.ts`:

```ts
import { isSwaggerEnabled } from './swagger.config';

describe('isSwaggerEnabled', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.SWAGGER_ENABLED;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SWAGGER_ENABLED = originalFlag;
  });

  it('habilita fora de produção', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SWAGGER_ENABLED;
    expect(isSwaggerEnabled()).toBe(true);
  });

  it('desabilita em produção por padrão', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SWAGGER_ENABLED;
    expect(isSwaggerEnabled()).toBe(false);
  });

  it('habilita em produção somente com opt-in explícito', () => {
    process.env.NODE_ENV = 'production';
    process.env.SWAGGER_ENABLED = 'true';
    expect(isSwaggerEnabled()).toBe(true);
  });

  it('não aceita valor diferente da string "true" como opt-in', () => {
    process.env.NODE_ENV = 'production';
    process.env.SWAGGER_ENABLED = '1';
    expect(isSwaggerEnabled()).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- swagger.config`
Expected: FAIL com `Cannot find module './swagger.config'`.

- [ ] **Step 3: Criar o `swagger.config.ts`**

```ts
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger fica aberto em qualquer ambiente que não seja produção. Em produção
 * só monta com opt-in explícito (`SWAGGER_ENABLED=true`) — a documentação
 * descreve toda a superfície da API e não deve ficar pública por default.
 */
export function isSwaggerEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.SWAGGER_ENABLED === 'true';
}

export function setupSwagger(app: INestApplication, version: string): boolean {
  if (!isSwaggerEnabled()) return false;

  const config = new DocumentBuilder()
    .setTitle('Reserve Admin API')
    .setDescription(
      [
        'API de gerenciamento e administração do sistema Reserve',
        '',
        '## Módulos API',
        '- **Subscriptions**: Gerenciamento de assinaturas recorrentes com Stripe',
        '- **Event Notification (SMS)**: Gestão de notificações SMS com webhooks',
        '- **Lead Management**: Gerenciamento de leads e prospects',
        '- **Email Campaign**: Campanhas de email marketing com segmentação',
        '- **Config**: Configuração de servidores SMTP',
      ].join('\n'),
    )
    .setVersion(version)
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Token JWT para autenticação admin',
    })
    .addTag('Subscriptions', 'API para gerenciamento de assinaturas Stripe')
    .addTag('Webhooks', 'Endpoints para webhooks externos (Stripe, etc)')
    .addTag('Event Notification (SMS)', 'API para gerenciamento de notificações SMS e webhooks')
    .addTag('Lead Management', 'API para gerenciamento de leads')
    .addTag('Email Campaign', 'API para campanhas de email marketing')
    .addTag('Config (SMTP Server)', 'API para configuração de servidores SMTP')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  return true;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- swagger.config`
Expected: PASS, 4 testes.

- [ ] **Step 5: Chamar o `setupSwagger` no `main.ts`**

Remova todo o bloco `// Configuração do Swagger` do `src/main.ts` (do `const config = new DocumentBuilder()` até `SwaggerModule.setup('api/docs', app, document);`) e substitua por:

```ts
  const { version } = require('../package.json') as { version: string };
  const swaggerMounted = setupSwagger(app, version);
```

Adicione o import no topo, junto aos outros:

```ts
import { setupSwagger } from './swagger.config';
```

Troque também o bloco de logs finais do `main.ts`, substituindo os dois `console.log` por:

```ts
  logger.log(`🚀 Aplicação rodando em: http://localhost:${process.env.PORT}`);
  if (swaggerMounted) {
    logger.log(`📚 Documentação Swagger em: http://localhost:${process.env.PORT}/api/docs`);
  }
```

E remova o `console.log(process.env.PORT)` solto que existe antes do `app.listen`.

- [ ] **Step 6: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde com 4 testes a mais que a linha de base.

- [ ] **Step 7: Verificar o gate manualmente**

```bash
NODE_ENV=production npm run start:prod &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:$PORT/api/docs
```

Expected: `404`. Depois repita com `SWAGGER_ENABLED=true NODE_ENV=production` e espere `200`. Encerre o processo em background quando terminar.

- [ ] **Step 8: Commit**

```bash
git add src/swagger.config.ts src/swagger.config.spec.ts src/main.ts
git commit -m "feat(security): extrair config do Swagger e fechá-la em produção por default"
```

---

### Task 4: ThrottlerGuard global e rate limit nas rotas de autenticação

**Files:**
- Modify: `src/app.module.ts` (imports `ThrottlerModule`, provider `APP_GUARD`)
- Modify: `src/modules/reserve-coupons/reserve-coupons.module.ts:22` (remover o `ThrottlerModule.forRoot` local)
- Modify: `src/modules/reserve-auth/infrastructure/controllers/admin.controller.ts:25` (`@Throttle` no login)
- Modify: `src/modules/reserve-auth/infrastructure/controllers/user.controller.ts` (`@Throttle` nas rotas de auth)

**Interfaces:**
- Consumes: `trust proxy` habilitado na Task 2 — sem ele o throttler conta o IP do proxy.
- Produces: `ThrottlerGuard` registrado como `APP_GUARD` com default de 100 requisições por 60 s. Rotas de autenticação com limites próprios via `@Throttle`.

> **Achado que esta task corrige:** `reserve-coupons.module.ts` faz `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` e `public-coupons.controller.ts` usa `@Throttle` em duas rotas — mas **nenhum `ThrottlerGuard` é registrado em lugar nenhum**. Os decorators `@Throttle` existentes são inertes hoje: não limitam nada. Registrar o guard global é o que os torna efetivos.

- [ ] **Step 1: Registrar o ThrottlerModule e o guard global**

Em `src/app.module.ts`, adicione aos imports do topo:

```ts
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
```

(a linha `import { RouterModule } from '@nestjs/core';` já existe — substitua-a pela versão acima)

No array `imports`, logo depois de `ConfigModule.forRoot({ isGlobal: true }),`:

```ts
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
```

E no array `providers`, junto aos pipes existentes:

```ts
  providers: [
    ToLowercaseQueryParamsPipe,
    ToLowercaseBodyRequestPipe,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
```

- [ ] **Step 2: Remover o ThrottlerModule local do módulo de cupons**

Em `src/modules/reserve-coupons/reserve-coupons.module.ts`, remova a linha `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),` do array `imports` e o import `import { ThrottlerModule } from '@nestjs/throttler';` do topo. O `forRoot` global da Task 4 Step 1 já cobre o módulo; um segundo `forRoot` sobrescreveria o default para as rotas de cupom com um limite mais baixo do que o pretendido.

- [ ] **Step 3: Limitar o login de admin**

Em `src/modules/reserve-auth/infrastructure/controllers/admin.controller.ts`, adicione o import:

```ts
import { Throttle } from '@nestjs/throttler';
```

E o decorator na rota de autenticação, logo abaixo de `@Post('/authenticate')` (linha 25):

```ts
    @Post('/authenticate')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
```

- [ ] **Step 4: Limitar as rotas de autenticação de usuário**

Leia `src/modules/reserve-auth/infrastructure/controllers/user.controller.ts` e identifique as rotas que aceitam credencial ou disparam e-mail (autenticação, pré-cadastro, cadastro, validação de token, reset de senha). Adicione o import do `Throttle` e, em cada uma delas:

```ts
    @Throttle({ default: { limit: 5, ttl: 60000 } })
```

Faça o mesmo em `src/modules/reserve-auth/infrastructure/controllers/admin-email.controller.ts` se ele tiver rota de envio de e-mail (esse controller também é tratado na Fase 2, que resolve a falta de guard nele — aqui só entra o rate limit).

- [ ] **Step 5: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde. Se algum spec de controller quebrar por falta do `ThrottlerGuard` no módulo de teste, adicione `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` aos `imports` do `Test.createTestingModule` daquele spec.

- [ ] **Step 6: Verificar o limite manualmente**

Suba a API e dispare 7 logins com senha errada:

```bash
for i in $(seq 1 7); do
  curl -s -o /dev/null -w "$i:%{http_code} " -X POST http://localhost:$PORT/api/admin/authenticate \
    -H "Content-Type: application/json" \
    -d '{"email":"naoexiste@reserve.com.br","password":"SenhaErrada!1"}'
done
echo
```

Expected: as 5 primeiras retornam `401`, a 6ª e a 7ª retornam `429`.

- [ ] **Step 7: Commit**

```bash
git add src/app.module.ts src/modules/reserve-coupons/reserve-coupons.module.ts src/modules/reserve-auth/infrastructure/controllers/
git commit -m "feat(security): registrar ThrottlerGuard global e limitar rotas de autenticação"
```

---

### Task 5: PrismaExceptionFilter

**Files:**
- Create: `src/shared/exceptions/prisma-exception.filter.ts`
- Create: `src/shared/exceptions/prisma-exception.filter.spec.ts`
- Modify: `src/shared/exceptions/index.ts`
- Modify: `src/main.ts` (registrar o filtro)

**Interfaces:**
- Produces: `PrismaExceptionFilter` — `ExceptionFilter` que traduz erro conhecido do Prisma em resposta HTTP com mensagem em português, sem vazar SQL, nome de coluna ou stack.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/shared/exceptions/prisma-exception.filter.spec.ts`:

```ts
import { ArgumentsHost } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/leads', method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

class FakePrismaError extends Error {
  constructor(public code: string, public meta?: Record<string, unknown>) {
    super(`Prisma error ${code}`);
    this.name = 'PrismaClientKnownRequestError';
  }
}

describe('PrismaExceptionFilter', () => {
  it('traduz violação de unicidade (P2002) em 409', () => {
    const { host, status, json } = makeHost();
    new PrismaExceptionFilter().catch(new FakePrismaError('P2002', { target: ['email'] }), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, code: 'UNIQUE_CONSTRAINT_VIOLATION' }),
    );
  });

  it('traduz registro não encontrado (P2025) em 404', () => {
    const { host, status } = makeHost();
    new PrismaExceptionFilter().catch(new FakePrismaError('P2025'), host);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('traduz violação de chave estrangeira (P2003) em 400', () => {
    const { host, status } = makeHost();
    new PrismaExceptionFilter().catch(new FakePrismaError('P2003'), host);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('devolve 500 genérico para código desconhecido e não vaza a mensagem do Prisma', () => {
    const { host, status, json } = makeHost();
    new PrismaExceptionFilter().catch(new FakePrismaError('P9999'), host);

    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain('P9999');
    expect(JSON.stringify(payload)).not.toContain('Prisma');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- prisma-exception.filter`
Expected: FAIL com `Cannot find module './prisma-exception.filter'`.

- [ ] **Step 3: Criar o filtro**

```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

interface PrismaErrorMapping {
  status: number;
  code: string;
  message: string;
}

/**
 * Traduz erro conhecido do Prisma em resposta HTTP com texto em português.
 * A mensagem original do Prisma nunca chega ao cliente: ela cita nome de
 * tabela, de coluna e às vezes o valor que colidiu.
 */
const MAPPINGS: Record<string, PrismaErrorMapping> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    code: 'UNIQUE_CONSTRAINT_VIOLATION',
    message: 'Já existe um registro com esse valor.',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    code: 'FOREIGN_KEY_VIOLATION',
    message: 'O registro referenciado não existe.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    code: 'RECORD_NOT_FOUND',
    message: 'Registro não encontrado.',
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    code: 'RELATION_VIOLATION',
    message: 'A operação quebraria uma relação obrigatória entre registros.',
  },
};

const FALLBACK: PrismaErrorMapping = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'DATABASE_ERROR',
  message: 'Não foi possível concluir a operação no banco de dados.',
};

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const code = (exception as { code?: string })?.code;
    const mapping = (code && MAPPINGS[code]) || FALLBACK;

    // O detalhe fica no log do servidor, não na resposta.
    this.logger.error(
      `${request?.method} ${request?.url} → Prisma ${code ?? 'validation'}: ${(exception as Error)?.message}`,
    );

    response.status(mapping.status).json({
      statusCode: mapping.status,
      code: mapping.code,
      message: mapping.message,
    });
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- prisma-exception.filter`
Expected: PASS, 4 testes.

> Se o `@Catch(Prisma.PrismaClientKnownRequestError, ...)` fizer o teste falhar porque a instância falsa do spec não é uma instância real da classe do Prisma, isso é esperado: o `@Catch` só afeta o roteamento do Nest, e o spec chama `.catch()` diretamente. Não altere o teste para instanciar erro real do Prisma — o objetivo é testar o mapeamento, não o roteamento.

- [ ] **Step 5: Exportar no barrel**

Adicione em `src/shared/exceptions/index.ts`:

```ts
export { PrismaExceptionFilter } from './prisma-exception.filter';
```

- [ ] **Step 6: Registrar no `main.ts`**

O `ConnectionErrorFilter` precisa continuar sendo o primeiro. Substitua o bloco `useGlobalFilters` por:

```ts
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new ConnectionErrorFilter(httpAdapterHost.httpAdapter), // primeiro: captura erro de conexão
    new PrismaExceptionFilter(),
    new DomainExceptionFilter(),
    new MulterExceptionFilter(),
  );
```

E adicione o import:

```ts
import { PrismaExceptionFilter } from './shared/exceptions/prisma-exception.filter';
```

- [ ] **Step 7: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde.

- [ ] **Step 8: Commit**

```bash
git add src/shared/exceptions/ src/main.ts
git commit -m "feat(security): PrismaExceptionFilter para não vazar detalhe de banco na resposta"
```

---

### Task 6: Middleware de timeout de upload com prefixo ancorado

**Files:**
- Modify: `src/main.ts:28-53` (o middleware de timeout)

**Interfaces:**
- Produces: timeout de 5 minutos aplicado **só** em POST/PUT/PATCH nos prefixos de rota que de fato hospedam upload multipart.

> **Achado que esta task corrige:** o middleware atual testa `req.path.includes('/upload')`, `req.path.includes('/assets')`, `req.path.includes('/images')` — casamento por substring, em qualquer método HTTP. Qualquer rota cujo caminho contenha essas palavras em qualquer posição (inclusive um `GET` com query, ou uma rota futura chamada `/api/reports/uploads-summary`) ganha 5 minutos de timeout. Isso é superfície de DoS por conexão pendurada.

- [ ] **Step 1: Descobrir onde estão os endpoints de upload de verdade**

```bash
grep -rn "FileInterceptor\|FilesInterceptor\|AnyFilesInterceptor" src --include=*.controller.ts
```

Anote o `@Controller('...')` de cada arquivo que apareceu. Esses são os prefixos reais — e só eles entram na lista de regex do Step 2. Se o resultado incluir um controller fora de `reserve-cms` ou `reserve-client-portal`, adicione o prefixo correspondente.

- [ ] **Step 2: Substituir o middleware**

Troque todo o bloco `// Increase timeouts for file upload routes` (do `app.use((req: Request, ...` até o `});` que fecha o middleware) por:

```ts
  // Timeout de 5 minutos SOMENTE em requisição mutante nos prefixos de rota
  // que de fato hospedam upload multipart (endpoints com FileInterceptor).
  // Prefixo ancorado — sem casamento por substring, que dava 5 min a
  // qualquer rota com "upload"/"assets"/"images" no caminho.
  const UPLOAD_TIMEOUT_METHODS = new Set(['POST', 'PUT', 'PATCH']);
  const UPLOAD_TIMEOUT_ROUTES: RegExp[] = [
    /^\/api\/cms\//, // assets, blogs, authors, articles/:id/images
  ];
  const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const isUploadRoute =
      UPLOAD_TIMEOUT_METHODS.has(req.method) &&
      UPLOAD_TIMEOUT_ROUTES.some((route) => route.test(req.path));

    if (isUploadRoute) {
      req.setTimeout(UPLOAD_TIMEOUT_MS);
      res.setTimeout(UPLOAD_TIMEOUT_MS);
      req.on('error', (error: Error) => logger.error(`Erro no stream da requisição: ${error.message}`));
      res.on('error', (error: Error) => logger.error(`Erro no stream da resposta: ${error.message}`));
    }

    next();
  });
```

Adicione ao array `UPLOAD_TIMEOUT_ROUTES` um prefixo por controller extra que o Step 1 tenha revelado, no mesmo formato ancorado (`/^\/api\/<prefixo>\//`).

- [ ] **Step 3: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde.

- [ ] **Step 4: Confirmar que o upload de mídia do CMS continua funcionando**

Suba a API e faça um upload real de imagem pelo endpoint de asset do CMS (o painel serve; ou `curl -F`). Expected: sucesso, sem timeout prematuro.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "fix(security): ancorar prefixo do timeout de upload e restringir a métodos mutantes"
```

---

### Task 7: Rota /health e encerramento gracioso

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `GET /health` (fora do prefixo `api`, registrado antes de qualquer guard, para o load balancer) e handlers de `SIGINT`/`SIGTERM` que fecham o app antes de sair.

- [ ] **Step 1: Adicionar a rota de health**

Em `src/main.ts`, logo depois de `const app = await NestFactory.create(...)` e antes do `app.use(cookieParser())`:

```ts
  // Registrada direto no adaptador: fica fora do prefixo `api` e antes de
  // qualquer guard global, para o health check do load balancer nunca
  // depender de autenticação nem de banco.
  app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) => res.status(200).send('OK'));
```

- [ ] **Step 2: Adicionar o encerramento gracioso**

Depois do `await app.listen(...)` e dos logs, no fim do `bootstrap()`:

```ts
  // Encerramento gracioso: fecha conexões HTTP, Prisma e Bull antes de sair.
  const gracefulShutdown = async (signal: string) => {
    logger.log(`${signal} recebido. Iniciando encerramento gracioso...`);
    try {
      await app.close();
      logger.log('Aplicação encerrada com sucesso.');
      process.exit(0);
    } catch (error) {
      logger.error('Erro durante o encerramento:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```

- [ ] **Step 3: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde.

- [ ] **Step 4: Verificar a rota de health**

Suba a API e:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:$PORT/health
```

Expected: `200`. Depois pare o processo com `Ctrl+C` e confirme no log a linha "SIGINT recebido. Iniciando encerramento gracioso..." seguida de "Aplicação encerrada com sucesso.".

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat: rota /health e encerramento gracioso em SIGINT/SIGTERM"
```

---

### Task 8: Migração de schema — versionamento de hash e colunas de lockout

**Files:**
- Modify: `prisma/schema.prisma` (`model AdminCredential`, `model UserCredential`)
- Create: `prisma/migrations/<timestamp>_credential_hardening/migration.sql` (gerada pelo Prisma)

**Interfaces:**
- Produces: colunas `hash_version Int @default(1) @db.SmallInt`, `failed_attempts Int @default(0)` e `locked_until DateTime?` em `AdminCredential` e `UserCredential`. Consumidas pelas Tasks 9, 10 e 11.

- [ ] **Step 1: Confirmar que a árvore está limpa**

```bash
git status
```
Expected: nada pendente além do que este plano já commitou. Uma migração do Prisma com mudanças não commitadas no schema é difícil de reverter.

- [ ] **Step 2: Adicionar as colunas em `AdminCredential`**

Em `prisma/schema.prisma`, o modelo passa a ser:

```prisma
model AdminCredential {
  id              String    @id @default(cuid()) @db.VarChar(25)
  admin_id        String    @unique @db.VarChar(25)
  hash            String
  salt            String
  hash_version    Int       @default(1) @db.SmallInt
  failed_attempts Int       @default(0)
  locked_until    DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  Admin           Admin     @relation(fields: [admin_id], references: [id])
}
```

- [ ] **Step 3: Adicionar as colunas em `UserCredential`**

```prisma
model UserCredential {
  id              String    @id @default(cuid()) @db.VarChar(25)
  user_id         String    @unique @db.VarChar(25)
  hash            String
  salt            String
  hash_version    Int       @default(1) @db.SmallInt
  failed_attempts Int       @default(0)
  locked_until    DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  User            User      @relation(fields: [user_id], references: [id])
}
```

> O default `1` é deliberado e só serve para rotular corretamente as linhas que já existem (hasheadas com 856 iterações). Toda escrita nova da aplicação grava `2` explicitamente — isso está nas Global Constraints e é verificado na Task 9.

- [ ] **Step 4: Gerar e aplicar a migração**

```bash
npx prisma migrate dev --name credential_hardening
```
Expected: cria `prisma/migrations/<timestamp>_credential_hardening/migration.sql` com `ALTER TABLE` nas duas tabelas e aplica no banco de dev. O Prisma regenera o client automaticamente.

- [ ] **Step 5: Conferir o SQL gerado**

```bash
cat prisma/migrations/*_credential_hardening/migration.sql
```
Expected: só `ALTER TABLE ... ADD COLUMN` — seis colunas no total, três por tabela. **Nenhum `DROP`**. Se aparecer `DROP`, o schema divergiu do banco: pare e reporte ao usuário antes de continuar.

- [ ] **Step 6: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(security): colunas de versão de hash e de lockout nas credenciais"
```

---

### Task 9: HashProvider com PBKDF2 versionado e comparação constante no tempo

**Files:**
- Modify: `src/shared/providers/hash.provider.ts`
- Create: `src/shared/providers/hash.provider.spec.ts`

**Interfaces:**
- Consumes: coluna `hash_version` da Task 8.
- Produces:
  - `type HashVersion = 1 | 2`
  - `interface HashResult { salt: string; hash: string; version: 2 }`
  - `hash(value: string): HashResult` — sempre v2 (210.000 iterações)
  - `compare(value: string, salt: string, hash: string, version: HashVersion = 2): boolean` — termina em `crypto.timingSafeEqual`

> **Atenção — os 6 pontos de chamada de `compare()` no repositório, e qual versão cada um passa.** Passar a versão errada faz **todo login daquele usuário falhar silenciosamente**:
>
> | Arquivo:linha | O que compara | Versão |
> |---|---|---|
> | `admin-credential.repository.ts:23` | senha (`AdminCredential`) | **explícita**, do campo `hash_version` |
> | `admin-session-token.repository.ts:29` | senha (`AdminCredential`) | **explícita**, do campo `hash_version` |
> | `admin-session-token.repository.ts:79` | token de sessão | default (2) — sem argumento |
> | `user-credential.repository.ts:21` | senha (`UserCredential`) | **explícita**, do campo `hash_version` |
> | `user-session-token.repository.ts:25` | senha (`UserCredential`) | **explícita**, do campo `hash_version` |
> | `user-session-token.repository.ts:75` | token de sessão | default (2) — sem argumento |

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/shared/providers/hash.provider.spec.ts`:

```ts
import { HashProvider } from './hash.provider';

describe('HashProvider', () => {
  let provider: HashProvider;
  const originalKey = process.env.ENCRYPT_PRIVATE_KEY;

  beforeAll(() => {
    process.env.ENCRYPT_PRIVATE_KEY = 'chave-de-teste-para-o-spec';
  });

  afterAll(() => {
    process.env.ENCRYPT_PRIVATE_KEY = originalKey;
  });

  beforeEach(() => {
    provider = new HashProvider();
  });

  it('sempre gera hash na versão 2', () => {
    const result = provider.hash('SenhaForte!123');
    expect(result.version).toBe(2);
    expect(result.salt).toHaveLength(32);
    expect(result.hash).toHaveLength(128);
  });

  it('valida um hash v2 recém-gerado com a versão default', () => {
    const { salt, hash } = provider.hash('SenhaForte!123');
    expect(provider.compare('SenhaForte!123', salt, hash)).toBe(true);
    expect(provider.compare('SenhaErrada!123', salt, hash)).toBe(false);
  });

  it('valida um hash legado v1 quando a versão 1 é passada', () => {
    // Reproduz o formato legado: 856 iterações com o mesmo esquema salt+chave.
    const crypto = require('crypto') as typeof import('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const legacyHash = crypto
      .pbkdf2Sync('SenhaAntiga!1', salt + process.env.ENCRYPT_PRIVATE_KEY, 856, 64, 'sha512')
      .toString('hex');

    expect(provider.compare('SenhaAntiga!1', salt, legacyHash, 1)).toBe(true);
  });

  it('rejeita um hash legado v1 quando a versão 2 é usada por engano', () => {
    const crypto = require('crypto') as typeof import('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const legacyHash = crypto
      .pbkdf2Sync('SenhaAntiga!1', salt + process.env.ENCRYPT_PRIVATE_KEY, 856, 64, 'sha512')
      .toString('hex');

    expect(provider.compare('SenhaAntiga!1', salt, legacyHash, 2)).toBe(false);
  });

  it('retorna false sem lançar quando o hash armazenado tem tamanho diferente', () => {
    const { salt } = provider.hash('SenhaForte!123');
    expect(provider.compare('SenhaForte!123', salt, 'abcd')).toBe(false);
  });

  it('usa 210000 iterações na versão 2', () => {
    const crypto = require('crypto') as typeof import('crypto');
    const { salt, hash } = provider.hash('SenhaForte!123');
    const expected = crypto
      .pbkdf2Sync('SenhaForte!123', salt + process.env.ENCRYPT_PRIVATE_KEY, 210_000, 64, 'sha512')
      .toString('hex');

    expect(hash).toBe(expected);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- hash.provider`
Expected: FAIL — `result.version` é `undefined` e o teste de 210.000 iterações não casa (o provider ainda usa 856).

- [ ] **Step 3: Reescrever o HashProvider**

Substitua todo o conteúdo de `src/shared/providers/hash.provider.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ProviderException } from '../exceptions';
import * as crypto from 'crypto';

export interface HashResult {
  salt: string;
  hash: string;
  version: 2;
}

export type HashVersion = 1 | 2;

/**
 * PBKDF2 SHA-512 versionado.
 * v1 = 856 iterações (legado, muito abaixo da recomendação OWASP — mantido
 * apenas para validar hashes já existentes até serem re-hasheados no próximo
 * login bem-sucedido).
 * v2 = 210.000 iterações (piso recomendado pela OWASP para PBKDF2-SHA512).
 * hash() sempre produz v2; compare() aceita a versão armazenada para que as
 * linhas legadas continuem validando durante a janela de re-hash.
 */
@Injectable()
export class HashProvider {
  private readonly ITERATIONS_V1 = 856;
  private readonly ITERATIONS_V2 = 210_000;
  private readonly KEY_LENGTH = 64;
  private readonly DIGEST = 'sha512';

  private get privateKey(): string {
    const key = process.env.ENCRYPT_PRIVATE_KEY;
    if (!key) {
      throw new ProviderException(
        'Nao foi possivel encontrar a chave privada de seguranca.',
        'ENCRYPT_KEY_MISSING',
      );
    }
    return key;
  }

  private iterationsFor(version: HashVersion): number {
    return version === 1 ? this.ITERATIONS_V1 : this.ITERATIONS_V2;
  }

  hash(value: string): HashResult {
    const { salt, hash } = this.hashWithIterations(value, this.ITERATIONS_V2);
    return { salt, hash, version: 2 };
  }

  compare(value: string, salt: string, hash: string, version: HashVersion = 2): boolean {
    try {
      const { hash: computed } = this.hashWithIterations(value, this.iterationsFor(version), salt);

      const storedBuffer = Buffer.from(hash, 'hex');
      const computedBuffer = Buffer.from(computed, 'hex');

      // timingSafeEqual lança se os tamanhos diferem; comparar antes evita
      // trocar um retorno false por uma exceção.
      if (storedBuffer.length !== computedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(storedBuffer, computedBuffer);
    } catch (error) {
      throw new ProviderException('Erro ao comparar um hash', 'HASH_COMPARE_ERROR', error);
    }
  }

  private hashWithIterations(
    value: string,
    iterations: number,
    existingSalt?: string,
  ): { salt: string; hash: string } {
    try {
      const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
      const hash = crypto
        .pbkdf2Sync(value, salt + this.privateKey, iterations, this.KEY_LENGTH, this.DIGEST)
        .toString('hex');

      return { salt, hash };
    } catch (error) {
      throw new ProviderException('Erro ao gerar um hash', 'HASH_ERROR', error);
    }
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- hash.provider`
Expected: PASS, 6 testes.

- [ ] **Step 5: Passar a versão nos 4 pontos de chamada que leem credencial de senha**

`src/modules/reserve-auth/infrastructure/repositories/admin-credential.repository.ts` — o método `compareHashByAdminId` passa a ler a versão e a devolver também a versão, para a Task 11 saber se precisa re-hashear:

```ts
    async compareHashByAdminId(value: string, adminId: string) {
        try {
            const credential = await this.prisma.adminCredential.findUnique({
                where: {
                    admin_id: adminId
                }
            })

            if (!credential) return false;

            const compare = this.hashProvider.compare(
                value,
                credential.salt,
                credential.hash,
                credential.hash_version as 1 | 2,
            );
            if (typeof compare !== 'boolean') return false;

            return compare;
        } catch (error) {
            throw new RepositoryException('Erro ao comparar os hashs.', error);
        }
    }
```

E o `updatePasswordByAdminId` grava explicitamente a versão 2 e zera o lockout:

```ts
    async updatePasswordByAdminId(adminId: string, password: string) {
        try {
            const { hash, salt, version } = this.hashProvider.hash(password);
            await this.prisma.adminCredential.upsert({
                where: { admin_id: adminId },
                update: { hash, salt, hash_version: version, failed_attempts: 0, locked_until: null },
                create: { admin_id: adminId, hash, salt, hash_version: version },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar credenciais do admin.', error);
        }
    }
```

`src/modules/reserve-auth/infrastructure/repositories/admin-session-token.repository.ts:29` — dentro de `create()`:

```ts
            const compare = this.hashProvider.compare(
                data.password,
                credential.salt,
                credential.hash,
                credential.hash_version as 1 | 2,
            );
```

`src/modules/reserve-auth/infrastructure/repositories/user-credential.repository.ts:21`:

```ts
            const compare = this.hashProvider.compare(
                value,
                credential.salt,
                credential.hash,
                credential.hash_version as 1 | 2,
            );
```

`src/modules/reserve-auth/infrastructure/repositories/user-session-token.repository.ts:25`:

```ts
            const compare = this.hashProvider.compare(
                data.password,
                credential.salt,
                credential.hash,
                credential.hash_version as 1 | 2,
            );
```

**Não toque** em `admin-session-token.repository.ts:79` nem em `user-session-token.repository.ts:75` — esses comparam token de sessão, sempre criado por `hash()` (v2), e o default cobre.

- [ ] **Step 6: Gravar versão 2 nos pontos que criam credencial nova**

`src/modules/reserve-auth/infrastructure/repositories/admin.repository.ts:27` e `src/modules/reserve-auth/infrastructure/repositories/user.repository.ts:35` desestruturam `const { hash, salt } = this.hashProvider.hash(data.password);`. Em cada um, passe a desestruturar `version` também e inclua `hash_version: version` no objeto `create` da credencial correspondente. Faça o mesmo em `src/modules/reserve-client-portal/application/services/hotel-client.service.ts:29` se ele escrever numa tabela de credencial (leia o arquivo; se ele grava em `HotelApiCredential`, que não tem a coluna, deixe como está).

- [ ] **Step 7: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde com 6 testes a mais.

- [ ] **Step 8: Verificar login real com um hash legado**

Suba a API e faça login com um admin **existente** (hash v1 no banco):

```bash
curl -s -X POST http://localhost:$PORT/api/admin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-existente>","password":"<senha-real>"}' | head -c 200
```

Expected: `200` com `session_token`. Se der 401, o `compare` com versão 1 não está funcionando — revise o Step 5 antes de seguir.

- [ ] **Step 9: Medir a latência do login**

```bash
curl -s -o /dev/null -w "tempo total: %{time_total}s\n" -X POST http://localhost:$PORT/api/admin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-existente>","password":"<senha-real>"}'
```

Anote o valor. **Esperado ~0,2–0,4 s** e não mais: o fluxo de login faz PBKDF2 sobre a senha **duas vezes** — uma em `AdminService.authenticate` (via `compareHashByAdminId`) e outra dentro de `AdminSessionTokenRepository.create`. A 210.000 iterações cada passagem custa ~100 ms. Se o valor passar de 1 s, reporte ao usuário antes de continuar: a verificação duplicada precisa de decisão de produto (mantê-la como defesa em profundidade e aceitar o custo, ou remover a segunda). **Não remova a segunda verificação por conta própria** — é uma checagem de segurança.

- [ ] **Step 10: Commit**

```bash
git add src/shared/providers/hash.provider.ts src/shared/providers/hash.provider.spec.ts src/modules/reserve-auth/infrastructure/repositories/ src/modules/reserve-client-portal/
git commit -m "feat(security): PBKDF2 versionado com 210k iterações e comparação constante no tempo"
```

---

### Task 10: Política de lockout progressivo

**Files:**
- Create: `src/shared/auth/account-lockout.policy.ts`
- Create: `src/shared/auth/account-lockout.policy.spec.ts`

**Interfaces:**
- Produces:
  - `const LOCKOUT_THRESHOLD = 5`
  - `interface LockoutEvaluation { locked: boolean; lockedUntil?: Date }`
  - `function evaluateLockout(failedAttempts: number, now?: Date): LockoutEvaluation`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/shared/auth/account-lockout.policy.spec.ts`:

```ts
import { evaluateLockout, LOCKOUT_THRESHOLD } from './account-lockout.policy';

const NOW = new Date('2026-07-26T12:00:00.000Z');

describe('evaluateLockout', () => {
  it('não trava com zero tentativas falhas', () => {
    expect(evaluateLockout(0, NOW)).toEqual({ locked: false });
  });

  it('não trava abaixo do limite', () => {
    for (let attempts = 1; attempts < LOCKOUT_THRESHOLD; attempts += 1) {
      expect(evaluateLockout(attempts, NOW).locked).toBe(false);
    }
  });

  it('trava 15 minutos no primeiro ciclo (5 tentativas)', () => {
    const result = evaluateLockout(5, NOW);
    expect(result.locked).toBe(true);
    expect(result.lockedUntil).toEqual(new Date('2026-07-26T12:15:00.000Z'));
  });

  it('dobra a janela no segundo ciclo (10 tentativas)', () => {
    const result = evaluateLockout(10, NOW);
    expect(result.locked).toBe(true);
    expect(result.lockedUntil).toEqual(new Date('2026-07-26T12:30:00.000Z'));
  });

  it('dobra de novo no terceiro ciclo (15 tentativas)', () => {
    const result = evaluateLockout(15, NOW);
    expect(result.lockedUntil).toEqual(new Date('2026-07-26T13:00:00.000Z'));
  });

  it('não trava dentro de um ciclo já iniciado', () => {
    // 6, 7, 8 e 9 estão entre ciclos: quem incrementa-e-checa não deve
    // travar de novo a cada tentativa, só ao fechar o múltiplo de 5.
    for (const attempts of [6, 7, 8, 9]) {
      expect(evaluateLockout(attempts, NOW).locked).toBe(false);
    }
  });

  it('limita a janela em 24 horas', () => {
    const result = evaluateLockout(5 * 20, NOW); // ciclo 20 → 15min * 2^19
    expect(result.lockedUntil).toEqual(new Date('2026-07-27T12:00:00.000Z'));
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- account-lockout.policy`
Expected: FAIL com `Cannot find module './account-lockout.policy'`.

- [ ] **Step 3: Criar a política**

```ts
export const LOCKOUT_THRESHOLD = 5;
const BASE_LOCKOUT_MINUTES = 15;
const MAX_LOCKOUT_MINUTES = 24 * 60;

export interface LockoutEvaluation {
  locked: boolean;
  lockedUntil?: Date;
}

/**
 * Lockout progressivo de conta: dispara somente quando failedAttempts é um
 * múltiplo exato de LOCKOUT_THRESHOLD (5, 10, 15...), para que quem
 * incrementa-e-checa trave uma vez por ciclo, não a cada tentativa dentro
 * dele. Cada ciclo dobra a janela, com teto de 24 h.
 */
export function evaluateLockout(failedAttempts: number, now: Date = new Date()): LockoutEvaluation {
  if (failedAttempts === 0 || failedAttempts % LOCKOUT_THRESHOLD !== 0) {
    return { locked: false };
  }

  const cycle = failedAttempts / LOCKOUT_THRESHOLD; // 1, 2, 3...
  const minutes = Math.min(BASE_LOCKOUT_MINUTES * Math.pow(2, cycle - 1), MAX_LOCKOUT_MINUTES);
  const lockedUntil = new Date(now.getTime() + minutes * 60_000);

  return { locked: true, lockedUntil };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- account-lockout.policy`
Expected: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/shared/auth/account-lockout.policy.ts src/shared/auth/account-lockout.policy.spec.ts
git commit -m "feat(security): política pura de lockout progressivo de conta"
```

---

### Task 11: Ligar o lockout e o re-hash no login de admin

**Files:**
- Modify: `src/modules/reserve-auth/infrastructure/repositories/admin-credential.repository.ts`
- Modify: `src/modules/reserve-auth/domain/interfaces/admin.repository.interface.ts` (ou onde vive `IAdminCredentialRepository` — confirme com grep)
- Modify: `src/modules/reserve-auth/application/services/admin.service.ts:86-144` (método `authenticate`)
- Create: `src/modules/reserve-auth/application/services/admin.service.lockout.spec.ts`

**Interfaces:**
- Consumes: `evaluateLockout`, `LOCKOUT_THRESHOLD` (Task 10); `compare(..., version)` e `HashResult.version` (Task 9); colunas de lockout (Task 8).
- Produces: novos métodos no `AdminCredentialRepository`:
  - `findLockoutState(adminId: string): Promise<{ lockedUntil: Date | null; failedAttempts: number; hashVersion: 1 | 2 } | null>`
  - `registerFailedAttempt(adminId: string): Promise<void>` — incrementa e aplica `evaluateLockout`
  - `clearFailedAttempts(adminId: string): Promise<void>`
  - `rehashToLatest(adminId: string, plainPassword: string): Promise<void>`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/modules/reserve-auth/application/services/admin.service.lockout.spec.ts`:

```ts
import { evaluateLockout } from '../../../../shared/auth/account-lockout.policy';

describe('fluxo de lockout no login de admin', () => {
  it('a 5ª falha consecutiva produz um lockout de 15 minutos', () => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    const evaluation = evaluateLockout(5, now);

    expect(evaluation.locked).toBe(true);
    expect(evaluation.lockedUntil).toEqual(new Date('2026-07-26T12:15:00.000Z'));
  });

  it('uma conta com locked_until no futuro é considerada travada', () => {
    const now = new Date('2026-07-26T12:05:00.000Z');
    const lockedUntil = new Date('2026-07-26T12:15:00.000Z');

    expect(lockedUntil > now).toBe(true);
  });

  it('uma conta com locked_until no passado deixa de estar travada', () => {
    const now = new Date('2026-07-26T12:20:00.000Z');
    const lockedUntil = new Date('2026-07-26T12:15:00.000Z');

    expect(lockedUntil > now).toBe(false);
  });
});
```

> Este spec cobre a aritmética do fluxo sem montar o módulo de DI inteiro. A verificação de ponta a ponta é o Step 8, contra a API rodando — é o que realmente prova a integração.

- [ ] **Step 2: Rodar o teste e confirmar que passa**

Run: `npm test -- admin.service.lockout`
Expected: PASS, 3 testes. (Este spec passa de imediato porque só exercita a política da Task 10; ele existe para travar a semântica esperada antes de mexer no serviço.)

- [ ] **Step 3: Adicionar os métodos de lockout no repositório de credencial**

Em `src/modules/reserve-auth/infrastructure/repositories/admin-credential.repository.ts`, adicione o import e os quatro métodos:

```ts
import { evaluateLockout } from '../../../../shared/auth/account-lockout.policy';
```

```ts
    async findLockoutState(adminId: string) {
        try {
            const credential = await this.prisma.adminCredential.findUnique({
                where: { admin_id: adminId },
                select: { locked_until: true, failed_attempts: true, hash_version: true },
            });

            if (!credential) return null;

            return {
                lockedUntil: credential.locked_until,
                failedAttempts: credential.failed_attempts,
                hashVersion: credential.hash_version as 1 | 2,
            };
        } catch (error) {
            throw new RepositoryException('Erro ao consultar o estado de bloqueio do admin.', error);
        }
    }

    async registerFailedAttempt(adminId: string) {
        try {
            const updated = await this.prisma.adminCredential.update({
                where: { admin_id: adminId },
                data: { failed_attempts: { increment: 1 } },
                select: { failed_attempts: true },
            });

            const evaluation = evaluateLockout(updated.failed_attempts);
            if (evaluation.locked) {
                await this.prisma.adminCredential.update({
                    where: { admin_id: adminId },
                    data: { locked_until: evaluation.lockedUntil },
                });
            }
        } catch (error) {
            throw new RepositoryException('Erro ao registrar tentativa de login falha.', error);
        }
    }

    async clearFailedAttempts(adminId: string) {
        try {
            await this.prisma.adminCredential.update({
                where: { admin_id: adminId },
                data: { failed_attempts: 0, locked_until: null },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao limpar tentativas de login falhas.', error);
        }
    }

    async rehashToLatest(adminId: string, plainPassword: string) {
        try {
            const { hash, salt, version } = this.hashProvider.hash(plainPassword);
            await this.prisma.adminCredential.update({
                where: { admin_id: adminId },
                data: { hash, salt, hash_version: version },
            });
        } catch (error) {
            throw new RepositoryException('Erro ao atualizar a versão do hash da senha.', error);
        }
    }
```

- [ ] **Step 4: Declarar os métodos na interface**

Localize a interface:

```bash
grep -rn "IAdminCredentialRepository" src --include=*.ts
```

Adicione à declaração da interface:

```ts
  findLockoutState(adminId: string): Promise<{
    lockedUntil: Date | null;
    failedAttempts: number;
    hashVersion: 1 | 2;
  } | null>;
  registerFailedAttempt(adminId: string): Promise<void>;
  clearFailedAttempts(adminId: string): Promise<void>;
  rehashToLatest(adminId: string, plainPassword: string): Promise<void>;
```

- [ ] **Step 5: Adicionar o código de erro 423**

Em `src/shared/constants/error-types.ts`, adicione um bloco `_423` depois do `_401` (mantendo o padrão `'<status>:<CODE>'` usado no arquivo):

```ts
  _423: {
    admin_account_locked: '423:ADMIN_ACCOUNT_LOCKED',
  },
```

- [ ] **Step 6: Ligar o fluxo no `authenticate`**

Em `src/modules/reserve-auth/application/services/admin.service.ts`, substitua o corpo do `authenticate` (linhas 86–144) por:

```ts
    async authenticate(data: AuthAdminDTO) {
        try {
            const admin = await this.adminRepository.selectByEmail(data.email);

            if (!admin || !admin.id) {
                return errorResponse(errorTypes._401.admin_email_nf, 401);
            }

            if (!admin.active) {
                return errorResponse('403:ADMIN_ACCOUNT_DEACTIVATED', 403);
            }

            if (admin.email !== data.email) {
                return {
                    status: 401,
                    data: {
                        code: errorTypes._401.admin_email_nf
                    }
                }
            }

            // Lockout por conta, persistido — complementa o rate limit por IP
            // (que não protege quem troca de IP a cada tentativa).
            const lockout = await this.adminCredentialRepository.findLockoutState(admin.id);
            if (lockout?.lockedUntil && lockout.lockedUntil > new Date()) {
                return {
                    status: 423,
                    data: {
                        code: errorTypes._423.admin_account_locked,
                        message: 'Conta temporariamente bloqueada por tentativas de senha incorretas. Tente novamente mais tarde.',
                        locked_until: lockout.lockedUntil.toISOString(),
                    }
                }
            }

            const compareHashByAdminId = await this.adminCredentialRepository.compareHashByAdminId(data.password, admin.id);

            if (!compareHashByAdminId) {
                await this.adminCredentialRepository.registerFailedAttempt(admin.id);
                return errorResponse(errorTypes._401.admin_password_in, 401);
            }

            await this.adminCredentialRepository.clearFailedAttempts(admin.id);

            // Re-hash transparente de v1 para v2. Precisa acontecer ANTES de
            // criar a sessão: o JWT é assinado com credential.salt, e
            // AdminSessionTokenRepository.create relê a credencial — então ele
            // já pega o salt novo e emite um token válido na mesma resposta.
            if (lockout?.hashVersion === 1) {
                await this.adminCredentialRepository.rehashToLatest(admin.id, data.password);
            }

            const session = await this.adminSessionTokenRepository.create({
                admin_id: admin.id,
                password: data.password,
                payload: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                }
            });

            if (!session.token) {
                return errorResponse(errorTypes._401.admin_password_in, 401);
            }

            return {
                status: 200,
                data: {
                    session_id: session.id,
                    session_token: session.token,
                    details: {
                        name: admin.name,
                        email: admin.email,
                        role: normalizeAdminRole(admin.role as EAdminRole),
                    }
                }
            }
        } catch (error) {
            console.log(error)
            return errorResponse(errorTypes._500.admin_una, 500, error);
        }
    }
```

- [ ] **Step 7: Documentar o 423 no Swagger**

Em `src/modules/reserve-auth/infrastructure/controllers/admin.controller.ts`, junto aos `@ApiResponse` já existentes da rota `/authenticate`:

```ts
    @ApiResponse({ status: 423, description: 'Conta bloqueada por tentativas de senha incorretas' })
```

- [ ] **Step 8: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde.

- [ ] **Step 9: Verificar o lockout de ponta a ponta**

O rate limit por IP da Task 4 é de 5 por minuto, então espace as tentativas para não bater 429 antes do 423. Com um admin real:

```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "$i:%{http_code} " -X POST http://localhost:$PORT/api/admin/authenticate \
    -H "Content-Type: application/json" \
    -d '{"email":"<admin-existente>","password":"SenhaTotalmenteErrada!9"}'
  sleep 13
done
echo
curl -s -X POST http://localhost:$PORT/api/admin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-existente>","password":"<senha-correta>"}' | head -c 300
```

Expected: as 5 primeiras retornam `401`; a última, **mesmo com a senha correta**, retorna `423` com `locked_until`. Depois libere a conta para não travar seu próprio acesso:

```bash
npx prisma studio
```
e zere `failed_attempts` e `locked_until` do admin usado no teste — ou rode o `clearFailedAttempts` via um login bem-sucedido após o fim da janela.

- [ ] **Step 10: Commit**

```bash
git add src/modules/reserve-auth/ src/shared/constants/error-types.ts
git commit -m "feat(security): lockout progressivo por conta e re-hash transparente no login de admin"
```

---

### Task 12: Validator IsStrongPassword

**Files:**
- Create: `src/shared/validators/is-strong-password.validator.ts`
- Create: `src/shared/validators/is-strong-password.validator.spec.ts`
- Modify: `src/shared/validators/index.ts`

**Interfaces:**
- Produces: `IsStrongPassword(validationOptions?: ValidationOptions): PropertyDecorator` — exige 10+ caracteres com ao menos uma maiúscula, uma minúscula, um dígito e um símbolo.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/shared/validators/is-strong-password.validator.spec.ts`:

```ts
import { validate } from 'class-validator';
import { IsStrongPassword } from './is-strong-password.validator';

class Dto {
  @IsStrongPassword()
  password: string;
}

async function isValidPassword(password: string): Promise<boolean> {
  const dto = new Dto();
  dto.password = password;
  const errors = await validate(dto);
  return errors.length === 0;
}

describe('IsStrongPassword', () => {
  it('rejeita senha com menos de 10 caracteres', async () => {
    expect(await isValidPassword('Ab1!Ab1!')).toBe(false); // 8 caracteres
  });

  it('rejeita senha sem letra maiúscula', async () => {
    expect(await isValidPassword('abcdefgh1!')).toBe(false);
  });

  it('rejeita senha sem letra minúscula', async () => {
    expect(await isValidPassword('ABCDEFGH1!')).toBe(false);
  });

  it('rejeita senha sem dígito', async () => {
    expect(await isValidPassword('Abcdefgh!!')).toBe(false);
  });

  it('rejeita senha sem símbolo', async () => {
    expect(await isValidPassword('Abcdefgh12')).toBe(false);
  });

  it('aceita senha que cumpre os quatro requisitos com exatamente 10 caracteres', async () => {
    expect(await isValidPassword('Str0ng!Pas')).toBe(true);
  });

  it('aceita senha longa e claramente forte', async () => {
    expect(await isValidPassword('C0rrect!HorseBattery')).toBe(true);
  });

  it('rejeita valor que não é string', async () => {
    const dto = new Dto();
    (dto as unknown as { password: number }).password = 12345678901;
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('devolve uma mensagem em português dizendo o que falta', async () => {
    const dto = new Dto();
    dto.password = 'fraca';
    const errors = await validate(dto);
    const message = Object.values(errors[0].constraints ?? {}).join(' ');
    expect(message).toContain('10 caracteres');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- is-strong-password`
Expected: FAIL com `Cannot find module './is-strong-password.validator'`.

- [ ] **Step 3: Criar o validator**

```ts
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

const MIN_LENGTH = 10;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;

/**
 * Substitui @MinLength(6)/@MinLength(8) em campo de senha: exige 10+
 * caracteres com ao menos uma maiúscula, uma minúscula, um dígito e um
 * símbolo. Não verifica senha vazada — isso é escopo de outra fase.
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    return (
      value.length >= MIN_LENGTH &&
      HAS_UPPERCASE.test(value) &&
      HAS_LOWERCASE.test(value) &&
      HAS_DIGIT.test(value) &&
      HAS_SYMBOL.test(value)
    );
  }

  defaultMessage(): string {
    return `A senha precisa ter no mínimo ${MIN_LENGTH} caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo.`;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- is-strong-password`
Expected: PASS, 9 testes.

- [ ] **Step 5: Exportar no barrel**

Adicione em `src/shared/validators/index.ts`:

```ts
export { IsStrongPassword, IsStrongPasswordConstraint } from './is-strong-password.validator';
```

- [ ] **Step 6: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde com 9 testes a mais.

- [ ] **Step 7: Commit**

```bash
git add src/shared/validators/
git commit -m "feat(security): validator IsStrongPassword com 10+ caracteres e quatro classes"
```

---

### Task 13: Aplicar a política de senha forte nos DTOs

**Files:**
- Modify: `src/modules/reserve-auth/application/dtos/admin-management.dto.ts:54`
- Modify: `src/modules/reserve-auth/application/dtos/create-user.dto.ts:33`
- Modify: `src/modules/reserve-client-portal/application/dtos/create-client.dto.ts:23`

**Interfaces:**
- Consumes: `IsStrongPassword` (Task 12).

> **`auth-admin.dto.ts` NÃO entra nesta task.** Ele é o DTO de **login**, não de definição de senha. Aplicar `IsStrongPassword` ali trancaria fora todo admin cuja senha atual é mais curta que a política nova — e pior, o 400 de validação vazaria a política de senha para quem só está tentando entrar. O DTO de login mantém `@MinLength(6)`. A política nova vale para **criação e troca** de senha.

- [ ] **Step 1: Trocar em `admin-management.dto.ts`**

Substitua o campo `password` (linhas ~51-55):

```ts
  @ApiPropertyOptional({ description: 'Administrator password (super_admin only)', example: 'Str0ng!Pass' })
  @IsString()
  @IsOptional()
  @IsStrongPassword()
  password?: string;
```

E o import no topo — remova `MinLength` da lista do `class-validator` **se não houver outro uso no arquivo** (verifique com `grep -n "MinLength" src/modules/reserve-auth/application/dtos/admin-management.dto.ts`; o arquivo também importa `MaxLength`, que fica), e adicione:

```ts
import { IsStrongPassword } from '../../../../shared/validators';
```

- [ ] **Step 2: Trocar em `create-user.dto.ts`**

```ts
    @ApiProperty({ description: 'Senha (mínimo 10 caracteres, com maiúscula, minúscula, número e símbolo)', example: 'Str0ng!Pass', minLength: 10 })
    @IsString()
    @IsNotEmpty()
    @IsStrongPassword()
    password: string;
```

Adicione o import `import { IsStrongPassword } from '../../../../shared/validators';` e remova `MinLength` da lista de imports do `class-validator` se não houver outro uso.

- [ ] **Step 3: Trocar em `create-client.dto.ts`**

```ts
  @IsOptional()
  @IsString()
  @IsStrongPassword()
  password?: string;
```

Adicione `import { IsStrongPassword } from '../../../../shared/validators';` e ajuste o import do `class-validator` (o arquivo usa `MaxLength` em outros campos, então só remova `MinLength`).

- [ ] **Step 4: Confirmar que nenhum outro campo de senha ficou de fora**

```bash
grep -rn "MinLength" src --include=*.dto.ts
```
Expected: as únicas ocorrências restantes são em `auth-admin.dto.ts` (DTO de login, intencional) e em campos que **não** são senha. Se aparecer outro campo de senha, aplique `IsStrongPassword` nele também.

- [ ] **Step 5: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde. Se algum spec criava usuário com senha curta como fixture, atualize a fixture para uma senha válida (ex.: `'Str0ng!Pass'`) — o spec estava testando o caminho felizes com dado que agora é inválido.

- [ ] **Step 6: Verificar a rejeição manualmente**

```bash
curl -s -X POST http://localhost:$PORT/api/admin/register \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token-super-admin>" \
  -d '{"name":"Teste","email":"teste.senha@reserve.com.br","role":"viewer","password":"123456"}' | head -c 300
```
Expected: `400` com a mensagem em português sobre os 10 caracteres. Repita com `"password":"Str0ng!Pass"` e espere sucesso.

- [ ] **Step 7: Commit**

```bash
git add src/modules/reserve-auth/application/dtos/ src/modules/reserve-client-portal/application/dtos/
git commit -m "feat(security): exigir senha forte na criação e troca de senha"
```

---

### Task 14: JwtProvider separando token forjado de token expirado

**Files:**
- Modify: `src/shared/providers/jwt.provider.ts`
- Create: `src/shared/providers/jwt.provider.spec.ts`

**Interfaces:**
- Produces: `interface JwtValidationResult { jwt: string; expired?: boolean; invalid?: boolean; payload?: JwtPayload }` — `expired` só para `TokenExpiredError`; `invalid` para `JsonWebTokenError` e `NotBeforeError`.

> **Achado que esta task corrige:** hoje uma assinatura forjada e um token legitimamente expirado produzem a mesma resposta (`expired: true`). Isso apaga o sinal de ataque — um atacante forjando tokens fica indistinguível de um usuário com sessão vencida, tanto no log quanto para o cliente.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/shared/providers/jwt.provider.spec.ts`:

```ts
import * as jwt from 'jsonwebtoken';
import { JwtProvider } from './jwt.provider';

describe('JwtProvider.validate', () => {
  const originalKey = process.env.JWT_PRIVATE_KEY;
  let provider: JwtProvider;

  beforeAll(() => {
    process.env.JWT_PRIVATE_KEY = 'chave-jwt-de-teste';
  });

  afterAll(() => {
    process.env.JWT_PRIVATE_KEY = originalKey;
  });

  beforeEach(() => {
    provider = new JwtProvider();
  });

  it('devolve o payload para um token válido', async () => {
    const token = await provider.generate({ id: 'abc' }, 3600);
    const result = await provider.validate(token);

    expect(result.payload?.id).toBe('abc');
    expect(result.expired).toBeUndefined();
    expect(result.invalid).toBeUndefined();
  });

  it('marca como expirado (não inválido) um token vencido', async () => {
    const token = jwt.sign({ id: 'abc' }, 'chave-jwt-de-teste', { expiresIn: -10 });
    const result = await provider.validate(token);

    expect(result.expired).toBe(true);
    expect(result.invalid).toBeUndefined();
  });

  it('marca como inválido (não expirado) um token com assinatura forjada', async () => {
    const token = jwt.sign({ id: 'abc' }, 'chave-completamente-diferente', { expiresIn: 3600 });
    const result = await provider.validate(token);

    expect(result.invalid).toBe(true);
    expect(result.expired).toBeUndefined();
  });

  it('marca como inválido um token ainda não válido (nbf no futuro)', async () => {
    const token = jwt.sign({ id: 'abc', nbf: Math.floor(Date.now() / 1000) + 600 }, 'chave-jwt-de-teste');
    const result = await provider.validate(token);

    expect(result.invalid).toBe(true);
    expect(result.expired).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- jwt.provider`
Expected: FAIL nos dois últimos testes — `result.invalid` é `undefined` e `result.expired` é `true`, porque o provider atual colapsa `JsonWebTokenError` em `expired`.

- [ ] **Step 3: Separar os casos de erro**

Em `src/shared/providers/jwt.provider.ts`, adicione `invalid` à interface:

```ts
export interface JwtValidationResult {
  jwt: string;
  expired?: boolean;
  invalid?: boolean;
  payload?: JwtPayload;
}
```

E substitua o bloco `catch` do `validate`:

```ts
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          jwt: token,
          expired: true,
        };
      }

      // Assinatura forjada, token malformado ou nbf no futuro: NÃO é expiração.
      // Colapsar os dois casos apaga o sinal de ataque no log e na resposta.
      if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
        return {
          jwt: token,
          invalid: true,
        };
      }

      throw new ProviderException('JWT: error validating token', 'JWT_VALIDATION_ERROR', error);
    }
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- jwt.provider`
Expected: PASS, 4 testes.

- [ ] **Step 5: Conferir os consumidores de `validate()`**

```bash
grep -rn "jwtProvider.validate\|\.validate(token" src --include=*.ts
```

Todo consumidor que hoje faz `if (expired)` continua correto para o caso de expiração, mas passa a **deixar passar** o token forjado, que agora vem com `invalid: true` e `expired: undefined`. Em cada ponto encontrado (esperado: `admin-session-token.repository.ts:83` e o equivalente em `user-session-token.repository.ts`), troque a condição para cobrir os dois:

```ts
            const { jwt, expired, invalid, payload } = await this.jwtProvider.validate(token, session.Admin.AdminCredential.salt);

            if (expired || invalid || !payload?.id) {
                return false;
            }
```

Isso é obrigatório — sem ele, esta task **abre** um buraco em vez de fechar um. Faça o mesmo em todos os pontos que o grep retornar.

- [ ] **Step 6: Verificar build e suíte**

Run: `npm run build && npm test`
Expected: build exit 0, suíte verde com 4 testes a mais.

- [ ] **Step 7: Verificar que token forjado é rejeitado**

Suba a API, faça login para obter um `session_id` real, e então chame uma rota autenticada com um token forjado:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:$PORT/api/admin/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UifQ.assinatura_invalida" \
  -H "session-id: <session-id-real>"
```
Expected: `401`.

- [ ] **Step 8: Commit**

```bash
git add src/shared/providers/jwt.provider.ts src/shared/providers/jwt.provider.spec.ts src/modules/reserve-auth/infrastructure/repositories/
git commit -m "fix(security): separar token forjado de token expirado na validação de JWT"
```

---

### Task 15: Documentar variáveis de ambiente e o resultado da fase

**Files:**
- Create: `.env.example`
- Modify: `README.md`
- Create: `docs/SECURITY-FASE1.md`

**Interfaces:**
- Produces: documentação das variáveis novas e do que mudou de comportamento, para quem for fazer deploy.

- [ ] **Step 1: Levantar todas as variáveis de ambiente usadas**

```bash
grep -rhno "process\.env\.[A-Z_][A-Z0-9_]*" src --include=*.ts | sed 's/.*process\.env\.//' | sort -u
```

- [ ] **Step 2: Criar o `.env.example`**

Com o resultado do Step 1, crie `.env.example` listando cada variável com um comentário de uma linha e **sem nenhum valor real**. Inclua obrigatoriamente:

```bash
# Porta HTTP da API
PORT=3002

# Ambiente: development | production
NODE_ENV=development

# Origens permitidas no CORS, separadas por vírgula, sem barra final
CORS_ORIGINS=http://localhost:3001

# Monta /api/docs em produção. Fora de produção o Swagger sempre sobe.
# Só ligue em produção se a documentação puder ser pública.
SWAGGER_ENABLED=false

# Chave privada usada como pepper no PBKDF2 das senhas.
# Trocar esta chave invalida TODAS as senhas existentes.
ENCRYPT_PRIVATE_KEY=

# Chave e algoritmo de assinatura dos JWTs de sessão
JWT_PRIVATE_KEY=
JWT_ALGORITHM=HS256
```

Mais todas as demais que o Step 1 revelou (banco, Stripe, AWS, SMTP...), cada uma com comentário e valor vazio.

- [ ] **Step 3: Confirmar que o `.env.example` não vaza segredo**

```bash
grep -nE "=[^ ]+" .env.example | grep -vE "=(3002|development|production|HS256|false|true|http://localhost:3001)$"
```
Expected: nenhuma linha. Qualquer resultado é um valor real que precisa ser esvaziado.

- [ ] **Step 4: Criar o `docs/SECURITY-FASE1.md`**

```markdown
# Fase 1 — Hardening de bootstrap e credenciais

Executado em 2026-07-26. Plano: `docs/superpowers/plans/2026-07-26-fase1-backend-hardening.md`.

## Mudanças de comportamento visíveis

| Mudança | Efeito |
|---|---|
| `ValidationPipe` com `whitelist: true` | campo de body/query sem decorator do class-validator é **removido** silenciosamente antes de chegar no handler |
| `ThrottlerGuard` global | 100 req/min por IP no default; 5 req/min nas rotas de autenticação |
| Lockout de conta | 5 senhas erradas → HTTP **423** por 15 min; cada ciclo de 5 dobra a janela, teto 24 h |
| Senha forte | criação e troca de senha exigem 10+ caracteres com maiúscula, minúscula, número e símbolo. **Login não mudou** — senhas curtas existentes continuam entrando |
| PBKDF2 v2 | 210.000 iterações. Hashes antigos (856) continuam validando e são re-hasheados no próximo login bem-sucedido |
| Swagger | `/api/docs` retorna 404 em produção, exceto com `SWAGGER_ENABLED=true` |
| JWT forjado | passa a responder `invalid` em vez de `expired` |
| Timeout de upload | 5 min só em POST/PUT/PATCH sob os prefixos de rota que hospedam upload |

## Variáveis de ambiente novas

- `SWAGGER_ENABLED` (opcional) — `true` monta o Swagger em produção. Default: não monta.

## Custo de login

O fluxo de login executa PBKDF2 sobre a senha **duas vezes** (`AdminService.authenticate` e `AdminSessionTokenRepository.create`). A 210.000 iterações isso soma cerca de 200 ms por login. Resolver a duplicação é decisão pendente — está registrado como dívida.

## Fora de escopo desta fase

- RBAC por permissão, deny-by-default, `@Public()` → Fase 2
- CORS dinâmico por domínio de tenant → Fase 3
- 2FA/TOTP → não planejado
- Verificação de senha contra base de vazamento → não planejado
```

- [ ] **Step 5: Referenciar no README**

Adicione uma seção ao `README.md`:

```markdown
## Segurança

A configuração de segurança do bootstrap e das credenciais está documentada em
[`docs/SECURITY-FASE1.md`](docs/SECURITY-FASE1.md), incluindo as mudanças de
comportamento (lockout de conta, política de senha, rate limit) e as variáveis
de ambiente necessárias. Copie `.env.example` para `.env` antes de subir.
```

- [ ] **Step 6: Verificar build e suíte uma última vez**

Run: `npm run build && npm test`
Expected: build exit 0, suíte 100% verde.

- [ ] **Step 7: Commit**

```bash
git add .env.example README.md docs/SECURITY-FASE1.md
git commit -m "docs: documentar variáveis de ambiente e mudanças da Fase 1 de segurança"
```

---

## Encerramento da fase

- [ ] **Rodar a suíte completa e conferir contra a linha de base**

Run: `npm test`
Expected: todos os testes da linha de base da Task 1 Step 3, mais 30 testes novos (4 swagger + 4 prisma filter + 6 hash + 7 lockout + 3 fluxo de lockout + 9 senha forte + 4 jwt = 37; ajuste a conta se você adicionou specs extras).

- [ ] **Conferir o diff completo da fase**

```bash
git log --oneline main..fase1-hardening
git diff main..fase1-hardening --stat
```

- [ ] **Decidir a integração**

Use a skill `superpowers:finishing-a-development-branch`. Antes de mesclar, confirme com o usuário os dois itens que exigem coordenação:
1. **Painel:** a mensagem de erro do formulário de criação/troca de senha precisa refletir a política nova (10+ caracteres, quatro classes), e a tela de login precisa tratar o HTTP 423 com o texto do `locked_until`.
2. **Deploy:** `SWAGGER_ENABLED` precisa estar definida no ambiente de produção antes do deploy, senão a documentação some para quem depende dela.
