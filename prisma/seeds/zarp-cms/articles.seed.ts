import 'dotenv/config';
import { PrismaClient, EArticleStatus } from '../../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface ArticleSeed {
  display_title: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  content: string;
  slug: string;
  status: EArticleStatus;
  display_order: number;
  blogName: string;
  authorFirstName: string;
  authorLastName: string;
}

export async function seedArticles() {
  const articles: ArticleSeed[] = [
    {
      display_title: 'Bem-vindo ao Blog Zarp Studio',
      meta_title: 'Bem-vindo ao Blog Zarp Studio | Tecnologia e Inovação',
      meta_description:
        'Descubra insights sobre desenvolvimento de software, arquitetura de sistemas e as últimas tendências em tecnologia.',
      focus_keyword: 'blog zarp studio',
      content: `# Bem-vindo ao Blog Zarp Studio

Estamos muito felizes em dar as boas-vindas a você no nosso blog oficial! Este é um espaço dedicado a compartilhar conhecimento, experiências e insights sobre o mundo da tecnologia.

## O que você encontrará aqui

Nosso blog é focado em trazer conteúdo de qualidade sobre:

- **Desenvolvimento de Software**: Boas práticas, padrões de design e arquitetura
- **Tecnologias Emergentes**: As últimas novidades do mundo tech
- **DevOps e Cloud**: Infraestrutura moderna e automação
- **Experiências Reais**: Cases e aprendizados dos nossos projetos

## Nossa Missão

Acreditamos que o conhecimento deve ser compartilhado. Nossa missão é criar uma comunidade de desenvolvedores que aprendem juntos e crescem profissionalmente.

## Fique Conectado

Publicamos novos artigos semanalmente. Não perca nenhuma atualização!

Até a próxima! 🚀`,
      slug: 'bem-vindo-blog-zarp-studio',
      status: EArticleStatus.published,
      display_order: 1,
      blogName: 'Blog Zarp Studio',
      authorFirstName: 'Diego',
      authorLastName: 'Kelme',
    },
    {
      display_title: 'Clean Architecture em NestJS: Guia Completo',
      meta_title: 'Clean Architecture em NestJS: Guia Completo',
      meta_description:
        'Aprenda a implementar Clean Architecture em aplicações NestJS com exemplos práticos e padrões de design.',
      focus_keyword: 'clean architecture nestjs',
      content: `# Clean Architecture em NestJS: Guia Completo

Clean Architecture é um padrão arquitetural que promove a separação de responsabilidades e a independência de frameworks.

## Princípios Fundamentais

### 1. Independência de Frameworks
Sua lógica de negócio não deve depender de frameworks específicos.

### 2. Testabilidade
Regras de negócio podem ser testadas sem UI, banco de dados ou serviços externos.

### 3. Independência de UI
A interface pode mudar sem afetar o resto do sistema.

## Estrutura de Camadas

\`\`\`
src/
├── domain/           # Entidades e regras de negócio
├── application/      # Casos de uso
├── infrastructure/   # Implementações concretas
└── presentation/     # Controllers e DTOs
\`\`\`

## Exemplo Prático

Vamos criar um caso de uso simples:

\`\`\`typescript
// domain/entities/user.entity.ts
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
  ) {}
}

// application/use-cases/create-user.use-case.ts
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(data: CreateUserDTO): Promise<User> {
    // Lógica de negócio aqui
    return this.userRepository.create(data);
  }
}
\`\`\`

## Benefícios

- Código mais testável e manutenível
- Facilita mudanças de tecnologia
- Separação clara de responsabilidades

## Conclusão

Clean Architecture pode parecer complexa no início, mas os benefícios a longo prazo compensam o investimento inicial.`,
      slug: 'clean-architecture-nestjs-guia-completo',
      status: EArticleStatus.published,
      display_order: 2,
      blogName: 'Blog Zarp Studio',
      authorFirstName: 'Diego',
      authorLastName: 'Kelme',
    },
    {
      display_title: 'React 19: Novidades e Recursos',
      meta_title: 'React 19: Novidades e Recursos | Guia Completo',
      meta_description:
        'Descubra as novidades do React 19, incluindo Server Components, Actions e melhorias de performance.',
      focus_keyword: 'react 19 novidades',
      content: `# React 19: Novidades e Recursos

O React 19 trouxe mudanças significativas que transformam a forma como desenvolvemos aplicações.

## Server Components

Server Components permitem renderizar componentes no servidor, reduzindo o JavaScript enviado ao cliente.

\`\`\`tsx
// app/page.tsx
async function BlogPosts() {
  const posts = await fetchPosts(); // Executa no servidor
  
  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
\`\`\`

## Actions

Actions simplificam o gerenciamento de formulários e mutações de dados.

\`\`\`tsx
'use server'

async function createPost(formData: FormData) {
  const title = formData.get('title');
  await db.posts.create({ title });
}
\`\`\`

## Melhorias de Performance

- Compilador automático
- Otimizações de re-renderização
- Melhor suporte a Suspense

## Migração

A migração do React 18 para 19 é relativamente simples, mas requer atenção a algumas breaking changes.

## Conclusão

React 19 representa um grande passo na evolução do framework, trazendo recursos que melhoram tanto a experiência do desenvolvedor quanto a performance das aplicações.`,
      slug: 'react-19-novidades-recursos',
      status: EArticleStatus.published,
      display_order: 3,
      blogName: 'Blog Zarp Studio',
      authorFirstName: 'Ana',
      authorLastName: 'Silva',
    },
    {
      display_title: 'TypeScript: Tipos Avançados que Você Precisa Conhecer',
      meta_title: 'TypeScript: Tipos Avançados | Guia Prático',
      meta_description:
        'Domine tipos avançados do TypeScript como Conditional Types, Mapped Types e Template Literal Types.',
      focus_keyword: 'typescript tipos avançados',
      content: `# TypeScript: Tipos Avançados que Você Precisa Conhecer

TypeScript oferece um sistema de tipos poderoso que vai muito além dos tipos básicos.

## Conditional Types

Tipos condicionais permitem criar tipos baseados em condições:

\`\`\`typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
\`\`\`

## Mapped Types

Transforme propriedades de um tipo:

\`\`\`typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type User = { name: string; age: number };
type ReadonlyUser = Readonly<User>;
\`\`\`

## Template Literal Types

Crie tipos baseados em strings:

\`\`\`typescript
type EventName = 'click' | 'focus' | 'blur';
type EventHandler = \`on\${Capitalize<EventName>}\`;
// 'onClick' | 'onFocus' | 'onBlur'
\`\`\`

## Utility Types

TypeScript inclui vários utility types úteis:

- \`Partial<T>\`: Torna todas as propriedades opcionais
- \`Required<T>\`: Torna todas as propriedades obrigatórias
- \`Pick<T, K>\`: Seleciona propriedades específicas
- \`Omit<T, K>\`: Remove propriedades específicas

## Conclusão

Dominar tipos avançados do TypeScript permite criar código mais seguro e expressivo.`,
      slug: 'typescript-tipos-avancados',
      status: EArticleStatus.published,
      display_order: 4,
      blogName: 'Blog Zarp Studio',
      authorFirstName: 'Ana',
      authorLastName: 'Silva',
    },
    {
      display_title: 'DevOps: CI/CD com GitHub Actions',
      meta_title: 'DevOps: CI/CD com GitHub Actions | Tutorial Completo',
      meta_description:
        'Aprenda a configurar pipelines de CI/CD usando GitHub Actions para automatizar deploy e testes.',
      focus_keyword: 'github actions ci cd',
      content: `# DevOps: CI/CD com GitHub Actions

GitHub Actions revolucionou a forma como fazemos CI/CD, oferecendo uma solução integrada e poderosa.

## O que é CI/CD?

- **CI (Continuous Integration)**: Integração contínua de código
- **CD (Continuous Deployment)**: Deploy automático para produção

## Configuração Básica

Crie um arquivo \`.github/workflows/deploy.yml\`:

\`\`\`yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        run: npm run deploy
\`\`\`

## Boas Práticas

1. **Testes Automatizados**: Sempre rode testes antes do deploy
2. **Ambientes Separados**: Use staging antes de produção
3. **Secrets Management**: Use GitHub Secrets para credenciais
4. **Rollback Strategy**: Tenha um plano de rollback

## Conclusão

GitHub Actions torna CI/CD acessível e fácil de implementar, melhorando significativamente a qualidade e velocidade de entrega.`,
      slug: 'devops-cicd-github-actions',
      status: EArticleStatus.published,
      display_order: 5,
      blogName: 'Tech Insights',
      authorFirstName: 'Carlos',
      authorLastName: 'Mendes',
    },
    {
      display_title: 'Artigo em Desenvolvimento',
      meta_title: 'Artigo em Desenvolvimento',
      meta_description: 'Este artigo ainda está sendo escrito.',
      focus_keyword: 'rascunho',
      content: `# Artigo em Desenvolvimento

Este artigo ainda está sendo escrito e será publicado em breve.

## Tópicos Planejados

- Introdução
- Conceitos principais
- Exemplos práticos
- Conclusão

Aguarde!`,
      slug: 'artigo-em-desenvolvimento',
      status: EArticleStatus.draft,
      display_order: 100,
      blogName: 'Blog Zarp Studio',
      authorFirstName: 'Beatriz',
      authorLastName: 'Costa',
    },
  ];

  let inseridos = 0;
  let atualizados = 0;

  console.log('\n[ARTICLES SEED]');

  for (const article of articles) {
    const blog = await prisma.blog.findFirst({
      where: { name: article.blogName },
    });

    if (!blog) {
      console.log(`  ⚠ SKIP: Blog "${article.blogName}" não encontrado para artigo "${article.display_title}"`);
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
        `  ⚠ SKIP: Autor "${article.authorFirstName} ${article.authorLastName}" não encontrado para artigo "${article.display_title}"`,
      );
      continue;
    }

    // Get first active admin as creator
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
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      focus_keyword: article.focus_keyword,
      content: article.content,
      slug: article.slug,
      status: article.status,
      display_order: article.display_order,
      blog_id: blog.id,
      author_id: author.id,
      created_by: firstAdmin?.id,
      last_edited_by: firstAdmin?.id,
      published_at: article.status === EArticleStatus.published ? new Date() : null,
    };

    if (existing) {
      await prisma.article.update({
        where: { id: existing.id },
        data,
      });
      atualizados++;
      console.log(`  ↻ Artigo atualizado: ${article.display_title}`);
    } else {
      await prisma.article.create({ data });
      inseridos++;
      console.log(`  ✓ Artigo criado: ${article.display_title}`);
    }
  }

  console.log(`\n  Resumo: ${inseridos} criados, ${atualizados} atualizados\n`);

  await prisma.$disconnect();
}
